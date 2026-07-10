import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  validateImageUploadFile,
  validateMediaUploadFile,
} from "../src/lib/image-upload-security.ts";

const mediaLimits = {
  maxImageBytes: 8 * 1024 * 1024,
  maxVideoBytes: 50 * 1024 * 1024,
};

test("image validation inspects dimensions and animation frames", async () => {
  const png = await sharp({
    create: {
      background: { alpha: 1, b: 0, g: 0, r: 255 },
      channels: 4,
      height: 2,
      width: 2,
    },
  })
    .png()
    .toBuffer();

  const validated = await validateImageUploadFile(
    uploadFile(png, "image/png", "safe.png"),
    { maxBytes: 1024 },
  );
  assert.equal(validated.extension, "png");

  await assert.rejects(
    validateImageUploadFile(uploadFile(png, "image/png", "wide.png"), {
      maxBytes: 1024,
      maxWidth: 1,
    }),
    /cannot exceed 1x12000 pixels/,
  );

  const animatedPixels = Buffer.from([
    255, 0, 0, 255,
    0, 0, 255, 255,
  ]);
  const animatedGif = await sharp(animatedPixels, {
    raw: { channels: 4, height: 2, pageHeight: 1, width: 1 },
  })
    .gif({ delay: [10, 10], loop: 0 })
    .toBuffer();

  await assert.rejects(
    validateImageUploadFile(
      uploadFile(animatedGif, "image/gif", "animated.gif"),
      { maxBytes: 1024, maxFrames: 1 },
    ),
    /cannot exceed 1 frames/,
  );
});

test("image validation rejects a signature-only truncated image", async () => {
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  await assert.rejects(
    validateImageUploadFile(
      uploadFile(pngSignature, "image/png", "truncated.png"),
      { maxBytes: 1024 },
    ),
    /malformed or exceeds safe dimensions/,
  );
});

test("image validation rejects data that has metadata but cannot fully decode", async () => {
  const jpeg = await sharp({
    create: {
      background: { b: 40, g: 80, r: 120 },
      channels: 3,
      height: 64,
      width: 64,
    },
  })
    .jpeg()
    .toBuffer();
  const truncated = jpeg.subarray(0, jpeg.length - 1);

  await sharp(truncated, { failOn: "error" }).metadata();
  await assert.rejects(
    validateImageUploadFile(
      uploadFile(truncated, "image/jpeg", "truncated-after-header.jpg"),
      { maxBytes: 1024 },
    ),
    /malformed or cannot be fully decoded/,
  );
});

test("ISO BMFF validation distinguishes MP4 and QuickTime brands", async () => {
  const mp4 = isoMediaFile("isom", ["isom", "mp41"]);
  const mov = isoMediaFile("qt  ", ["qt  "]);

  assert.equal(
    (
      await validateMediaUploadFile(
        uploadFile(mp4, "video/mp4", "video.mp4"),
        mediaLimits,
      )
    ).extension,
    "mp4",
  );
  assert.equal(
    (
      await validateMediaUploadFile(
        uploadFile(mov, "video/quicktime", "video.mov"),
        mediaLimits,
      )
    ).extension,
    "mov",
  );

  await assert.rejects(
    validateMediaUploadFile(
      uploadFile(mov, "video/mp4", "spoofed.mp4"),
      mediaLimits,
    ),
    /malformed, truncated, or does not match/,
  );
  await assert.rejects(
    validateMediaUploadFile(
      uploadFile(mp4, "video/quicktime", "spoofed.mov"),
      mediaLimits,
    ),
    /malformed, truncated, or does not match/,
  );
});

test("ISO BMFF validation rejects a truncated declared box", async () => {
  const truncated = Buffer.concat([
    ftypBox("isom", ["isom", "mp41"]),
    isoBox("moov", Buffer.from([0])),
    uint32(32),
    Buffer.from("mdat", "ascii"),
    Buffer.from([1]),
  ]);

  await assert.rejects(
    validateMediaUploadFile(
      uploadFile(truncated, "video/mp4", "truncated.mp4"),
      mediaLimits,
    ),
    /malformed, truncated, or does not match/,
  );
});

test("WebM validation requires the webm doctype and complete segment elements", async () => {
  const webm = webmFile("webm");
  const matroska = webmFile("matroska");

  assert.equal(
    (
      await validateMediaUploadFile(
        uploadFile(webm, "video/webm", "video.webm"),
        mediaLimits,
      )
    ).extension,
    "webm",
  );

  await assert.rejects(
    validateMediaUploadFile(
      uploadFile(matroska, "video/webm", "matroska.webm"),
      mediaLimits,
    ),
    /malformed, truncated, or does not match/,
  );

  const truncatedTrack = Buffer.concat([
    Buffer.from([0x16, 0x54, 0xae, 0x6b, 0x85, 0x00]),
    ebmlElement([0x1f, 0x43, 0xb6, 0x75], Buffer.from([0])),
  ]);
  const truncatedWebm = Buffer.concat([
    ebmlElement(
      [0x1a, 0x45, 0xdf, 0xa3],
      ebmlElement([0x42, 0x82], Buffer.from("webm", "ascii")),
    ),
    ebmlElement([0x18, 0x53, 0x80, 0x67], truncatedTrack),
  ]);

  await assert.rejects(
    validateMediaUploadFile(
      uploadFile(truncatedWebm, "video/webm", "truncated.webm"),
      mediaLimits,
    ),
    /malformed, truncated, or does not match/,
  );
});

function uploadFile(bytes, type, name) {
  return new File([bytes], name, { type });
}

function isoMediaFile(majorBrand, compatibleBrands) {
  return Buffer.concat([
    ftypBox(majorBrand, compatibleBrands),
    isoBox("moov", Buffer.from([0])),
    isoBox("mdat", Buffer.from([1])),
  ]);
}

function ftypBox(majorBrand, compatibleBrands) {
  return isoBox(
    "ftyp",
    Buffer.concat([
      Buffer.from(majorBrand, "ascii"),
      uint32(0),
      ...compatibleBrands.map((brand) => Buffer.from(brand, "ascii")),
    ]),
  );
}

function isoBox(type, payload) {
  return Buffer.concat([
    uint32(payload.length + 8),
    Buffer.from(type, "ascii"),
    payload,
  ]);
}

function uint32(value) {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(value);
  return bytes;
}

function webmFile(docType) {
  const header = ebmlElement(
    [0x1a, 0x45, 0xdf, 0xa3],
    ebmlElement([0x42, 0x82], Buffer.from(docType, "ascii")),
  );
  const segment = ebmlElement(
    [0x18, 0x53, 0x80, 0x67],
    Buffer.concat([
      ebmlElement([0x16, 0x54, 0xae, 0x6b], Buffer.from([0])),
      ebmlElement([0x1f, 0x43, 0xb6, 0x75], Buffer.from([0])),
    ]),
  );
  return Buffer.concat([header, segment]);
}

function ebmlElement(id, payload) {
  assert.ok(payload.length < 127, "Test EBML fixture must use a one-byte size.");
  return Buffer.concat([
    Buffer.from(id),
    Buffer.from([0x80 | payload.length]),
    payload,
  ]);
}
