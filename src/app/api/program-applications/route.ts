import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  getOptionalAuthenticatedUser,
} from "@/lib/api-security";
import {
  createProgramApplication,
  DuplicateProgramApplicationError,
  findExistingProgramApplication,
} from "@/lib/host-application-db";
import { queueApplicationSubmittedNotification } from "@/lib/notification-db";
import { sanitizeJsonRecord } from "@/lib/safe-json";
import { updateUserProgramState } from "@/lib/user-program-state-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payloadTooLarge = enforceContentLength(request, 64 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "program-application:create",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const answers = normalizeAnswers(body.answers);
    validateApplicationPayload(body, answers);
    const auth = await getOptionalAuthenticatedUser();
    const programId = normalizeProgramId(body.programId);
    const email = normalizeText(body.email, 120).toLowerCase();
    const duplicateEmails = normalizeEmailList([
      email,
      auth?.profile.email,
      auth?.profile.contactEmail ?? undefined,
      auth?.user.email,
    ]);
    const existingApplication = await findExistingProgramApplication({
      emails: duplicateEmails,
      programId,
    });

    if (existingApplication) {
      return NextResponse.json(
        {
          data: existingApplication,
          error: "이미 신청한 프로그램입니다. 마이페이지에서 신청 내역을 확인해 주세요.",
        },
        { status: 409 },
      );
    }

    const application = await createProgramApplication({
      programId,
      programRunId:
        typeof body.programRunId === "string" ? body.programRunId : undefined,
      formId: typeof body.formId === "string" ? body.formId : undefined,
      applicantName: normalizeText(body.applicantName, 80),
      email,
      phone: normalizeText(body.phone, 40),
      answers,
      memo: typeof body.memo === "string" ? normalizeText(body.memo, 120) : undefined,
      submittedBy: auth?.user.id,
    });

    if (auth) {
      void updateUserProgramState(
        auth.user.id,
        String(programId),
        "trackingEnabled",
        true,
      ).catch(() => undefined);
    }

    void queueApplicationSubmittedNotification({
      applicantName: application.applicantName,
      applicationId: application.id,
      email: application.email,
      programCreatedBy: application.programCreatedBy,
      programTitle: application.programTitle,
      villageId: application.villageId,
    }).catch(() => undefined);

    return NextResponse.json({ data: application }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateProgramApplicationError) {
      return NextResponse.json(
        {
          error:
            "This program already has an application for the submitted email.",
        },
        { status: 409 },
      );
    }

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
  return sanitizeJsonRecord(value, {
    maxArrayLength: 100,
    maxDepth: 8,
    maxObjectKeys: 140,
    maxStringLength: 3000,
  });
}

function normalizeEmailList(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeText(value, 120).toLowerCase())
        .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)),
    ),
  );
}

function validateApplicationPayload(
  body: Record<string, unknown>,
  answers: Record<string, unknown>,
) {
  const programId = String(body.programId ?? "").trim();
  if (!programId) throw new Error("Program id is required.");
  if (programId.length > 160) throw new Error("Program id is too long.");

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

  const legalConsent = answers.legalConsent;
  if (
    !legalConsent ||
    typeof legalConsent !== "object" ||
    Array.isArray(legalConsent)
  ) {
    throw new Error("Required consent is missing.");
  }

  const consentRecord = legalConsent as Record<string, unknown>;
  if (
    !isRequiredLegalConsentAgreed(consentRecord, "terms") ||
    !isRequiredLegalConsentAgreed(consentRecord, "privacyCollection") ||
    !isRequiredLegalConsentAgreed(consentRecord, "thirdParty")
  ) {
    throw new Error("Required consent is missing.");
  }
}

function isRequiredLegalConsentAgreed(
  consent: Record<string, unknown>,
  key: "privacyCollection" | "terms" | "thirdParty",
): boolean {
  const directKey = {
    privacyCollection: "privacyCollectionAgreed",
    terms: "termsAgreed",
    thirdParty: "thirdPartyAgreed",
  }[key];

  if (consent[directKey] === true) return true;

  const documents = consent.documents;
  if (!Array.isArray(documents)) return false;

  return documents.some((document) => {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return false;
    }

    const record = document as Record<string, unknown>;
    return record.key === key && record.agreed === true;
  });
}

function normalizeText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}
