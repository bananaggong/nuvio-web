import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import {
  listHostProgramDraftsFromDb,
  normalizeHostProgramDraft,
  upsertHostProgramDraft,
} from "@/lib/host-program-db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const drafts = await listHostProgramDraftsFromDb();
    return NextResponse.json({ data: drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load host programs.",
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
    const draft = normalizeHostProgramDraft(body);
    const savedDraft = await upsertHostProgramDraft(draft);

    void safeCreateAuditLog({
      action: "program.upsert",
      actorId: auth.user.id,
      entityId: savedDraft.id,
      entityType: "program",
      metadata: {
        published: savedDraft.published,
        status: savedDraft.status,
        title: savedDraft.title,
      },
    });

    return NextResponse.json({ data: savedDraft }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save host program.",
      },
      { status: 400 },
    );
  }
}
