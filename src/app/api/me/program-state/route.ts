import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import {
  listUserProgramState,
  normalizeProgramStateKind,
  updateUserProgramState,
} from "@/lib/user-program-state-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "me-program-state:list",
    limit: 180,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

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

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "me-program-state:update",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { body: rawBody, response } = await readJsonWithLimit(request, 4 * 1024);
    if (response) return response;
    const body = rawBody as Record<string, unknown>;
    const programId =
      typeof body.programId === "string" || typeof body.programId === "number"
        ? String(body.programId).trim()
        : "";
    if (!programId) throw new Error("Program id is required.");
    if (programId.length > 160) throw new Error("Program id is too long.");
    if (typeof body.enabled !== "boolean") {
      throw new Error("Enabled must be a boolean.");
    }

    const data = await updateUserProgramState(
      auth.user.id,
      programId,
      normalizeProgramStateKind(body.kind),
      body.enabled,
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
