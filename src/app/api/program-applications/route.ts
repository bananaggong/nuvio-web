import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  applyPersistentRateLimit,
  asJsonRecord,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { getConfirmedAuthEmail } from "@/lib/auth-email";
import {
  createProgramApplication,
  DuplicateProgramApplicationError,
  findExistingProgramApplication,
  ProgramNotAcceptingApplicationsError,
} from "@/lib/host-application-db";
import { queueApplicationSubmittedNotification } from "@/lib/notification-db";
import { sanitizeJsonRecord } from "@/lib/safe-json";
import { updateUserProgramState } from "@/lib/user-program-state-db";

export const runtime = "nodejs";

const MAX_APPLICATION_PAYLOAD_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const limited = await applyPersistentRateLimit(request, {
    identity: auth.user.id,
    key: "program-application:create",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { body: rawBody, response } = await readJsonWithLimit(
      request,
      MAX_APPLICATION_PAYLOAD_BYTES,
    );
    if (response) return response;

    const body = asJsonRecord(rawBody);
    const answers = normalizeAnswers(body.answers);
    validateApplicationPayload(body, answers);

    const confirmedEmail = getConfirmedAuthEmail(auth.user);
    const submittedEmail = normalizeText(body.email, 120).toLowerCase();
    if (!confirmedEmail || confirmedEmail !== submittedEmail) {
      return NextResponse.json(
        { error: "Use the confirmed email address on your signed-in account." },
        { status: 403 },
      );
    }

    const programId = normalizeProgramId(body.programId);
    const existingApplication = await findExistingProgramApplication({
      emails: [confirmedEmail],
      programId,
    });
    if (existingApplication) return acceptedApplicationResponse();

    const application = await createProgramApplication({
      answers,
      applicantName: normalizeText(body.applicantName, 80),
      email: confirmedEmail,
      formId: typeof body.formId === "string" ? body.formId : undefined,
      memo:
        typeof body.memo === "string"
          ? normalizeText(body.memo, 120)
          : undefined,
      phone: normalizeText(body.phone, 40),
      programId,
      programRunId:
        typeof body.programRunId === "string" ? body.programRunId : undefined,
      submittedBy: auth.user.id,
    });

    void updateUserProgramState(
      auth.user.id,
      String(programId),
      "trackingEnabled",
      true,
    ).catch(() => undefined);

    void queueApplicationSubmittedNotification({
      applicantName: application.applicantName,
      applicationId: application.id,
      email: application.email,
      programCreatedBy: application.programCreatedBy,
      programId: application.programId,
      programTitle: application.programTitle,
      villageId: application.villageId,
    }).catch(() => undefined);

    return acceptedApplicationResponse();
  } catch (error) {
    if (error instanceof DuplicateProgramApplicationError) {
      return acceptedApplicationResponse();
    }

    if (error instanceof ProgramNotAcceptingApplicationsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
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

function acceptedApplicationResponse() {
  return NextResponse.json(
    {
      data: {
        id: randomUUID(),
        submittedAt: new Date().toISOString(),
      },
    },
    { status: 202 },
  );
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

  if (JSON.stringify(answers).length > 20_000) {
    throw new Error("Application answers are too large.");
  }

  const legalConsent = answers.legalConsent;
  if (!legalConsent || typeof legalConsent !== "object" || Array.isArray(legalConsent)) {
    throw new Error("Required consent is missing.");
  }

  const consent = legalConsent as Record<string, unknown>;
  if (
    !isRequiredLegalConsentAgreed(consent, "terms") ||
    !isRequiredLegalConsentAgreed(consent, "privacyCollection") ||
    !isRequiredLegalConsentAgreed(consent, "thirdParty")
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
  if (!Array.isArray(consent.documents)) return false;

  return consent.documents.some((document) => {
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
