import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
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
    return NextResponse.json({ data: villages });
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
    const savedVillage = await upsertHostVillage(village);

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
