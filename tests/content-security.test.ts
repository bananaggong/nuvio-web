import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeMagazineHtml } from "@/lib/magazine-content";
import { sanitizeVillagePageContent } from "@/lib/village-page-cms";

test("TipTap HTML removes executable markup and unsafe URLs", () => {
  const sanitized = sanitizeMagazineHtml(`
    <script>alert(1)</script>
    <p onclick="alert(1)" style="background-image:url(javascript:alert(1));text-align:center">Safe text</p>
    <a href="javascript:alert(1)" target="_blank">bad link</a>
    <a href="/programs" target="_blank">safe link</a>
    <img src="https://attacker.example/payload.svg" onerror="alert(1)">
    <img src="/brand/nuvio-social-preview.png" alt="safe">
  `);

  assert.doesNotMatch(sanitized, /<script|onclick|onerror|javascript:|attacker\.example/iu);
  assert.match(sanitized, /href="\/programs"/u);
  assert.match(sanitized, /rel="noopener noreferrer"/u);
  assert.match(sanitized, /src="\/brand\/nuvio-social-preview\.png"/u);
});

test("village CMS JSON sanitizes nested links and image fields", () => {
  const sanitized = sanitizeVillagePageContent({
    href: "javascript:alert(1)",
    imageUrl: "https://attacker.example/image.png",
    nested: [
      { href: "/boseong/media", iconSrc: "/icons/nuvio/menu.svg" },
      { linkHref: "/\\attacker.example" },
    ],
    title: "Safe title",
  });

  assert.equal(sanitized.href, "");
  assert.equal(sanitized.imageUrl, "");
  assert.equal(sanitized.title, "Safe title");
  assert.deepEqual(sanitized.nested, [
    { href: "/boseong/media", iconSrc: "/icons/nuvio/menu.svg" },
    { linkHref: "" },
  ]);
});
