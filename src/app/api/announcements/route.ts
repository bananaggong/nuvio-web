import { NextResponse } from "next/server";
import {
  getAnnouncementRefreshSeconds,
  getLiveAnnouncementFeed,
} from "@/lib/live-announcements";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";
  const feed = await getLiveAnnouncementFeed({ forceRefresh });
  const refreshSeconds = getAnnouncementRefreshSeconds();

  return NextResponse.json(
    { data: feed.items, meta: feed.meta },
    {
      headers: {
        "Cache-Control": `s-maxage=${refreshSeconds}, stale-while-revalidate=60`,
      },
    },
  );
}
