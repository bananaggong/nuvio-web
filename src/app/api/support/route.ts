import { NextResponse } from "next/server";
import { createProgramInquiry } from "@/lib/host-inquiry-db";
import {
  getSupportInquiryLabel,
  isSupportInquiryType,
  type SupportInquiryType,
} from "@/lib/support-inquiries";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
} from "@/lib/api-security";

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
  const contentLengthError = enforceContentLength(request, MAX_PAYLOAD_BYTES);
  if (contentLengthError) return contentLengthError;

  const crossOriginError = enforceSameOrigin(request);
  if (crossOriginError) return crossOriginError;

  const rateLimitError = applyRateLimit(request, SUPPORT_RATE_LIMIT);
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("요청 형식이 올바르지 않습니다.", 400);
  }

  const validation = validateSupportInquiry(body);
  if ("error" in validation) return apiError(validation.error, 400);

  try {
    const now = new Date().toISOString();
    const inquiryTypeLabel = getSupportInquiryLabel(
      validation.values.inquiryType,
    );
    const savedInquiry = await createProgramInquiry({
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
      programTitle: "고객센터",
      source: "support",
      status: "new",
      submittedAt: now,
      title: inquiryTypeLabel,
      updatedAt: now,
      villageId: "",
    });

    return NextResponse.json(
      {
        data: {
          id: savedInquiry.id,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "문의 접수에 실패했습니다.",
      500,
    );
  }
}

function validateSupportInquiry(
  body: unknown,
):
  | {
      values: ValidatedSupportInquiry;
    }
  | {
      error: string;
    } {
  const value =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const inquiryType = readText(value.inquiryType);
  const name = readText(value.name);
  const phone = readText(value.phone);
  const email = readText(value.email);
  const message = readText(value.message);

  if (!isSupportInquiryType(inquiryType)) {
    return { error: "문의 유형을 선택해 주세요." };
  }

  if (!name || name.length > 50) {
    return { error: "이름을 50자 이내로 입력해 주세요." };
  }

  if (phone.length > 30) {
    return { error: "전화번호를 30자 이내로 입력해 주세요." };
  }

  if (!email || email.length > 120 || !isEmail(email)) {
    return { error: "이메일 형식을 확인해 주세요." };
  }

  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return { error: "문의 내용을 2000자 이내로 입력해 주세요." };
  }

  return {
    values: {
      email,
      inquiryType,
      message,
      name,
      phone,
    },
  };
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
