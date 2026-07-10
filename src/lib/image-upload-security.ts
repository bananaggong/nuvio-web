import sharp from "sharp";

export const serverUploadMaxFileBytes = 4 * 1024 * 1024;
export const serverUploadMaxRequestBytes = serverUploadMaxFileBytes + 256 * 1024;

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

const imageFormatsByContentType: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

const defaultImageLimits = {
  maxFrames: 200,
  maxHeight: 12_000,
  maxPixels: 40_000_000,
  maxTotalPixels: 100_000_000,
  maxWidth: 12_000,
};

const maxContainerElements = 1_024;
const maxFtypBoxBytes = 4 * 1024;
const maxEbmlHeaderBytes = 4 * 1024;
const webmEbmlHeaderId = 0x1a45dfa3;
const webmDocTypeId = 0x4282;
const webmSegmentId = 0x18538067;
const webmTracksId = 0x1654ae6b;
const webmClusterId = 0x1f43b675;

export type ValidatedUploadFile = {
  contentType: string;
  extension: string;
  kind: "image" | "video";
  size: number;
};

type ImageUploadOptions = {
  maxBytes: number;
  maxFrames?: number;
  maxHeight?: number;
  maxPixels?: number;
  maxTotalPixels?: number;
  maxWidth?: number;
};

type IsoBox = {
  end: number;
  headerSize: number;
  size: number;
  start: number;
  type: string;
};

type EbmlVint = {
  unknown: boolean;
  value: number;
  width: number;
};

type EbmlElement = {
  dataOffset: number;
  id: number;
  size: number | null;
};

