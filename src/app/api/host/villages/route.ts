import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireAuthenticatedUser,
  requireHostRole,
} from "@/lib/api-security";
import { getConfirmedAuthEmail } from "@/lib/auth-email";
import {
  canManageHostVillage,
  listHostVillageWorkspaces,
} from "@/lib/host-village-access";
import {
  createHostVillageWithOwner,
  getHostVillageBySlug,
  HostVillageMutationError,
  listHostVillagesFromDb,
  normalizeHostVillage,
  updateHostVillage,
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
    if (auth.profile.role === "admin") {
      const workspaces = await listHostVillageWorkspaces(auth);
      const ownAccountEmail = auth.profile.email.trim().toLowerCase();
      const ownChannelSlugs = new Set(
        workspaces
          .filter(
            (workspace) =>
              workspace.status === "active" &&
              workspace.accountEmail.trim().toLowerCase() === ownAccountEmail,
          )
          .map((workspace) => workspace.slug.trim().toLowerCase())
          .filter(Boolean),
      );

      return NextResponse.json({
        data: prioritizeHostVillages(villages, ownChannelSlugs),
      });
    }

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

function prioritizeHostVillages<T extends { slug: string }>(
  villages: T[],
  preferredSlugs: Set<string>,
): T[] {
  if (preferredSlugs.size === 0) return villages;

  return [...villages].sort((a, b) => {
    const aPreferred = preferredSlugs.has(a.slug.trim().toLowerCase());
    const bPreferred = preferredSlugs.has(b.slug.trim().toLowerCase());

    if (aPreferred === bPreferred) return 0;
    return aPreferred ? -1 : 1;
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const rateLimitError = await applyPersistentRateLimit(request, {
      identity: auth.user.id,
      key: "host-villages-post",
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const { body, response } = await readJsonWithLimit(
      request,
      MAX_VILLAGE_PAYLOAD_BYTES,
    );
    if (response) return response;

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

    const savedVillage = existingVillage
      ? await updateHostVillage(existingVillage.id, village)
      : await createHostVillageWithOwner(village, {
          accountEmail: getConfirmedAuthEmail(auth.user),
          isAdmin: auth.profile.role === "admin",
          userId: auth.user.id,
        });

    return NextResponse.json(
      { data: savedVillage },
      { status: isCreatingVillage ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof HostVillageMutationError) {
      const status = error.code === "not_found" ? 404 : 409;
      return apiError(error.message, status);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save channel.",
      },
      { status: 400 },
    );
  }
}
