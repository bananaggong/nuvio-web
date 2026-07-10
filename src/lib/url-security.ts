const publicImageHosts = new Set([
  "cdn.imweb.me",
  "ctt-image.kakao.com",
  "images.unsplash.com",
  "postcode.map.kakao.com",
  "upload.wikimedia.org",
]);

const publicImageHostSuffixes = [
  ".cdninstagram.com",
  ".daumcdn.net",
  ".fbcdn.net",
  ".kakaocdn.net",
  ".supabase.co",
];

type SanitizeUrlOptions = {
  allowRelative?: boolean;
};

export function sanitizePublicImageUrl(
  value: string,
  options: SanitizeUrlOptions = {},
): string {
  const input = value.trim();
  if (!input) return "";

  if (options.allowRelative && isSafeRelativePath(input)) {
    return input;
  }

  const url = parseAbsoluteUrl(input, "A valid image URL is required.");
  if (url.protocol !== "https:") {
    throw new Error("Image URLs must use HTTPS.");
  }

  const hostname = url.hostname.toLowerCase();
  if (!isAllowedPublicImageHost(hostname)) {
    throw new Error("This image host is not allowed.");
  }

  url.username = "";
  url.password = "";
  url.hash = "";

  return url.toString();
}

export function trySanitizePublicImageUrl(
  value: string,
  options: SanitizeUrlOptions = {},
): string {
  try {
    return sanitizePublicImageUrl(value, options);
  } catch {
    return "";
  }
}

export function sanitizeEditorLinkUrl(
  value: string,
  options: SanitizeUrlOptions = {},
): string {
  const input = value.trim();
  if (!input) return "";

  if (options.allowRelative && isSafeRelativePath(input)) {
    return input;
  }

  const url = parseAbsoluteUrl(input, "A valid link URL is required.");
  const protocol = url.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:" && protocol !== "mailto:") {
    throw new Error("Only HTTP(S) and mailto links are allowed.");
  }

  if (protocol === "http:" || protocol === "https:") {
    url.username = "";
    url.password = "";
  }

  return url.toString();
}

export function trySanitizeEditorLinkUrl(
  value: string,
  options: SanitizeUrlOptions = {},
): string {
  try {
    return sanitizeEditorLinkUrl(value, options);
  } catch {
    return "";
  }
}

export function sanitizeHttpUrl(
  value: string,
  options: SanitizeUrlOptions = {},
): string {
  const input = value.trim();
  if (!input) return "";

  if (options.allowRelative && isSafeRelativePath(input)) {
    return input;
  }

  const url = parseAbsoluteUrl(input, "A valid URL is required.");
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP(S) URLs are allowed.");
  }

  url.username = "";
  url.password = "";

  return url.toString();
}

export function trySanitizeHttpUrl(
  value: string,
  options: SanitizeUrlOptions = {},
): string {
  try {
    return sanitizeHttpUrl(value, options);
  } catch {
    return "";
  }
}

export function isSafeRelativePath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function parseAbsoluteUrl(value: string, errorMessage: string): URL {
  try {
    const url = new URL(value);
    if (url.hostname.includes("\\")) throw new Error("Invalid host.");
    return url;
  } catch {
    throw new Error(errorMessage);
  }
}

function isAllowedPublicImageHost(hostname: string): boolean {
  return (
    publicImageHosts.has(hostname) ||
    publicImageHostSuffixes.some((suffix) => hostname.endsWith(suffix))
  );
}
