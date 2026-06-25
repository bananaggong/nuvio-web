import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import {
  deleteHostMessageTemplate,
  listHostMessageTemplatesFromDb,
  upsertHostMessageTemplate,
} from "@/lib/message-template-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-message-template:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const templates = await listHostMessageTemplatesFromDb({
      ownerId: auth.user.id,
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    return apiError(
      error instanceof Error
        ? error.message
        : "메세지 템플릿을 불러오지 못했습니다.",
      500,
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 32 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-message-template:save",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const payload = await request.json().catch(() => ({}));
    const template = await upsertHostMessageTemplate(payload, {
      ownerId: auth.user.id,
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "메세지 템플릿을 저장하지 못했습니다.",
      400,
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 8 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-message-template:delete",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const payload = (await request.json().catch(() => ({}))) as { id?: unknown };
    const id = typeof payload.id === "string" ? payload.id.trim() : "";
    const result = await deleteHostMessageTemplate(id, {
      ownerId: auth.user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "메세지 템플릿을 삭제하지 못했습니다.",
      400,
    );
  }
}
