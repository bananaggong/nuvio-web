import type { LiveAnnouncement } from "./types";

export function getAnnouncementHref(announcement: LiveAnnouncement): string {
  if (announcement.isExternal && announcement.sourceUrl) {
    return announcement.sourceUrl;
  }

  return `/announcements/${announcement.internalId ?? announcement.id}`;
}

export function shouldOpenAnnouncementExternally(
  announcement: LiveAnnouncement,
): boolean {
  return Boolean(announcement.isExternal && announcement.sourceUrl);
}
