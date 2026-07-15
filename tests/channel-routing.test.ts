import assert from "node:assert/strict";
import test from "node:test";

import {
  isChannelMicrositePath,
  isReservedChannelSlug,
} from "../src/lib/channel-routing";

test("the open landing is treated as a reserved site route", () => {
  assert.equal(isReservedChannelSlug("open"), true);
  assert.equal(isChannelMicrositePath("/open"), false);
});

test("channel microsite routes remain classified as channel routes", () => {
  assert.equal(isChannelMicrositePath("/boseong"), true);
  assert.equal(isChannelMicrositePath("/boseong/programs"), true);
  assert.equal(isChannelMicrositePath("/channels/boseong"), true);
});
