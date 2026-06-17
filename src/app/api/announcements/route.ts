import { NextResponse } from "next/server";
import {
  applyRateLimit,
  isApiAuthError,
  requireAdminRole,
} from "@/lib/api-security";
import {
  getAnnouncementRefreshSeconds,
  getLiveAnnouncementFeed,
} from "@/lib/live-announcements";
import { refreshExternalAnnouncementPipeline } from "@/lib/announcement-refresh";
import { shouldRefreshPersistedAnnouncements } from "@/lib/external-announcement-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = applyRateLimit(request, {
    key: "public-announcements:list",
    limit: 180,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";
  if (forceRefresh) {
    const auth = await requireAdminRole();
    if (isApiAuthError(auth)) return auth.response;
  }

  const refreshSeconds = getAnnouncementRefreshSeconds();
  const shouldRefresh =
    forceRefresh || (await shouldRefreshPersistedAnnouncements(refreshSeconds));

  if (shouldRefresh) {
    await refreshExternalAnnouncementPipeline().catch(() => undefined);
  }

  const feed = await getLiveAnnouncementFeed({ forceRefresh: false });

  return NextResponse.json(
    { data: feed.items, meta: feed.meta },
    {
      headers: {
        "Cache-Control": `s-maxage=${refreshSeconds}, stale-while-revalidate=60`,
      },
    },
  );
}
