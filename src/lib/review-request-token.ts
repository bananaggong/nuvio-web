import { createHash, randomBytes } from "node:crypto";

const reviewRequestTokenBytes = 32;
const reviewRequestTokenPattern = /^[A-Za-z0-9_-]{32,256}$/u;

export type ReviewRequestPlainToken = {
  hash: string;
  token: string;
};

export function createReviewRequestToken(): ReviewRequestPlainToken {
  const token = randomBytes(reviewRequestTokenBytes).toString("base64url");
  return {
    hash: hashReviewRequestToken(token) ?? "",
    token,
  };
}

export function hashReviewRequestToken(value: unknown): string | null {
  const token = normalizeReviewRequestToken(value);
  if (!token) return null;

  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function normalizeReviewRequestToken(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const token = value.trim();
  if (!reviewRequestTokenPattern.test(token)) return null;

  return token;
}
