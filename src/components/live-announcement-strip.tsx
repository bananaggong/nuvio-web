"use client";

import Link from "next/link";
import { BellRing, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAnnouncementHref,
  shouldOpenAnnouncementExternally,
} from "@/lib/announcement-links";
import type { Announcement, LiveAnnouncement } from "@/lib/types";

type AnnouncementsResponse = {
  data?: LiveAnnouncement[];
  meta?: {
    refreshSeconds?: number;
  };
};

type LiveAnnouncementStripProps = {
  fallbackAnnouncement: Announcement;
};

export function LiveAnnouncementStrip({
  fallbackAnnouncement,
}: LiveAnnouncementStripProps) {
  const [announcement, setAnnouncement] = useState<LiveAnnouncement>(() =>
    toLiveAnnouncement(fallbackAnnouncement),
  );

  useEffect(() => {
    let active = true;
    let refreshTimer: number | undefined;

    async function loadAnnouncements() {
      let refreshSeconds = 300;

      try {
        const response = await fetch("/api/announcements", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json()) as AnnouncementsResponse;
        const nextAnnouncement =
          payload.data?.find((item) => item.isExternal) ?? payload.data?.[0];
        refreshSeconds = Math.max(payload.meta?.refreshSeconds ?? 300, 30);

        if (active && nextAnnouncement) {
          setAnnouncement(nextAnnouncement);
        }
      } catch {
        refreshSeconds = 300;
      } finally {
        if (active) {
          refreshTimer = window.setTimeout(
            loadAnnouncements,
            refreshSeconds * 1000,
          );
        }
      }
    }

    void loadAnnouncements();

    return () => {
      active = false;
      if (refreshTimer) window.clearTimeout(refreshTimer);
    };
  }, []);

  const href = getAnnouncementHref(announcement);
  const openExternally = shouldOpenAnnouncementExternally(announcement);

  return (
    <Link
      className="flex min-w-0 items-center gap-3 rounded-md bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-slate-200 hover:ring-[var(--primary)]"
      href={href}
      rel={openExternally ? "noreferrer" : undefined}
      target={openExternally ? "_blank" : undefined}
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-[var(--primary)]">
        <BellRing size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black text-[var(--primary)]">
          {announcement.isExternal ? announcement.sourceName : "실시간 공지"}
        </span>
        <span className="line-clamp-1 font-bold text-slate-800">
          {announcement.title}
        </span>
      </span>
      {openExternally ? (
        <ExternalLink className="ml-auto shrink-0 text-slate-400" size={17} />
      ) : (
        <ChevronRight className="ml-auto shrink-0 text-slate-400" size={18} />
      )}
    </Link>
  );
}

function toLiveAnnouncement(announcement: Announcement): LiveAnnouncement {
  return {
    ...announcement,
    id: `internal-${announcement.id}`,
    internalId: announcement.id,
    sourceId: "nuvio",
    sourceName: "NUVIO 운영 공지",
    sourceUrl: `/announcements/${announcement.id}`,
    isExternal: false,
    relevance: 99,
  };
}
