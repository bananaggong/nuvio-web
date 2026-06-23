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
import {
  HostReviewAccessError,
  listHostReviewDraftsFromDb,
  normalizeHostReviewDraft,
  upsertHostReviewDraft,
} from "@/lib/review-db";

export const runtime = "nodejs";

const MAX_REVIEW_PAYLOAD_BYTES = 128 * 1024;

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
    const options =
      auth.profile.role === "admin"
        ? {}
        : {
            villageSlugs: (await listManageableHostVillageWorkspaces(auth)).map(
              (workspace) => workspace.slug,
            ),
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
