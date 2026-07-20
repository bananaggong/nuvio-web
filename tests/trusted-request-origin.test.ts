import assert from "node:assert/strict";
import test from "node:test";
import { resolveTrustedRequestOrigin } from "../src/lib/trusted-request-origin-policy";

const canonicalOrigin = "https://nuvio.kr";

test("preview requests keep their exact runtime Vercel origin", () => {
  const environment = {
    NODE_ENV: "production",
    VERCEL_BRANCH_URL: "nuvio-web-git-feature-team.vercel.app",
    VERCEL_ENV: "preview",
    VERCEL_URL: "https://nuvio-web-abc-team.vercel.app",
  };

  assert.equal(
    resolveTrustedRequestOrigin(
      new URL("https://nuvio-web-abc-team.vercel.app/auth/callback"),
      canonicalOrigin,
      environment,
    ),
    "https://nuvio-web-abc-team.vercel.app",
  );
  assert.equal(
    resolveTrustedRequestOrigin(
      new URL("https://nuvio-web-git-feature-team.vercel.app/auth/callback"),
      canonicalOrigin,
      environment,
    ),
    "https://nuvio-web-git-feature-team.vercel.app",
  );
});

test("preview origin policy rejects lookalikes and non-HTTPS requests", () => {
  const environment = {
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    VERCEL_URL: "nuvio-web-abc-team.vercel.app",
  };

  for (const url of [
    "https://nuvio-web-abc-team.vercel.app.evil.example/auth/callback",
    "https://nuvio-web-abc-team-vercel.app/auth/callback",
    "https://nuvio-web-abc-team.vercel.app:8443/auth/callback",
    "http://nuvio-web-abc-team.vercel.app/auth/callback",
  ]) {
    assert.equal(
      resolveTrustedRequestOrigin(new URL(url), canonicalOrigin, environment),
      canonicalOrigin,
      url,
    );
  }
});

test("production requests always use the canonical origin", () => {
  assert.equal(
    resolveTrustedRequestOrigin(
      new URL("https://nuvio-web-abc-team.vercel.app/auth/callback"),
      canonicalOrigin,
      {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        VERCEL_URL: "nuvio-web-abc-team.vercel.app",
      },
    ),
    canonicalOrigin,
  );
});

test("local development keeps loopback request origins", () => {
  for (const url of [
    "http://localhost:3000/auth/callback",
    "http://127.0.0.1:3001/auth/callback",
    "http://[::1]:3002/auth/callback",
  ]) {
    const requestUrl = new URL(url);
    assert.equal(
      resolveTrustedRequestOrigin(requestUrl, canonicalOrigin, {
        NODE_ENV: "development",
      }),
      requestUrl.origin,
      url,
    );
  }

  assert.equal(
    resolveTrustedRequestOrigin(
      new URL("https://untrusted.example/auth/callback"),
      canonicalOrigin,
      { NODE_ENV: "development" },
    ),
    canonicalOrigin,
  );
});
