const allowedImageTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function validateImageUploadFile(
  file: File,
  options: { maxBytes: number },
): Promise<void> {
  if (file.size > options.maxBytes) {
    throw new Error("Images must be 5MB or smaller.");
  }

  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Only JPG, PNG, WebP, and GIF images can be uploaded.");
  }

  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesImageSignature(file.type, signature)) {
    throw new Error("The uploaded file does not match its image type.");
  }
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
