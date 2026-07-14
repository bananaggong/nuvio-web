import assert from "node:assert/strict";
import test from "node:test";
import {
  formatKoreanMobilePhone,
  formatKoreanMobilePhoneInput,
  normalizeKoreanMobilePhone,
} from "../src/lib/korean-mobile-phone";

test("normalizes supported Korean mobile phone input", () => {
  assert.equal(normalizeKoreanMobilePhone("01011112222"), "01011112222");
  assert.equal(normalizeKoreanMobilePhone("010-1111-2222"), "01011112222");
  assert.equal(normalizeKoreanMobilePhone("+82 10-1111-2222"), "01011112222");
});

test("rejects invalid or ambiguous phone input", () => {
  assert.equal(normalizeKoreanMobilePhone("asdf"), null);
  assert.equal(normalizeKoreanMobilePhone("asdf01011112222"), null);
  assert.equal(normalizeKoreanMobilePhone("010-123-4567"), null);
  assert.equal(normalizeKoreanMobilePhone("011-1111-2222"), null);
});

test("formats storage and interactive display consistently", () => {
  assert.equal(formatKoreanMobilePhone("01011112222"), "010-1111-2222");
  assert.equal(formatKoreanMobilePhoneInput("01011112222"), "010-1111-2222");
  assert.equal(formatKoreanMobilePhoneInput("0101111"), "010-1111");
  assert.equal(formatKoreanMobilePhoneInput("010-11ab"), "010-11");
});
