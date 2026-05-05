import { NextResponse } from "next/server";
import { createProgramApplication } from "@/lib/host-application-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const application = await createProgramApplication({
      programId: normalizeProgramId(body.programId),
      formId: typeof body.formId === "string" ? body.formId : undefined,
      applicantName: String(body.applicantName ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      answers: normalizeAnswers(body.answers),
      memo: typeof body.memo === "string" ? body.memo : undefined,
    });

    return NextResponse.json({ data: application }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create program application.",
      },
      { status: 400 },
    );
  }
}

function normalizeProgramId(value: unknown): number | string {
  if (typeof value === "number") return value;
  const text = String(value ?? "").trim();
  const numericValue = Number(text);
  return Number.isInteger(numericValue) ? numericValue : text;
}

function normalizeAnswers(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
