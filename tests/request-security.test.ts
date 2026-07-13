import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import { enforceSameOrigin } from "@/lib/api-security";
import { getConfirmedAuthEmail } from "@/lib/auth-email";
import {
  getLoginErrorMessage,
  getOAuthLoginErrorCode,
} from "@/lib/auth-errors";
import { createSocialProviders } from "@/lib/auth-providers";
import {
  isSafeRelativePath,
  trySanitizeHttpUrl,
  trySanitizePublicImageUrl,
} from "@/lib/url-security";

test("internal redirect validation rejects parser differentials", () => {
  for (const value of [
    "//attacker.example",
    "/\\attacker.example",
    "/safe\\attacker.example",
    "javascript:alert(1)",
    "/safe\u0000path",
  ]) {
    assert.equal(isSafeRelativePath(value), false, value);
  }

  assert.equal(isSafeRelativePath("/host/villages/demo?tab=home"), true);
  assert.equal(trySanitizeHttpUrl("javascript:alert(1)"), "");
  assert.equal(trySanitizePublicImageUrl("data:image/svg+xml,test"), "");
});

test("state-changing requests require same-origin evidence", () => {
  const sameOrigin = new Request("http://localhost:3000/api/test", {
    headers: { host: "localhost:3000", origin: "http://localhost:3000" },
  });
  const crossOrigin = new Request("http://localhost:3000/api/test", {
    headers: { host: "localhost:3000", origin: "https://attacker.example" },
  });
  const missingOrigin = new Request("http://localhost:3000/api/test", {
    headers: { host: "localhost:3000" },
  });
  const fetchMetadata = new Request("http://localhost:3000/api/test", {
    headers: { host: "localhost:3000", "sec-fetch-site": "same-origin" },
  });

  assert.equal(enforceSameOrigin(sameOrigin), null);
  assert.equal(enforceSameOrigin(crossOrigin)?.status, 403);
  assert.equal(enforceSameOrigin(missingOrigin)?.status, 403);
  assert.equal(enforceSameOrigin(fetchMetadata), null);
});

test("only confirmed Supabase email claims can activate invitations", () => {
  const baseUser = {
    app_metadata: { provider: "email" },
    email: "USER@EXAMPLE.COM",
    id: "00000000-0000-4000-8000-000000000001",
  } as User;

  assert.equal(getConfirmedAuthEmail(baseUser), "");
  assert.equal(
    getConfirmedAuthEmail({
      ...baseUser,
      email_confirmed_at: new Date(0).toISOString(),
    }),
    "user@example.com",
  );
});

test("OAuth callback errors recover through stable login messages", () => {
  assert.equal(
    getOAuthLoginErrorCode({
      error: "invalid_request",
      errorCode: "bad_oauth_state",
    }),
    "oauth_state",
  );
  assert.equal(
    getOAuthLoginErrorCode({ error: "access_denied" }),
    "oauth_cancelled",
  );
  assert.equal(
    getOAuthLoginErrorCode({ error: "server_error" }),
    "auth_callback",
  );
  assert.equal(getOAuthLoginErrorCode({}), null);
  assert.match(getLoginErrorMessage("oauth_state"), /다시 로그인/u);
  assert.equal(getLoginErrorMessage(undefined), "");
  assert.doesNotMatch(
    getLoginErrorMessage("<script>alert(1)</script>"),
    /script/u,
  );
});

test("optional social providers stay hidden until explicitly configured", () => {
  assert.deepEqual(
    createSocialProviders(undefined).map(({ key }) => key),
    ["google", "kakao"],
  );
  assert.deepEqual(
    createSocialProviders("custom:naver").map(({ key }) => key),
    ["google", "kakao", "naver"],
  );
  assert.deepEqual(
    createSocialProviders("naver").map(({ key }) => key),
    ["google", "kakao"],
  );
});
