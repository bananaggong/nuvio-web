import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { canManageHostVillage } from "@/lib/host-village-access";
import {
  deleteHostVillageMediaDraft,
  listHostVillageMediaFromDb,
  normalizeHostVillageMediaDraft,
  upsertHostVillageMediaDraft,
  VillageMediaAccessError,
} from "@/lib/village-media-db";

export const runtime = "nodejs";

const MAX_MEDIA_PAYLOAD_BYTES = 128 * 1024;

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-media:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const villageSlug = searchParams.get("villageSlug") ?? "boseong";
    if (!(await canManageHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this channel.", 403);
    }

    const drafts = await listHostVillageMediaFromDb(villageSlug);

    return NextResponse.json({ data: drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load host media.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const contentLengthError = enforceContentLength(request, MAX_MEDIA_PAYLOAD_BYTES);
    if (contentLengthError) return contentLengthError;

    const rateLimitError = applyRateLimit(request, {
      key: "host-media-post",
      limit: 60,
      windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => ({}));
    const draft = normalizeHostVillageMediaDraft(body);
    if (!(await canManageHostVillage(auth, draft.villageSlug))) {
      return apiError("You do not have permission to manage this channel.", 403);
    }

    const savedDraft = await upsertHostVillageMediaDraft(draft, {
      allowedVillageSlug: draft.villageSlug,
    });

    return NextResponse.json({ data: savedDraft }, { status: 201 });
  } catch (error) {
    if (error instanceof VillageMediaAccessError) {
      return apiError(error.message, 403);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save host media.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const rateLimitError = applyRateLimit(request, {
      key: "host-media-delete",
      limit: 60,
      windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const villageSlug =
      typeof body.villageSlug === "string" ? body.villageSlug.trim() : "";

    if (!id || !villageSlug) {
      return apiError("Media id and channel slug are required.", 400);
    }

    if (!(await canManageHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this channel.", 403);
    }

    const deleted = await deleteHostVillageMediaDraft(id, {
      allowedVillageSlug: villageSlug,
    });

    return NextResponse.json({ data: { deleted } });
  } catch (error) {
    if (error instanceof VillageMediaAccessError) {
      return apiError(error.message, 403);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete host media.",
      },
      { status: 400 },
    );
  }
}
