import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/auth/naver/userinfo/route";

function requestWithAuthorization(value: string | null, clientIp?: string): Request {
  return {
    headers: {
      get(name: string) {
        const normalizedName = name.toLowerCase();
        if (normalizedName === "authorization") return value;
        if (normalizedName === "x-forwarded-for") return clientIp ?? null;
        return null;
      },
    },
  } as unknown as Request;
}

function assertPrivateNoStore(response: Response) {
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("pragma"), "no-cache");
}

test("Naver userinfo adapter rejects malformed bearer credentials without fetching", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  try {
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error("fetch must not be called");
    }) as typeof fetch;

    for (const authorization of [
      null,
      "",
      "Basic abc",
      "Bearer",
      "Bearer token with spaces",
      "Bearer caf\u00e9",
      "Bearer abc\u0000def",
      `Bearer ${"a".repeat(4_097)}`,
    ]) {
      const response = await GET(requestWithAuthorization(authorization));
      assert.equal(response.status, 401, String(authorization));
      assertPrivateNoStore(response);
      assert.deepEqual(await response.json(), { error: "unauthorized" });
    }

    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Naver userinfo adapter flattens only the stable subject and verified email", async () => {
  const originalFetch = globalThis.fetch;
  let observedUrl = "";
  let observedInit: RequestInit | undefined;

  try {
    globalThis.fetch = (async (input, init) => {
      observedUrl = String(input);
      observedInit = init;
      return Response.json({
        message: "success",
        response: {
          email: "Member@Naver.com ",
          id: "naver-member-id",
          mobile: "010-1234-5678",
          name: "Private Name",
          profile_image: "https://example.com/private.jpg",
        },
        resultcode: "00",
      });
    }) as typeof fetch;

    const response = await GET(requestWithAuthorization("Bearer access-token_123"));

    assert.equal(observedUrl, "https://openapi.naver.com/v1/nid/me");
    assert.equal(observedInit?.method, "GET");
    assert.equal(observedInit?.cache, "no-store");
    assert.equal(observedInit?.redirect, "error");
    assert.ok(observedInit?.signal instanceof AbortSignal);
    const outboundHeaders = new Headers(observedInit?.headers);
    assert.equal(outboundHeaders.get("accept"), "application/json");
    assert.equal(outboundHeaders.get("authorization"), "Bearer access-token_123");
    assert.equal(response.status, 200);
    assertPrivateNoStore(response);
    assert.deepEqual(await response.json(), {
      email: "member@naver.com",
      email_verified: true,
      sub: "naver-member-id",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Naver userinfo adapter returns generic failures for invalid upstream responses", async () => {
  const originalFetch = globalThis.fetch;
  const cases: Array<{ expectedStatus: number; response: Response }> = [
    {
      expectedStatus: 401,
      response: Response.json({ message: "invalid token" }, { status: 401 }),
    },
    {
      expectedStatus: 502,
      response: Response.json({ message: "server failure" }, { status: 500 }),
    },
    {
      expectedStatus: 401,
      response: Response.json({ resultcode: "024" }),
    },
    {
      expectedStatus: 502,
      response: new Response("not-json", { status: 200 }),
    },
    {
      expectedStatus: 502,
      response: Response.json({ response: { email: "member@naver.com" }, resultcode: "00" }),
    },
    {
      expectedStatus: 502,
      response: Response.json({ response: { id: "naver-member-id" }, resultcode: "00" }),
    },
    {
      expectedStatus: 502,
      response: new Response("x".repeat(16 * 1024 + 1), { status: 200 }),
    },
  ];

  try {
    for (const item of cases) {
      globalThis.fetch = (async () => item.response) as typeof fetch;
      const response = await GET(requestWithAuthorization("Bearer access-token"));

      assert.equal(response.status, item.expectedStatus);
      assertPrivateNoStore(response);
      assert.deepEqual(await response.json(), {
        error: item.expectedStatus === 401 ? "unauthorized" : "upstream_unavailable",
      });
    }

    globalThis.fetch = (async () => {
      throw new DOMException("timed out", "TimeoutError");
    }) as typeof fetch;
    const timeoutResponse = await GET(requestWithAuthorization("Bearer access-token"));
    assert.equal(timeoutResponse.status, 502);
    assertPrivateNoStore(timeoutResponse);
    assert.deepEqual(await timeoutResponse.json(), { error: "upstream_unavailable" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Naver userinfo adapter rate limits repeated valid-looking credentials", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  try {
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return Response.json({ message: "invalid token" }, { status: 401 });
    }) as typeof fetch;

    for (let attempt = 1; attempt <= 61; attempt += 1) {
      const response = await GET(
        requestWithAuthorization("Bearer provider-access-token", "198.51.100.240"),
      );

      assert.equal(response.status, attempt <= 60 ? 401 : 429, String(attempt));
      assertPrivateNoStore(response);
      if (attempt === 61) {
        assert.equal(response.headers.get("x-ratelimit-remaining"), "0");
        assert.equal(response.headers.get("retry-after"), "60");
      }
    }

    assert.equal(fetchCalls, 60);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Naver userinfo route exposes GET only", async () => {
  const routeModule = await import("../src/app/api/auth/naver/userinfo/route");
  assert.equal(typeof routeModule.GET, "function");
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.equal(method in routeModule, false, method);
  }
});
