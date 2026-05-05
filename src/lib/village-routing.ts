const reservedTopLevelSegments = new Set([
  "_next",
  "admin",
  "announcements",
  "api",
  "auth",
  "favicon.ico",
  "half-price-travel",
  "host",
  "login",
  "me",
  "partners",
  "privacy",
  "programs",
  "reviews",
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
