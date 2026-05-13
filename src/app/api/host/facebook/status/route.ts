import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
import {
  getHostSocialConnection,
  redactHostSocialConnection,
} from "@/lib/host-social-connections-db";
import { hasFacebookOAuthConfig } from "@/lib/meta-graph";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const { searchParams } = new URL(request.url);
  const villageSlug = searchParams.get("villageSlug") ?? "boseong";
  const configured = hasFacebookOAuthConfig();

  try {
    const connection = await getHostSocialConnection(villageSlug, "facebook");

    return NextResponse.json({
      data: {
        configured,
        connected: Boolean(connection),
        connection: redactHostSocialConnection(connection),
        connectUrl: `/api/host/facebook/connect?villageSlug=${encodeURIComponent(
          villageSlug,
        )}&returnTo=${encodeURIComponent(`/host/${villageSlug}`)}`,
      },
    });
  } catch (error) {
    void error;

    return NextResponse.json({
      data: {
        configured,
        connected: false,
        connection: null,
        connectUrl: `/api/host/facebook/connect?villageSlug=${encodeURIComponent(
          villageSlug,
        )}&returnTo=${encodeURIComponent(`/host/${villageSlug}`)}`,
      },
      error:
        "Facebook 연결 상태 저장소를 아직 사용할 수 없습니다. DB migration 적용 후 다시 확인하세요.",
    });
  }
}
