import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
import {
  createProgramInquiryMessage,
  getHostInquiryFromDb,
} from "@/lib/host-inquiry-db";
import { listHostVillageWorkspaces } from "@/lib/host-village-access";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 2000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

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

    const villageIds =
      auth.profile.role === "admin"
        ? undefined
        : (await listHostVillageWorkspaces(auth)).map(
            (workspace) => workspace.villageId,
          );
    const inquiry = await getHostInquiryFromDb(id, { villageIds });

    if (!inquiry) {
      return NextResponse.json(
        { error: "Inquiry was not found." },
        { status: 404 },
      );
    }

    const savedMessage = await createProgramInquiryMessage(id, {
      message,
      senderId: auth.user.id,
      senderName:
        auth.profile.displayName ||
        auth.profile.fullName ||
        auth.user.email ||
        "호스트",
      senderRole: "host",
      statusAfter: inquiry.status === "closed" ? "closed" : "answered",
    });

    if (!savedMessage) {
      return NextResponse.json(
        { error: "Message was not saved." },
        { status: 500 },
      );
    }

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
