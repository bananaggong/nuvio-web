import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  enforceSameOrigin,
  readJsonWithLimit,
} from "@/lib/api-security";
import { createProgramInquiry } from "@/lib/host-inquiry-db";
import {
  getSupportInquiryLabel,
  isSupportInquiryType,
  type SupportInquiryType,
} from "@/lib/support-inquiries";

export const runtime = "nodejs";

const MAX_PAYLOAD_BYTES = 16 * 1024;
const MAX_MESSAGE_LENGTH = 2000;
const SUPPORT_RATE_LIMIT = {
  key: "support-inquiry",
  limit: 5,
  windowMs: 10 * 60 * 1000,
};

type ValidatedSupportInquiry = {
  email: string;
  inquiryType: SupportInquiryType;
  message: string;
  name: string;
  phone: string;
};

export async function POST(request: Request) {
  const crossOriginError = enforceSameOrigin(request);
  if (crossOriginError) return crossOriginError;

  const rateLimitError = await applyPersistentRateLimit(
    request,
    SUPPORT_RATE_LIMIT,
  );
  if (rateLimitError) return rateLimitError;

  const { body, response } = await readJsonWithLimit(request, MAX_PAYLOAD_BYTES);
  if (response) return response;

  const validation = validateSupportInquiry(body);
  if ("error" in validation) return apiError(validation.error, 400);

  try {
    const now = new Date().toISOString();
    const inquiryTypeLabel = getSupportInquiryLabel(
      validation.values.inquiryType,
    );

    await createProgramInquiry({
      answers: {
        inquiryType: validation.values.inquiryType,
        inquiryTypeLabel,
        submittedFrom: "/support",
      },
      contactEmail: validation.values.email,
      contactName: validation.values.name,
      contactPhone: validation.values.phone,
      formId: "",
      id: "",
      message: validation.values.message,
      messages: [],
      programId: "",
      programTitle: "Customer support",
      source: "support",
      status: "new",
      submittedAt: now,
      title: inquiryTypeLabel,
      updatedAt: now,
      villageId: "",
    });

    return NextResponse.json({ data: { accepted: true } }, { status: 202 });
  } catch {
    return apiError("Failed to submit support inquiry.", 500);
  }
}

function validateSupportInquiry(
  body: unknown,
): { values: ValidatedSupportInquiry } | { error: string } {
  const value =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const inquiryType = readText(value.inquiryType);
  const name = readText(value.name);
  const phone = readText(value.phone);
  const email = readText(value.email).toLowerCase();
  const message = readText(value.message);

  if (!isSupportInquiryType(inquiryType)) {
    return { error: "Select a valid inquiry type." };
  }
  if (!name || name.length > 50) {
    return { error: "Name must be between 1 and 50 characters." };
  }
  if (phone.length > 30) {
    return { error: "Phone number is too long." };
  }
  if (!email || email.length > 120 || !isEmail(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return { error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.` };
  }

  return {
    values: { email, inquiryType, message, name, phone },
  };
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}
