import { NextResponse } from "next/server";
import { apiError, isApiAuthError, requireHostRole } from "@/lib/api-security";
import {
  canManageHostVillage,
  ensureOwnerMembershipForVillage,
  listHostVillageWorkspaces,
} from "@/lib/host-village-access";
import {
  listHostVillagesFromDb,
  normalizeHostVillage,
  upsertHostVillage,
} from "@/lib/village-db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

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
          error instanceof Error ? error.message : "Failed to load villages.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const body = await request.json();
    const village = normalizeHostVillage(body);
    const existingVillages = await listHostVillagesFromDb();
    const existingVillage = existingVillages.find(
      (item) => item.slug === village.slug,
    );

    if (auth.profile.role !== "admin") {
      const workspaces = await listHostVillageWorkspaces(auth);
      const canUpdateExistingVillage = existingVillage
        ? await canManageHostVillage(auth, village.slug)
        : false;

      if (!existingVillage && workspaces.length > 0) {
        return apiError("로컬홈은 계정당 하나만 만들 수 있습니다.", 409);
      }

      if (existingVillage && !canUpdateExistingVillage) {
        return apiError("You do not have permission to manage this village.", 403);
      }
    }

    const savedVillage = await upsertHostVillage(village);
    await ensureOwnerMembershipForVillage(savedVillage.id, auth);

    return NextResponse.json({ data: savedVillage }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save village.",
      },
      { status: 400 },
    );
  }
}
