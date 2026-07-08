import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAuthenticatedUser,
  requireHostRole,
} from "@/lib/api-security";
import {
  canManageHostVillage,
  ensureOwnerMembershipForVillage,
  listHostVillageWorkspaces,
} from "@/lib/host-village-access";
import { updateUserProfile } from "@/lib/auth-profile-db";
import {
  getHostVillageBySlug,
  listHostVillagesFromDb,
  normalizeHostVillage,
  upsertHostVillage,
} from "@/lib/village-db";

export const runtime = "nodejs";

const MAX_VILLAGE_PAYLOAD_BYTES = 128 * 1024;

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-villages:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const villages = await listHostVillagesFromDb();
    if (auth.profile.role === "admin") return NextResponse.json({ data: villages });

    const workspaces = await listHostVillageWorkspaces(auth);
    const allowedSlugs = new Set(workspaces.map((workspace) => workspace.slug));

    return NextResponse.json({
      data: villages.filter((village) => allowedSlugs.has(village.slug)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load channels.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const contentLengthError = enforceContentLength(request, MAX_VILLAGE_PAYLOAD_BYTES);
    if (contentLengthError) return contentLengthError;

    const rateLimitError = applyRateLimit(request, {
      key: "host-villages-post",
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => ({}));
    const village = normalizeHostVillage(body);
    const existingVillage = await getHostVillageBySlug(village.slug);
    const isCreatingVillage = !existingVillage;

    if (auth.profile.role !== "admin") {
      const workspaces = await listHostVillageWorkspaces(auth);
      const canUpdateExistingVillage = existingVillage
        ? await canManageHostVillage(auth, village.slug)
        : false;
      const canCreateFirstVillage = isCreatingVillage && workspaces.length === 0;

      if (isCreatingVillage && workspaces.length > 0) {
        return apiError("채널은 계정당 하나만 만들 수 있습니다.", 409);
      }

      if (isCreatingVillage && !canCreateFirstVillage) {
        return apiError("Host access is required.", 403);
      }

      if (existingVillage && !canUpdateExistingVillage) {
        return apiError("You do not have permission to manage this channel.", 403);
      }
    }

    const savedVillage = await upsertHostVillage(village);
    if (isCreatingVillage) {
      await ensureOwnerMembershipForVillage(savedVillage.id, auth, {
        required: true,
      });
      await updateUserProfile(auth.user.id, { showHostCenterNav: true });
    }

    return NextResponse.json({ data: savedVillage }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save channel.",
      },
      { status: 400 },
    );
  }
}
