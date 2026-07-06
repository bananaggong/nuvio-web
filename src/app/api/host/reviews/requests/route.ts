import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  asJsonRecord,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireHostRole,
} from "@/lib/api-security";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  listHostReviewRequestsFromDb,
  requestHostReviewForApplication,
  ReviewRequestAccessError,
  ReviewRequestCooldownError,
  ReviewRequestEligibilityError,
  type ReviewRequestStatus,
} from "@/lib/review-request-db";

export const runtime = "nodejs";

const reviewRequestStatuses: ReviewRequestStatus[] = [
  "pending",
  "sent",
  "opened",
  "completed",
  "cancelled",
  "expired",
];

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = await applyPersistentRateLimit(request, {
    key: "host-review-requests:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
    identity: auth.user.id,
  });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get("status")?.trim();
    if (
      requestedStatus &&
      !reviewRequestStatuses.includes(requestedStatus as ReviewRequestStatus)
    ) {
      return apiError("A valid review request status is required.", 400);
    }
    const status = requestedStatus as ReviewRequestStatus | undefined;
    const limit = Number(url.searchParams.get("limit") ?? "200");
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const data = await listHostReviewRequestsFromDb(
      auth.profile.role === "admin"
        ? { limit, status }
        : {
            allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
            allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
            limit,
            status,
          },
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load review requests.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const contentLengthError = enforceContentLength(request, 32 * 1024);
  if (contentLengthError) return contentLengthError;

  const limited = await applyPersistentRateLimit(request, {
    key: "host-review-requests:create",
    limit: 40,
    windowMs: 15 * 60 * 1000,
    identity: auth.user.id,
  });
  if (limited) return limited;

  try {
    const parsedBody = await readJsonWithLimit(request, 32 * 1024);
    if (parsedBody.response) return parsedBody.response;
    const body = asJsonRecord(parsedBody.body);
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const accessOptions =
      auth.profile.role === "admin"
        ? { actorId: auth.user.id, actorRole: auth.profile.role }
        : {
            actorId: auth.user.id,
            actorRole: auth.profile.role,
            allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
            allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
          };

    const applicationIds = normalizeApplicationIdBatch(body.applicationIds);

    if (applicationIds) {
      const force = (body as { force?: unknown }).force === true;
      const data: Awaited<ReturnType<typeof requestHostReviewForApplication>>[] = [];
      const errors: ReviewRequestBatchError[] = [];

      for (const applicationId of applicationIds) {
        try {
          data.push(
            await requestHostReviewForApplication(
              { applicationId, force },
              accessOptions,
            ),
          );
        } catch (error) {
          errors.push(mapBatchReviewRequestError(applicationId, error));
        }
      }

      const summary = {
        failed: errors.length,
        requested: data.length,
        total: data.length + errors.length,
      };
      const status = errors.length === 0
        ? 201
        : data.length === 0
          ? getBatchFailureStatus(errors)
          : 207;

      return NextResponse.json({ data, errors, summary }, { status });
    }

    const data = await requestHostReviewForApplication(body, accessOptions);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewRequestAccessError) return apiError(error.message, 403);
    if (error instanceof ReviewRequestCooldownError) return apiError(error.message, 409);
    if (error instanceof ReviewRequestEligibilityError) return apiError(error.message, 400);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create review request.",
      },
      { status: 400 },
    );
  }
}

function normalizeApplicationIdBatch(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new ReviewRequestEligibilityError("applicationIds must be an array.");
  }
  if (value.length === 0) {
    throw new ReviewRequestEligibilityError("At least one application id is required.");
  }
  if (value.length > 50) {
    throw new ReviewRequestEligibilityError(
      "Review request batch can include up to 50 applications.",
    );
  }

  const applicationIds = value.map((item) =>
    typeof item === "string" ? item.trim() : "",
  );
  if (applicationIds.some((applicationId) => !applicationId)) {
    throw new ReviewRequestEligibilityError("A valid application id is required.");
  }

  if (new Set(applicationIds).size !== applicationIds.length) {
    throw new ReviewRequestEligibilityError("Duplicate application ids are not allowed.");
  }

  return applicationIds;
}

type ReviewRequestBatchError = {
  applicationId: string;
  code: "access_denied" | "cooldown" | "ineligible" | "unknown";
  error: string;
};

function mapBatchReviewRequestError(
  applicationId: unknown,
  error: unknown,
): ReviewRequestBatchError {
  return {
    applicationId:
      typeof applicationId === "string" ? applicationId : String(applicationId ?? ""),
    code: getBatchErrorCode(error),
    error: error instanceof Error ? error.message : "Failed to create review request.",
  };
}

function getBatchErrorCode(error: unknown): ReviewRequestBatchError["code"] {
  if (error instanceof ReviewRequestAccessError) return "access_denied";
  if (error instanceof ReviewRequestCooldownError) return "cooldown";
  if (error instanceof ReviewRequestEligibilityError) return "ineligible";
  return "unknown";
}

function getBatchFailureStatus(errors: ReviewRequestBatchError[]): number {
  if (errors.some((error) => error.code === "access_denied")) return 403;
  if (errors.some((error) => error.code === "cooldown")) return 409;
  return 400;
}
