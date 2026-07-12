import assert from "node:assert/strict";
import test from "node:test";
import {
  discoverApiRouteMethods,
  discoverSensitiveApiCases,
  type SensitiveApiCase,
} from "./security/api-access-matrix";

const stateChangingMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);

test("every protected namespace method is classified in the API access matrix", () => {
  const routeMethods = discoverApiRouteMethods();
  const cases = discoverSensitiveApiCases();
  const classified = new Set(
    cases.map((item) => `${item.route.replace("?refresh=1", "")}:${item.method}`),
  );
  const protectedMethods = routeMethods.filter((item) =>
    ["/api/admin/", "/api/cron/", "/api/host/", "/api/me/"].some((prefix) =>
      item.route.startsWith(prefix),
    ),
  );

  assert.ok(protectedMethods.length >= 80, "Protected API discovery unexpectedly shrank.");
  for (const item of protectedMethods) {
    assert.ok(
      classified.has(`${item.route}:${item.method}`),
      `Unclassified protected API: ${item.method} ${item.route}`,
    );
  }
});

test("sensitive API policies retain their role, cron, and OAuth guards", () => {
  for (const item of discoverSensitiveApiCases()) {
    if (item.policy === "admin") {
      assert.match(item.source, /requireAdminRole/u, describe(item));
    } else if (item.policy === "host") {
      assert.match(item.source, /requireHostRole|from\s+["']\.\.\/villages\/route["']/u, describe(item));
    } else if (item.policy === "member") {
      assert.match(
        item.source,
        /requireAuthenticatedUser|from\s+["']\.\.\/villages\/route["']/u,
        describe(item),
      );
    } else if (item.policy === "cron") {
      assert.match(item.source, /authorizeCronRequest/u, describe(item));
    } else {
      assert.match(item.source, /STATE_COOKIE/u, describe(item));
      assert.match(item.source, /parseState/u, describe(item));
      assert.match(item.source, /canAdminHostVillage/u, describe(item));
    }
  }
});

test("state-changing sensitive APIs enforce same-origin before mutation", () => {
  for (const item of discoverSensitiveApiCases()) {
    if (!stateChangingMethods.has(item.method) || item.policy === "cron") continue;
    assert.match(
      item.source,
      /enforceSameOrigin|from\s+["']\.\.\/villages\/route["']/u,
      describe(item),
    );
  }
});

test("multipart upload routes enforce request and decoded-file limits", () => {
  const uploadCases = discoverSensitiveApiCases().filter((item) =>
    /request\.formData\(\)/u.test(item.source),
  );

  assert.ok(uploadCases.length >= 6, "Upload API discovery unexpectedly shrank.");
  for (const item of uploadCases) {
    assert.match(item.source, /enforceContentLength/u, describe(item));
    assert.match(
      item.source,
      /validateImageUploadFile|validateMediaUploadFile/u,
      describe(item),
    );
  }
});

function describe(item: SensitiveApiCase): string {
  return `${item.method} ${item.route} (${item.sourcePath})`;
}
