const reservedTopLevelSegments = new Set([
  "_next",
  "admin",
  "announcements",
  "api",
  "auth",
  "apple-icon.png",
  "favicon.ico",
  "half-price-travel",
  "host",
  "icon.svg",
  "login",
  "manifest.json",
  "me",
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

export function isReservedVillageSlug(slug: string): boolean {
  return reservedTopLevelSegments.has(slug.toLowerCase());
}

export function villagePath(slug: string): string {
  return `/${slug}`;
}

export function canonicalVillagePath(slug: string): string {
  return `/villages/${slug}`;
}

export function villageProgramPath(villageSlug: string, programSlug: string): string {
  return `/${villageSlug}/${programSlug}`;
}

export function canonicalVillageProgramPath(
  villageSlug: string,
  programSlug: string,
): string {
  return `/villages/${villageSlug}/programs/${programSlug}`;
}

export function isVillageMicrositePath(pathname: string): boolean {
  const path = pathname.split(/[?#]/u)[0] ?? "";
  const segments = path.split("/").filter(Boolean);
  const [first, second, third] = segments;

  if (!first) return false;

  if (first === "villages") {
    return segments.length >= 2;
  }

  if (isReservedVillageSlug(first) || first.includes(".")) {
    return false;
  }

  if (segments.length === 1 || (segments.length === 2 && !third)) {
    return true;
  }

  return (
    segments.length === 3 &&
    (second === "media" || second === "reviews" || second === "privacy") &&
    Boolean(third)
  );
}
