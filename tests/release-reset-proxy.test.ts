import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import {
  config,
  isNaverUserInfoAdapterPath,
  isProtectedMypagePath,
  isReleaseResetAllowedPath,
  proxy,
} from "../src/proxy";

const RESET_ENV_NAMES = [
  "NUVIO_RELEASE_RESET_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function snapshotEnvironment(): Map<string, string | undefined> {
  return new Map(RESET_ENV_NAMES.map((name) => [name, process.env[name]]));
}

function restoreEnvironment(snapshot: Map<string, string | undefined>) {
  for (const [name, value] of snapshot) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

function clearSupabasePublicConfig() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

test("release reset allowlist is exact", () => {
  for (const pathname of [
    "/",
    "/open",
    "/open/",
    "/magazine",
    "/magazine/",
    "/magazine/preserved-post",
    "/brand/nuvio-wordmark.svg",
    "/icons/nuvio/header-action-frame.svg",
    "/icons/nuvio/user.svg",
    "/images/open/open-hero-banner.webp",
    "/images/open/open-landing-06.webp",
  ]) {
    assert.equal(isReleaseResetAllowedPath(pathname), true, pathname);
  }

  for (const pathname of [
    "/api/programs",
    "/api/auth/naver/userinfo",
    "/api/cron/process-scheduled-messages",
    "/admin",
    "/auth/callback",
    "/host",
    "/login",
    "/open/details",
    "/brand/not-a-static-asset.svg",
    "/images/open/not-a-preserved-asset.webp",
    "/magazine-admin",
    "/magazines",
    "/programs/deleted.webp",
    "/robots.txt",
    "/signup",
    "/sitemap.xml",
  ]) {
    assert.equal(isReleaseResetAllowedPath(pathname), false, pathname);
  }
});

test("release reset mode returns an uncacheable 503 for blocked routes", async () => {
  const snapshot = snapshotEnvironment();

  try {
    process.env.NUVIO_RELEASE_RESET_MODE = "1";
    clearSupabasePublicConfig();

    for (const pathname of [
      "/api/auth/session",
      "/api/auth/naver/userinfo",
      "/api/cron/process-scheduled-messages",
      "/admin",
      "/auth/callback",
      "/host",
      "/login",
      "/robots.txt",
      "/signup",
      "/sitemap.xml",
    ]) {
      const response = await proxy(new NextRequest(`https://nuvio.kr${pathname}`));

      assert.equal(response.status, 503, pathname);
      assert.equal(response.headers.get("cache-control"), "no-store", pathname);
      assert.equal(response.headers.get("retry-after"), "300", pathname);
      assert.deepEqual(await response.json(), {
        error: "release_reset_in_progress",
      });
    }
  } finally {
    restoreEnvironment(snapshot);
  }
});

test("Naver userinfo adapter pass-through matches only the exact path", () => {
  assert.equal(isNaverUserInfoAdapterPath("/api/auth/naver/userinfo"), true);

  for (const pathname of [
    "/api/auth/naver/userinfo/",
    "/api/auth/naver/userinfo-extra",
    "/api/auth/naver",
  ]) {
    assert.equal(isNaverUserInfoAdapterPath(pathname), false, pathname);
  }
});

test("mypage protection matches only the mypage route tree", () => {
  for (const pathname of [
    "/mypage",
    "/mypage/",
    "/mypage/messages",
    "/mypage/member-information/edit",
  ]) {
    assert.equal(isProtectedMypagePath(pathname), true, pathname);
  }

  for (const pathname of ["/", "/mypageish", "/support"]) {
    assert.equal(isProtectedMypagePath(pathname), false, pathname);
  }
});

test("anonymous mypage requests redirect to login with the exact next path", async () => {
  const snapshot = snapshotEnvironment();

  try {
    process.env.NUVIO_RELEASE_RESET_MODE = "0";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

    const response = await proxy(
      new NextRequest(
        "https://nuvio.kr/mypage/messages?programId=program-1&hostName=%EA%B0%80%EC%9D%B4%EB%93%9C",
      ),
    );

    assert.equal(response.status, 307);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(location.pathname, "/login");
    assert.equal(
      location.searchParams.get("next"),
      "/mypage/messages?programId=program-1&hostName=%EA%B0%80%EC%9D%B4%EB%93%9C",
    );
  } finally {
    restoreEnvironment(snapshot);
  }
});

test("anonymous support requests remain public", async () => {
  const snapshot = snapshotEnvironment();

  try {
    process.env.NUVIO_RELEASE_RESET_MODE = "0";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

    const response = await proxy(
      new NextRequest("https://nuvio.kr/support"),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");
  } finally {
    restoreEnvironment(snapshot);
  }
});

test("release reset matcher does not bypass generated metadata routes", () => {
  const matcher = config.matcher.join("\n");

  assert.doesNotMatch(matcher, /robots\.txt/u);
  assert.doesNotMatch(matcher, /sitemap\.xml/u);
  assert.doesNotMatch(matcher, /svg\|png|jpg\|jpeg|webp/u);
});

test("release reset mode lets preserved routes continue through Proxy", async () => {
  const snapshot = snapshotEnvironment();

  try {
    process.env.NUVIO_RELEASE_RESET_MODE = "1";
    clearSupabasePublicConfig();

    for (const pathname of ["/", "/open", "/magazine", "/magazine/post-id"]) {
      const response = await proxy(new NextRequest(`https://nuvio.kr${pathname}`));

      assert.equal(response.status, 200, pathname);
      assert.equal(response.headers.get("x-middleware-next"), "1", pathname);
    }
  } finally {
    restoreEnvironment(snapshot);
  }
});

test("preserved routes do not refresh Supabase sessions during a reset", async () => {
  const snapshot = snapshotEnvironment();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  try {
    process.env.NUVIO_RELEASE_RESET_MODE = "1";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    globalThis.fetch = async () => {
      fetchCalls += 1;
      throw new Error("Supabase must not be called during a release reset.");
    };

    const response = await proxy(new NextRequest("https://nuvio.kr/magazine"));

    assert.equal(response.status, 200);
    assert.equal(fetchCalls, 0);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(snapshot);
  }
});

test("normal Proxy behavior is unchanged when release reset mode is off", async () => {
  const snapshot = snapshotEnvironment();

  try {
    process.env.NUVIO_RELEASE_RESET_MODE = "0";
    clearSupabasePublicConfig();

    const response = await proxy(
      new NextRequest("https://nuvio.kr/api/auth/session"),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");
  } finally {
    restoreEnvironment(snapshot);
  }
});

test("Naver userinfo adapter bypasses Supabase session refresh outside reset mode", async () => {
  const snapshot = snapshotEnvironment();

  try {
    process.env.NUVIO_RELEASE_RESET_MODE = "0";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

    const response = await proxy(
      new NextRequest("https://nuvio.kr/api/auth/naver/userinfo", {
        headers: { Authorization: "Bearer provider-access-token" },
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    restoreEnvironment(snapshot);
  }
});
