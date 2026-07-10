import type { LiveAnnouncement } from "./types";
import { trySanitizeHttpUrl } from "./url-security";

export function getAnnouncementHref(announcement: LiveAnnouncement): string {
  if (announcement.isExternal && announcement.sourceUrl) {
    return trySanitizeHttpUrl(announcement.sourceUrl) || "/announcements";
  }

  return `/announcements/${announcement.internalId ?? announcement.id}`;
}

export function shouldOpenAnnouncementExternally(
  announcement: LiveAnnouncement,
): boolean {
  return Boolean(
    announcement.isExternal &&
      announcement.sourceUrl &&
      trySanitizeHttpUrl(announcement.sourceUrl),
  );
}
