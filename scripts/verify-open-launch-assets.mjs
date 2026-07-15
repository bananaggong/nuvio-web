import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assetDirectory = path.join(root, "public", "images", "open");
const bannerPath = path.join(assetDirectory, "open-hero-banner.webp");
const segmentHeights = [716, 1784, 2587, 1586, 2745, 1448];
const expectedBannerHash =
  "abeee3282cb714bc3c210fcfc0d153396d9c7e7df94645b0422b4399a419e755";
const expectedLandingHash =
  "3e0b9726536256754ab2032494a037e98ac56d1b80321a94c6e7c451136a1322";

const bannerMetadata = await sharp(bannerPath).metadata();
assert.equal(bannerMetadata.format, "webp");
assert.equal(bannerMetadata.width, 1074);
assert.equal(bannerMetadata.height, 420);

const bannerHash = hash(await decodedRgba(bannerPath));
assert.equal(
  bannerHash,
  expectedBannerHash,
  "Frame 48 decoded pixels no longer match the Figma source",
);

const landingHash = createHash("sha256");

for (const [index, expectedHeight] of segmentHeights.entries()) {
  const fileName = `open-landing-${String(index + 1).padStart(2, "0")}.webp`;
  const filePath = path.join(assetDirectory, fileName);
  const metadata = await sharp(filePath).metadata();

  assert.equal(metadata.format, "webp", `${fileName} must be WebP`);
  assert.equal(metadata.width, 1074, `${fileName} must be 1074px wide`);
  assert.equal(
    metadata.height,
    expectedHeight,
    `${fileName} has an unexpected height`,
  );

  landingHash.update(await decodedRgba(filePath));
}

assert.equal(
  segmentHeights.reduce((sum, height) => sum + height, 0),
  10866,
  "Frame 34 segment heights must total 10866px",
);
assert.equal(
  landingHash.digest("hex"),
  expectedLandingHash,
  "Frame 34 decoded pixels no longer match the Figma source",
);

console.log(
  "Open launch assets verified: Frame 48 1074x420, Frame 34 1074x10866, decoded pixel hashes match Figma.",
);

async function decodedRgba(filePath) {
  return sharp(filePath).ensureAlpha().raw().toBuffer();
}

function hash(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