export async function validateImageUploadFile(
  file: File,
  options: ImageUploadOptions,
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

  await assertSafeImageMetadata(file, contentType, options);

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

  if (!(await matchesVideoContainer(file, contentType))) {
    throw new Error(
      "The uploaded video is malformed, truncated, or does not match its declared type.",
    );
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

async function assertSafeImageMetadata(
  file: File,
  contentType: string,
  options: ImageUploadOptions,
) {
  const maxFrames = options.maxFrames ?? defaultImageLimits.maxFrames;
  const maxHeight = options.maxHeight ?? defaultImageLimits.maxHeight;
  const maxPixels = options.maxPixels ?? defaultImageLimits.maxPixels;
  const maxTotalPixels =
    options.maxTotalPixels ?? defaultImageLimits.maxTotalPixels;
  const maxWidth = options.maxWidth ?? defaultImageLimits.maxWidth;
  const input = Buffer.from(await file.arrayBuffer());
  const decoderOptions = {
    animated: true,
    failOn: "error" as const,
    limitInputPixels: maxTotalPixels,
    sequentialRead: true,
  };

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    metadata = await sharp(input, decoderOptions).metadata();
  } catch {
    throw new Error("The uploaded image is malformed or exceeds safe dimensions.");
  }

  const expectedFormat = imageFormatsByContentType[contentType];
  if (metadata.format !== expectedFormat) {
    throw new Error("The uploaded file does not match its image type.");
  }

  const width = metadata.width;
  const height = metadata.pageHeight ?? metadata.height;
  const frames = metadata.pages ?? 1;
  if (!width || !height || width < 1 || height < 1 || frames < 1) {
    throw new Error("The uploaded image has invalid metadata.");
  }

  if (width > maxWidth || height > maxHeight) {
    throw new Error(`Images cannot exceed ${maxWidth}x${maxHeight} pixels.`);
  }

  const pixels = width * height;
  if (!Number.isSafeInteger(pixels) || pixels > maxPixels) {
    throw new Error(`Images cannot exceed ${maxPixels.toLocaleString("en-US")} pixels.`);
  }

  if (frames > maxFrames) {
    throw new Error(`Animated images cannot exceed ${maxFrames} frames.`);
  }

  const totalPixels = pixels * frames;
  if (!Number.isSafeInteger(totalPixels) || totalPixels > maxTotalPixels) {
    throw new Error(
      `Animated images cannot exceed ${maxTotalPixels.toLocaleString("en-US")} total pixels.`,
    );
  }

  try {
    await sharp(input, decoderOptions).stats();
  } catch {
    throw new Error("The uploaded image is malformed or cannot be fully decoded.");
  }
}

async function matchesVideoContainer(file: File, contentType: string): Promise<boolean> {
  if (contentType === "video/webm") {
    return matchesWebmContainer(file);
  }

  if (contentType === "video/mp4" || contentType === "video/quicktime") {
    return matchesIsoBaseMediaContainer(file, contentType);
  }

  return false;
}

async function matchesIsoBaseMediaContainer(
  file: File,
  contentType: "video/mp4" | "video/quicktime",
): Promise<boolean> {
  let offset = 0;
  let elementCount = 0;
  let sawMediaData = false;
  let sawMovieMetadata = false;

  while (offset < file.size) {
    elementCount += 1;
    if (elementCount > maxContainerElements) return false;

    const box = await readIsoBox(file, offset);
    if (!box) return false;

    if (offset === 0) {
      if (box.type !== "ftyp" || !(await matchesIsoBrands(file, box, contentType))) {
        return false;
      }
    }

    if (box.type === "moov" && box.size > box.headerSize) {
      sawMovieMetadata = true;
    }
    if (box.type === "mdat" && box.size > box.headerSize) {
      sawMediaData = true;
    }

    offset = box.end;
  }

  return offset === file.size && sawMovieMetadata && sawMediaData;
}

async function readIsoBox(file: File, start: number): Promise<IsoBox | null> {
  const header = await readFileBytes(file, start, 16);
  if (header.length < 8) return null;

  const compactSize = readUint32BigEndian(header, 0);
  const type = asciiFromBytes(header, 4, 4);
  let headerSize = 8;
  let size: number;

  if (compactSize === 0) {
    size = file.size - start;
  } else if (compactSize === 1) {
    if (header.length < 16) return null;
    const extendedSize = readUint64BigEndian(header, 8);
    if (extendedSize === null) return null;
    size = extendedSize;
    headerSize = 16;
  } else {
    size = compactSize;
  }

  if (size < headerSize || size > file.size - start) return null;

  return {
    end: start + size,
    headerSize,
    size,
    start,
    type,
  };
}

async function matchesIsoBrands(
  file: File,
  box: IsoBox,
  contentType: "video/mp4" | "video/quicktime",
): Promise<boolean> {
  const payloadSize = box.size - box.headerSize;
  if (
    box.size > maxFtypBoxBytes ||
    payloadSize < 8 ||
    (payloadSize - 8) % 4 !== 0
  ) {
    return false;
  }

  const bytes = await readFileBytes(file, box.start, box.size);
  if (bytes.length !== box.size) return false;

  const majorBrand = asciiFromBytes(bytes, box.headerSize, 4);
  const brands = [majorBrand];
  for (let offset = box.headerSize + 8; offset < bytes.length; offset += 4) {
    brands.push(asciiFromBytes(bytes, offset, 4));
  }

  if (contentType === "video/quicktime") {
    return majorBrand === "qt  " && brands.includes("qt  ");
  }

  return (
    majorBrand !== "qt  " &&
    !brands.includes("qt  ") &&
    brands.some(isMp4Brand)
  );
}

function isMp4Brand(brand: string): boolean {
  return (
    brand === "isom" ||
    brand === "avc1" ||
    brand === "M4V " ||
    brand === "mp41" ||
    brand === "mp42" ||
    /^iso[2-9]$/.test(brand)
  );
}

async function matchesWebmContainer(file: File): Promise<boolean> {
  const prefix = await readFileBytes(file, 0, maxEbmlHeaderBytes + 16);
  const ebmlHeader = readEbmlElement(prefix, 0);
  if (
    !ebmlHeader ||
    ebmlHeader.id !== webmEbmlHeaderId ||
    ebmlHeader.size === null ||
    ebmlHeader.size > maxEbmlHeaderBytes
  ) {
    return false;
  }

  const ebmlHeaderEnd = ebmlHeader.dataOffset + ebmlHeader.size;
  if (ebmlHeaderEnd > prefix.length || ebmlHeaderEnd >= file.size) return false;

  let childOffset = ebmlHeader.dataOffset;
  let sawWebmDocType = false;
  let headerElementCount = 0;
  while (childOffset < ebmlHeaderEnd) {
    headerElementCount += 1;
    if (headerElementCount > 64) return false;

    const child = readEbmlElement(prefix, childOffset);
    if (!child || child.size === null) return false;

    const childEnd = child.dataOffset + child.size;
    if (childEnd > ebmlHeaderEnd) return false;
    if (child.id === webmDocTypeId) {
      sawWebmDocType = asciiFromBytes(prefix, child.dataOffset, child.size) === "webm";
    }
    childOffset = childEnd;
  }

  if (!sawWebmDocType || childOffset !== ebmlHeaderEnd) return false;

  const segment = await readEbmlElementFromFile(file, ebmlHeaderEnd);
  if (!segment || segment.id !== webmSegmentId) return false;

  const segmentEnd =
    segment.size === null ? file.size : segment.dataOffset + segment.size;
  if (segment.dataOffset >= segmentEnd || segmentEnd !== file.size) return false;

  let offset = segment.dataOffset;
  let elementCount = 0;
  let sawTracks = false;
  let sawCluster = false;
  while (offset < segmentEnd) {
    elementCount += 1;
    if (elementCount > maxContainerElements) return false;

    const element = await readEbmlElementFromFile(file, offset);
    if (!element) return false;

    if (element.size === null) {
      if (element.id !== webmClusterId || element.dataOffset >= segmentEnd) {
        return false;
      }
      sawCluster = true;
      return sawTracks;
    }

    const elementEnd = element.dataOffset + element.size;
    if (elementEnd > segmentEnd) return false;

    if (element.id === webmTracksId && element.size > 0) sawTracks = true;
    if (element.id === webmClusterId && element.size > 0) sawCluster = true;
    offset = elementEnd;
  }

  return offset === segmentEnd && sawTracks && sawCluster;
}

async function readEbmlElementFromFile(
  file: File,
  offset: number,
): Promise<EbmlElement | null> {
  const bytes = await readFileBytes(file, offset, 12);
  const element = readEbmlElement(bytes, 0);
  if (!element) return null;

  return {
    dataOffset: offset + element.dataOffset,
    id: element.id,
    size: element.size,
  };
}

function readEbmlElement(bytes: Uint8Array, offset: number): EbmlElement | null {
  const id = readEbmlVint(bytes, offset, 4, true);
  if (!id || id.unknown || id.value > 0xffffffff) return null;

  const size = readEbmlVint(bytes, offset + id.width, 8, false);
  if (!size) return null;

  return {
    dataOffset: offset + id.width + size.width,
    id: id.value,
    size: size.unknown ? null : size.value,
  };
}

function readEbmlVint(
  bytes: Uint8Array,
  offset: number,
  maxWidth: number,
  preserveMarker: boolean,
): EbmlVint | null {
  const first = bytes[offset];
  if (first === undefined || first === 0) return null;

  let marker = 0x80;
  let width = 1;
  while (width <= maxWidth && (first & marker) === 0) {
    marker >>= 1;
    width += 1;
  }
  if (width > maxWidth || offset + width > bytes.length) return null;

  const strippedFirst = first & (marker - 1);
  const unknown =
    !preserveMarker &&
    strippedFirst === marker - 1 &&
    bytes
      .slice(offset + 1, offset + width)
      .every((byte) => byte === 0xff);
  if (unknown) {
    return { unknown: true, value: 0, width };
  }

  let value = preserveMarker ? first : strippedFirst;
  for (let index = 1; index < width; index += 1) {
    value = value * 256 + (bytes[offset + index] ?? 0);
    if (!Number.isSafeInteger(value)) return null;
  }

  return {
    unknown: false,
    value,
    width,
  };
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

async function readFileBytes(
  file: File,
  offset: number,
  length: number,
): Promise<Uint8Array> {
  return new Uint8Array(
    await file.slice(offset, Math.min(file.size, offset + length)).arrayBuffer(),
  );
}

function readUint32BigEndian(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) * 0x1000000) +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)
  );
}

function readUint64BigEndian(bytes: Uint8Array, offset: number): number | null {
  let value = 0;
  for (let index = 0; index < 8; index += 1) {
    value = value * 256 + (bytes[offset + index] ?? 0);
    if (!Number.isSafeInteger(value)) return null;
  }
  return value;
}

function asciiFromBytes(bytes: Uint8Array, offset: number, length: number): string {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    const byte = bytes[offset + index];
    if (byte === undefined) return "";
    value += String.fromCharCode(byte);
  }
  return value;
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
