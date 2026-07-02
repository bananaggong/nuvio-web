import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import {
  createProgramInquiryMessage,
  getUserProgramInquiryFromDb,
} from "@/lib/host-inquiry-db";
import { queueProgramInquiryUserMessageNotification } from "@/lib/notification-db";
import { getProgramRecordByIdentifier } from "@/lib/program-db";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGE_PAYLOAD_BYTES = 8 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, MAX_MESSAGE_PAYLOAD_BYTES);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "me-inquiry-message:create",
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      message?: string;
    };
    const message = body.message?.trim() ?? "";

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid inquiry id." }, { status: 400 });
    }

    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    const inquiry = await getUserProgramInquiryFromDb(id, auth.user.id);
    if (!inquiry) {
      return NextResponse.json(
        { error: "Inquiry was not found." },
        { status: 404 },
      );
    }
    if (inquiry.status === "closed") {
      return apiError("Closed inquiries cannot receive new messages.", 409);
    }

    const savedMessage = await createProgramInquiryMessage(id, {
      message,
      senderId: auth.user.id,
      senderName:
        auth.profile.displayName ||
        auth.profile.fullName ||
        auth.user.email ||
        inquiry.contactName,
      senderRole: "user",
      statusAfter: "new",
    });

    if (!savedMessage) {
      return apiError("Closed inquiries cannot receive new messages.", 409);
    }

    const programRecord = inquiry.programId
      ? await getProgramRecordByIdentifier(inquiry.programId)
      : undefined;
    await queueProgramInquiryUserMessageNotification({
      inquiryId: inquiry.id,
      programCreatedBy: programRecord?.createdBy ?? undefined,
      programTitle: inquiry.programTitle || programRecord?.title || "프로그램",
      senderName: savedMessage.senderName || inquiry.contactName,
      villageId: inquiry.villageId || programRecord?.villageId || undefined,
    });

    return NextResponse.json({ data: savedMessage }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send message.",
      },
      { status: 500 },
    );
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
