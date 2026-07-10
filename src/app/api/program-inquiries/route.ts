import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  enforceSameOrigin,
  getOptionalAuthenticatedUser,
  readJsonWithLimit,
} from "@/lib/api-security";
import { createProgramInquiry } from "@/lib/host-inquiry-db";
import { normalizeHostInquiry } from "@/lib/host-inquiries";
import { queueProgramInquiryCreatedNotification } from "@/lib/notification-db";
import { getProgramRecordByIdentifier } from "@/lib/program-db";
import { getPublicProgramByIdentifier } from "@/lib/public-program-db";
import { sanitizeJsonRecord } from "@/lib/safe-json";

export const runtime = "nodejs";

const MAX_INQUIRY_PAYLOAD_BYTES = 24 * 1024;
const MAX_INQUIRY_MESSAGE_LENGTH = 2000;

export async function POST(request: Request) {
  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = await applyPersistentRateLimit(request, {
    key: "program-inquiry:create",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { body, response } = await readJsonWithLimit(
      request,
      MAX_INQUIRY_PAYLOAD_BYTES,
    );
    if (response) return response;

    const inquiry = normalizeHostInquiry(body);
    const validationError = validateProgramInquiry(inquiry);
    if (validationError) return apiError(validationError, 400);

    const auth = await getOptionalAuthenticatedUser();

    if (!inquiry.programId) {
      return NextResponse.json(
        { error: "Program id is required." },
        { status: 400 },
      );
    }

    const programRecord = await getProgramRecordByIdentifier(inquiry.programId);
    if (
      programRecord &&
      (!programRecord.publishedAt ||
        programRecord.status === "closed" ||
        programRecord.status === "earlyClosed")
    ) {
      return NextResponse.json(
        { error: "Program was not found." },
        { status: 404 },
      );
    }
    const publicProgram = programRecord
      ? null
      : await getPublicProgramByIdentifier(inquiry.programId);
    if (!programRecord && !publicProgram) {
      return NextResponse.json(
        { error: "Program was not found." },
        { status: 404 },
      );
    }

    const savedInquiry = await createProgramInquiry({
      ...inquiry,
      answers: sanitizeJsonRecord(inquiry.answers, {
        maxArrayLength: 80,
        maxDepth: 7,
        maxObjectKeys: 100,
        maxStringLength: 2000,
      }),
      contactEmail: truncateText(inquiry.contactEmail, 120).toLowerCase(),
      contactName: truncateText(inquiry.contactName, 80) || "문의자",
      contactPhone: truncateText(inquiry.contactPhone, 40),
      formId: "",
      id: "",
      message: truncateText(inquiry.message, MAX_INQUIRY_MESSAGE_LENGTH),
      messages: [],
      programId: programRecord?.id ?? String(publicProgram?.id ?? inquiry.programId),
      programTitle:
        truncateText(
          programRecord?.title || publicProgram?.title || "",
          160,
        ),
      source: "program",
      status: "new",
      submittedBy: auth?.user.id ?? "",
      submittedAt: new Date().toISOString(),
      title: truncateText(inquiry.title || "문의", 120),
      updatedAt: new Date().toISOString(),
      villageId: programRecord?.villageId ?? "",
    });

    await queueProgramInquiryCreatedNotification({
      applicantName: savedInquiry.contactName,
      inquiryId: savedInquiry.id,
      programCreatedBy: programRecord?.createdBy ?? undefined,
      programTitle: savedInquiry.programTitle || "프로그램",
      villageId: savedInquiry.villageId || programRecord?.villageId || undefined,
    });

    return NextResponse.json({ data: { accepted: true } }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save inquiry.",
      },
      { status: 400 },
    );
  }
}

function validateProgramInquiry(
  inquiry: ReturnType<typeof normalizeHostInquiry>,
): string | null {
  if (!(inquiry.programId ?? "").trim()) return "Program id is required.";

  const message = inquiry.message.trim();
  if (!message) return "Message is required.";
  if (message.length > MAX_INQUIRY_MESSAGE_LENGTH) {
    return `Message must be ${MAX_INQUIRY_MESSAGE_LENGTH} characters or less.`;
  }

  if (inquiry.contactName.length > 80) {
    return "Contact name is too long.";
  }

  if (inquiry.contactPhone.length > 40) {
    return "Contact phone is too long.";
  }

  if (inquiry.contactEmail) {
    if (inquiry.contactEmail.length > 120 || !isEmail(inquiry.contactEmail)) {
      return "A valid contact email is required.";
    }
  }

  if (JSON.stringify(inquiry.answers).length > 12_000) {
    return "Inquiry answers are too large.";
  }

  return null;
}

function truncateText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim());
}
