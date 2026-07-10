const allowedImageTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const allowedVideoTypes = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const storageExtensionsByContentType: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export type ValidatedUploadFile = {
  contentType: string;
  extension: string;
  kind: "image" | "video";
  size: number;
};

export async function validateImageUploadFile(
  file: File,
  options: { maxBytes: number },
): Promise<ValidatedUploadFile> {
  assertNonEmptyFile(file, "Images");

  if (file.size > options.maxBytes) {
    throw new Error(`Images must be ${formatBytes(options.maxBytes)} or smaller.`);
  }

  const contentType = normalizeContentType(file.type);
  if (!allowedImageTypes.has(contentType)) {
    throw new Error("Only JPG, PNG, WebP, and GIF images can be uploaded.");
  }

  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesImageSignature(contentType, signature)) {
    throw new Error("The uploaded file does not match its image type.");
  }

  return {
    contentType,
    extension: storageExtensionForContentType(contentType),
    kind: "image",
    size: file.size,
  };
}

export async function validateMediaUploadFile(
  file: File,
  options: { maxImageBytes: number; maxVideoBytes: number },
): Promise<ValidatedUploadFile> {
  const contentType = normalizeContentType(file.type);

  if (allowedImageTypes.has(contentType)) {
    return validateImageUploadFile(file, { maxBytes: options.maxImageBytes });
  }

  assertNonEmptyFile(file, "Videos");

  if (!allowedVideoTypes.has(contentType)) {
    throw new Error("Only MP4, MOV, and WebM videos can be uploaded.");
  }

  if (file.size > options.maxVideoBytes) {
    throw new Error(`Videos must be ${formatBytes(options.maxVideoBytes)} or smaller.`);
  }

  const signature = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (!matchesVideoSignature(contentType, signature)) {
    throw new Error("The uploaded file does not match its video type.");
  }

  return {
    contentType,
    extension: storageExtensionForContentType(contentType),
    kind: "video",
    size: file.size,
  };
}

export function sanitizeStorageFileName(
  value: string,
  contentType: string,
  fallback: string,
): string {
  const extension = storageExtensionForContentType(contentType);
  const baseName =
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\.[^.]*$/u, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || fallback;

  return `${baseName}.${extension}`;
}

export function sanitizeStoragePathSegment(value: string, fallback: string): string {
  return (
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96) || fallback
  );
}

function assertNonEmptyFile(file: File, label: string) {
  if (file.size <= 0) {
    throw new Error(`${label} cannot be empty.`);
  }
}

function normalizeContentType(contentType: string): string {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function matchesImageSignature(contentType: string, bytes: Uint8Array): boolean {
  if (contentType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (contentType === "image/png") {
    return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }

  if (contentType === "image/gif") {
    return startsWithAscii(bytes, "GIF87a") || startsWithAscii(bytes, "GIF89a");
  }

  if (contentType === "image/webp") {
    return startsWithAscii(bytes, "RIFF") && asciiAt(bytes, 8, "WEBP");
  }

  return false;
}

function matchesVideoSignature(contentType: string, bytes: Uint8Array): boolean {
  if (contentType === "video/webm") {
    return startsWithBytes(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
  }

  if (contentType === "video/mp4") {
    return isIsoBaseMediaFile(bytes) && !hasIsoBrand(bytes, "qt  ");
  }

  if (contentType === "video/quicktime") {
    return isIsoBaseMediaFile(bytes);
  }

  return false;
}

function isIsoBaseMediaFile(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && asciiAt(bytes, 4, "ftyp");
}

function hasIsoBrand(bytes: Uint8Array, brand: string): boolean {
  for (let offset = 8; offset + brand.length <= bytes.length; offset += 4) {
    if (asciiAt(bytes, offset, brand)) return true;
  }

  return false;
}

function storageExtensionForContentType(contentType: string): string {
  const extension = storageExtensionsByContentType[normalizeContentType(contentType)];
  if (!extension) {
    throw new Error("Unsupported upload content type.");
  }

  return extension;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${Math.floor(bytes / (1024 * 1024))}MB`;
  }

  if (bytes >= 1024) {
    return `${Math.floor(bytes / 1024)}KB`;
  }

  return `${bytes} bytes`;
}

function startsWithBytes(bytes: Uint8Array, expected: number[]): boolean {
  return expected.every((byte, index) => bytes[index] === byte);
}

function startsWithAscii(bytes: Uint8Array, expected: string): boolean {
  return asciiAt(bytes, 0, expected);
}

function asciiAt(bytes: Uint8Array, offset: number, expected: string): boolean {
  return [...expected].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  );
}
