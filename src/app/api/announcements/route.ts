import { NextResponse } from "next/server";
import {
  getAnnouncementRefreshSeconds,
  getLiveAnnouncementFeed,
} from "@/lib/live-announcements";

export const runtime = "nodejs";

export async function GET() {
  const feed = await getLiveAnnouncementFeed();
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
