import { NextResponse } from "next/server";
import { isDisplayNameAvailable } from "@/lib/auth-profile-db";
import {
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "me-profile:nickname",
    limit: 80,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const auth = await requireAuthenticatedUser();
    if (isApiAuthError(auth)) return auth.response;

    const { searchParams } = new URL(request.url);
    const nickname = searchParams.get("nickname")?.trim().slice(0, 80) ?? "";
    if (!nickname) {
      return NextResponse.json(
        { error: "닉네임을 입력해 주세요." },
        { status: 400 },
      );
    }

    const available = await isDisplayNameAvailable(nickname, auth.user.id);

    return NextResponse.json({
      data: {
        available,
        nickname,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "닉네임 중복확인을 완료하지 못했어요.",
      },
      { status: 400 },
    );
  }
}
