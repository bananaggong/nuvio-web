import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
import {
  listApplicationFormTemplatesFromDb,
  normalizeApplicationFormTemplate,
  upsertApplicationFormTemplate,
} from "@/lib/application-form-db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const templates = await listApplicationFormTemplatesFromDb();
    return NextResponse.json({ data: templates });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load application forms.",
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
    const template = normalizeApplicationFormTemplate(body);
    const savedTemplate = await upsertApplicationFormTemplate(template);

    return NextResponse.json({ data: savedTemplate }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save application form.",
      },
      { status: 400 },
    );
  }
}
