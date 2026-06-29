import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import {
  canManageHostVillage,
  listManageableHostVillageWorkspaces,
} from "@/lib/host-village-access";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import type { ReviewSource, ReviewStatus } from "@/lib/types";
import {
  HostReviewAccessError,
  listHostReviewDraftsFromDb,
  normalizeHostReviewDraft,
  updateHostReviewStatus,
  upsertHostReviewDraft,
} from "@/lib/review-db";

export const runtime = "nodejs";

const MAX_REVIEW_PAYLOAD_BYTES = 128 * 1024;
const hostReviewStatuses: ReviewStatus[] = ["draft", "pending", "published", "hidden"];
const hostReviewSources: ReviewSource[] = ["participant", "host", "admin", "imported"];

export async function GET(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-reviews:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get("status")?.trim();
    const requestedSource = url.searchParams.get("source")?.trim();
    const status = hostReviewStatuses.includes(requestedStatus as ReviewStatus)
      ? (requestedStatus as ReviewStatus)
      : undefined;
    const source = hostReviewSources.includes(requestedSource as ReviewSource)
      ? (requestedSource as ReviewSource)
      : undefined;
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const options =
      auth.profile.role === "admin"
        ? { source, status }
        : {
            source,
            status,
            villageIds: workspaces.map((workspace) => workspace.villageId),
            villageSlugs: workspaces.map((workspace) => workspace.slug),
          };
    const drafts = await listHostReviewDraftsFromDb(options);
    return NextResponse.json({ data: drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load host reviews.",
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

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const contentLengthError = enforceContentLength(request, MAX_REVIEW_PAYLOAD_BYTES);
    if (contentLengthError) return contentLengthError;

    const rateLimitError = applyRateLimit(request, {
      key: "host-reviews-post",
      limit: 60,
      windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => ({}));
    let draft = normalizeHostReviewDraft(body);
    let allowedVillageIds: string[] | undefined;
    let allowedVillageSlugs: string[] | undefined;

    if (auth.profile.role !== "admin") {
      const workspaces = await listManageableHostVillageWorkspaces(auth);
      allowedVillageIds = workspaces.map((workspace) => workspace.villageId);
      allowedVillageSlugs = workspaces.map((workspace) => workspace.slug);
      const villageSlug =
        draft.villageSlug || (workspaces.length === 1 ? workspaces[0].slug : "");

      if (!villageSlug || !(await canManageHostVillage(auth, villageSlug))) {
        return apiError("You do not have permission to manage this channel.", 403);
      }

      draft = { ...draft, villageSlug };
    } else if (
      draft.villageSlug &&
      !(await canManageHostVillage(auth, draft.villageSlug))
    ) {
      return apiError("You do not have permission to manage this channel.", 403);
    }

    const savedDraft = await upsertHostReviewDraft(draft, {
      allowedVillageIds,
      allowedVillageSlugs,
      actorId: auth.user.id,
    });

    return NextResponse.json({ data: savedDraft }, { status: 201 });
  } catch (error) {
    if (error instanceof HostReviewAccessError) {
      return apiError(error.message, 403);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save host review.",
      },
      { status: 400 },
    );
  }
}
export async function PATCH(request: Request) {
  if (!launchFeatureFlags.reviews) {
    return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const contentLengthError = enforceContentLength(request, MAX_REVIEW_PAYLOAD_BYTES);
    if (contentLengthError) return contentLengthError;

    const rateLimitError = applyRateLimit(request, {
      key: "host-reviews-patch",
      limit: 120,
      windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => ({}));
    let allowedVillageIds: string[] | undefined;
    let allowedVillageSlugs: string[] | undefined;

    if (auth.profile.role !== "admin") {
      const workspaces = await listManageableHostVillageWorkspaces(auth);
      allowedVillageIds = workspaces.map((workspace) => workspace.villageId);
      allowedVillageSlugs = workspaces.map((workspace) => workspace.slug);
    }

    const savedDraft = await updateHostReviewStatus(
      {
        hiddenReason:
          typeof body.hiddenReason === "string" ? body.hiddenReason : undefined,
        id: typeof body.id === "string" ? body.id : "",
        moderationNote:
          typeof body.moderationNote === "string" ? body.moderationNote : undefined,
        status: typeof body.status === "string" ? body.status : "pending",
      },
      {
        allowedVillageIds,
        allowedVillageSlugs,
        actorId: auth.user.id,
      },
    );

    return NextResponse.json({ data: savedDraft });
  } catch (error) {
    if (error instanceof HostReviewAccessError) {
      return apiError(error.message, 403);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update review.",
      },
      { status: 400 },
    );
  }
}