import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
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

  const limited = applyRateLimit(request, {
    key: "host-review-requests:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get("status")?.trim();
    const status = reviewRequestStatuses.includes(requestedStatus as ReviewRequestStatus)
      ? (requestedStatus as ReviewRequestStatus)
      : undefined;
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

  const limited = applyRateLimit(request, {
    key: "host-review-requests:create",
    limit: 40,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
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

    const applicationIds = Array.isArray((body as { applicationIds?: unknown }).applicationIds)
      ? (body as { applicationIds: unknown[] }).applicationIds
      : undefined;

    if (applicationIds) {
      const data = await Promise.all(
        applicationIds.slice(0, 50).map((applicationId) =>
          requestHostReviewForApplication(
            { applicationId, force: (body as { force?: unknown }).force === true },
            accessOptions,
          ),
        ),
      );
      return NextResponse.json({ data }, { status: 201 });
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