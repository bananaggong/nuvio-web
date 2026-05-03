import { NextResponse } from "next/server";
import { getAnnouncementRefreshSeconds } from "@/lib/live-announcements";
import { getProgramLeadFeed } from "@/lib/program-leads";

export const runtime = "nodejs";

export async function GET() {
  const feed = await getProgramLeadFeed();
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
