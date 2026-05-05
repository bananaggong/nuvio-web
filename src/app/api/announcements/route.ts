import { NextResponse } from "next/server";
import {
  getAnnouncementRefreshSeconds,
  getLiveAnnouncementFeed,
} from "@/lib/live-announcements";
import { refreshExternalAnnouncementPipeline } from "@/lib/announcement-refresh";
import { shouldRefreshPersistedAnnouncements } from "@/lib/external-announcement-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";
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
