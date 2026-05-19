import { NextResponse } from "next/server";
import { isApiAuthError, requireAuthenticatedUser } from "@/lib/api-security";
import {
  listUserProgramState,
  normalizeProgramStateKind,
  updateUserProgramState,
} from "@/lib/user-program-state-db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  try {
    return NextResponse.json({
      data: await listUserProgramState(auth.user.id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load program state.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const programId =
      typeof body.programId === "string" || typeof body.programId === "number"
        ? String(body.programId)
        : "";
    if (!programId) throw new Error("Program id is required.");

    const data = await updateUserProgramState(
      auth.user.id,
      programId,
      normalizeProgramStateKind(body.kind),
      Boolean(body.enabled),
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update program state.",
      },
      { status: 400 },
    );
  }
}
