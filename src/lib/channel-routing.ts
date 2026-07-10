import { programSlugPath } from "@/lib/program-routing";

const reservedTopLevelSegments = new Set([
  "_next",
  "admin",
  "announcements",
  "api",
  "auth",
  "apple-icon.png",
  "channels",
  "favicon.ico",
  "half-price-travel",
  "host",
  "icon.svg",
  "login",
  "magazine",
  "manifest.json",
  "me",
  "mypage",
  "partners",
  "privacy",
  "robots.txt",
  "programs",
  "reviews",
  "sitemap.xml",
  "signup",
  "terms",
  "villages",
]);

export const boseongLegacyChannelSlug = "boseong";

export function isBoseongLegacyChannelSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === boseongLegacyChannelSlug;
}

export function supportsChannelReviewDetailPages(slug: string): boolean {
  return isBoseongLegacyChannelSlug(slug);
}

export function isReservedChannelSlug(slug: string): boolean {
  return reservedTopLevelSegments.has(slug.toLowerCase());
}

export function channelPath(slug: string): string {
  return `/${slug}`;
}

export function canonicalChannelPath(slug: string): string {
  return `/channels/${slug}`;
}

export function channelProgramPath(
  _channelSlug: string,
  programSlug: string,
): string {
  return programSlugPath(programSlug);
}

export function isChannelMicrositePath(pathname: string): boolean {
  const path = pathname.split(/[?#]/u)[0] ?? "";
  const segments = path.split("/").filter(Boolean);
  const [first, second, third] = segments;

  if (!first) return false;

  if (first === "villages" || first === "channels") {
    return segments.length >= 2;
  }

  if (isReservedChannelSlug(first) || first.includes(".")) {
    return false;
  }

  if (segments.length === 1 || (segments.length === 2 && !third)) {
    return true;
  }

  return (
    segments.length === 3 &&
    (second === "media" ||
      second === "notice" ||
      second === "privacy" ||
      (second === "reviews" && supportsChannelReviewDetailPages(first))) &&
    Boolean(third)
  );
}
