import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
} from "@/lib/api-security";
import { createProgramApplication } from "@/lib/host-application-db";
import { queueApplicationSubmittedNotification } from "@/lib/notification-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payloadTooLarge = enforceContentLength(request, 64 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "program-application:create",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const answers = normalizeAnswers(body.answers);
    validateApplicationPayload(body, answers);

    const application = await createProgramApplication({
      programId: normalizeProgramId(body.programId),
      formId: typeof body.formId === "string" ? body.formId : undefined,
      applicantName: normalizeText(body.applicantName, 80),
      email: normalizeText(body.email, 120).toLowerCase(),
      phone: normalizeText(body.phone, 40),
      answers,
      memo: typeof body.memo === "string" ? normalizeText(body.memo, 120) : undefined,
    });

    void queueApplicationSubmittedNotification({
      applicantName: application.applicantName,
      applicationId: application.id,
      email: application.email,
      programTitle: application.programTitle,
    }).catch(() => undefined);

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

function validateApplicationPayload(
  body: Record<string, unknown>,
  answers: Record<string, unknown>,
) {
  const programId = String(body.programId ?? "").trim();
  if (!programId) throw new Error("Program id is required.");

  const applicantName = normalizeText(body.applicantName, 80);
  if (applicantName.length < 2) throw new Error("Applicant name is required.");

  const email = normalizeText(body.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new Error("A valid email is required.");
  }

  const serializedAnswers = JSON.stringify(answers);
  if (serializedAnswers.length > 20_000) {
    throw new Error("Application answers are too large.");
  }
}

function normalizeText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}
