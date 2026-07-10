import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import {
  createProgramInquiryMessage,
  getUserProgramInquiryFromDb,
} from "@/lib/host-inquiry-db";
import { getProgramAutoReplyConfigByProgramId } from "@/lib/program-auto-reply-db";
import { createDefaultProgramAutoReplyConfig } from "@/lib/program-auto-replies";

export const runtime = "nodejs";

const MAX_AUTO_REPLY_PAYLOAD_BYTES = 4 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "me-inquiry-auto-reply:create",
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const { body: rawBody, response } = await readJsonWithLimit(
      request,
      MAX_AUTO_REPLY_PAYLOAD_BYTES,
    );
    if (response) return response;
    const body = rawBody as {
      itemId?: string;
    };
    const itemId = body.itemId?.trim() ?? "";

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid inquiry id." }, { status: 400 });
    }

    if (!itemId) {
      return NextResponse.json(
        { error: "Auto reply item id is required." },
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

    const config =
      (await getProgramAutoReplyConfigByProgramId(inquiry.programId ?? "")) ??
      createDefaultProgramAutoReplyConfig(inquiry.programId ?? "");

    if (!config.enabled) {
      return NextResponse.json(
        { error: "Auto replies are disabled." },
        { status: 400 },
      );
    }

    const item = config.items.find(
      (candidate) => candidate.enabled && candidate.id === itemId,
    );
    if (!item) {
      return NextResponse.json(
        { error: "Auto reply item was not found." },
        { status: 404 },
      );
    }

    const selectedQuestionMessage = await createProgramInquiryMessage(id, {
      message: item.label,
      senderId: auth.user.id,
      senderName:
        auth.profile.displayName ||
        auth.profile.fullName ||
        auth.user.email ||
        inquiry.contactName,
      senderRole: "user",
      statusAfter: "new",
    });

    const savedMessage = await createProgramInquiryMessage(id, {
      message: item.response,
      senderName: "자동응답",
      senderRole: "host",
      statusAfter: "answered",
    });

    if (!selectedQuestionMessage || !savedMessage) {
      return NextResponse.json(
        { error: "Auto reply was not saved." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { data: [selectedQuestionMessage, savedMessage] },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send auto reply.",
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
