import { Buffer } from "node:buffer";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import sharp from "sharp";
import {
  discoverSensitiveApiCases,
  type HttpMethod,
  type SensitiveApiCase,
  type SensitiveApiPolicy,
} from "../../security/api-access-matrix";
import { createReleaseE2ESql } from "../release/support/database";
import {
  readSecurityE2EState,
  type SecurityAccountKey,
  type SecurityE2EAccount,
  type SecurityE2EState,
} from "./support/state";

const e2ePort = Number(process.env.NUVIO_SECURITY_E2E_PORT ?? "3102");
const origin = `http://127.0.0.1:${e2ePort}`;
const attackerOrigin = "https://attacker.example";
const stateChangingMethods = new Set<HttpMethod>(["POST", "PATCH", "PUT", "DELETE"]);

test.describe.serial("release security boundaries", () => {
  test("establishes isolated sessions for every access-matrix role", async ({ browser }) => {
    const state = await readSecurityE2EState();
    for (const key of accountKeys()) {
      const account = state.accounts[key];
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await loginWithEmail(page, account);
        await page.context().storageState({ path: account.storagePath });
      } finally {
        await context.close();
      }
    }

    const adminContext = await browser.newContext({ storageState: state.accounts.admin.storagePath });
    const hostContext = await browser.newContext({ storageState: state.accounts.hostA.storagePath });
    const memberContext = await browser.newContext({ storageState: state.accounts.memberA.storagePath });
    try {
      await expectGetStatusWithRetry(adminContext.request, "/api/implementation-status", 200);
      await expectGetStatusWithRetry(hostContext.request, "/api/host/applications", 200);
      await expectGetStatusWithRetry(memberContext.request, "/api/me/applications", 200);
    } finally {
      await Promise.all([adminContext.close(), hostContext.close(), memberContext.close()]);
    }
  });

  test("enforces 401 and 403 across every sensitive API policy", async ({ browser }) => {
    const state = await readSecurityE2EState();
    const contexts = {
      anonymous: await browser.newContext(),
      hostA: await browser.newContext({ storageState: state.accounts.hostA.storagePath }),
      hostB: await browser.newContext({ storageState: state.accounts.hostB.storagePath }),
      memberA: await browser.newContext({ storageState: state.accounts.memberA.storagePath }),
    };

    try {
      const cases = discoverSensitiveApiCases().filter(
        (item) => item.policy !== "oauth-callback",
      );
      expect(cases.length).toBeGreaterThanOrEqual(90);

      for (const item of cases) {
        const expectations = deniedRoleExpectations(item.policy);
        for (const [actor, expectedStatus] of expectations) {
          const response = await sendMatrixRequest(contexts[actor].request, item);
          expect(
            response.status(),
            `${actor} ${item.method} ${item.requestPath}: ${await response.text()}`,
          ).toBe(item.preAuthStatus ?? expectedStatus);
        }
      }
    } finally {
      await Promise.all(Object.values(contexts).map((context) => context.close()));
    }
  });

  test("blocks member and cross-tenant host IDOR without changing protected rows", async ({
    browser,
  }) => {
    const state = await readSecurityE2EState();
    const memberA = await browser.newContext({ storageState: state.accounts.memberA.storagePath });
    const memberB = await browser.newContext({ storageState: state.accounts.memberB.storagePath });
    const hostA = await browser.newContext({ storageState: state.accounts.hostA.storagePath });
    const hostB = await browser.newContext({ storageState: state.accounts.hostB.storagePath });
    const admin = await browser.newContext({ storageState: state.accounts.admin.storagePath });

    try {
      await assertOwnedLists(memberA.request, state, "A");
      await assertOwnedLists(memberB.request, state, "B");

      const reviewPatch = await memberB.request.patch(
        `/api/me/reviews/${state.tenantA.reviewId}`,
        {
          data: {
            body: `${state.prefix} unauthorized review mutation attempt`,
            category: "trip",
            images: [],
            rating: 1,
          },
          headers: { Origin: origin },
        },
      );
      expect(reviewPatch.status()).toBe(403);

      const memberMessage = await memberB.request.post(
        `/api/me/inquiries/${state.tenantA.inquiryId}/messages`,
        {
          data: { message: `${state.prefix} unauthorized member message` },
          headers: { Origin: origin },
        },
      );
      expect(memberMessage.status()).toBe(404);

      const hostApplications = await hostB.request.get("/api/host/applications");
      expect(hostApplications.status()).toBe(200);
      const hostApplicationPayload = (await hostApplications.json()) as {
        data?: Array<{ id: string }>;
      };
      expect(hostApplicationPayload.data?.some((item) => item.id === state.tenantB.applicationId)).toBe(true);
      expect(hostApplicationPayload.data?.some((item) => item.id === state.tenantA.applicationId)).toBe(false);

      expect(
        (await hostB.request.get(`/api/host/applications/${state.tenantA.applicationId}`)).status(),
      ).toBe(404);
      expect(
        (
          await hostB.request.patch(`/api/host/applications/${state.tenantA.applicationId}`, {
            data: { status: "rejected" },
            headers: { Origin: origin },
          })
        ).status(),
      ).toBe(404);

      const crossTenantPrograms = await hostB.request.get(
        `/api/host/programs?villageId=${state.tenantA.villageId}`,
      );
      expect(crossTenantPrograms.status()).toBe(200);
      const crossTenantProgramPayload = (await crossTenantPrograms.json()) as {
        data?: Array<{ id: string }>;
      };
      expect(crossTenantProgramPayload.data ?? []).toHaveLength(0);
      expect(
        (
          await hostB.request.delete(`/api/host/programs/${state.tenantA.programId}`, {
            data: {},
            headers: { Origin: origin },
          })
        ).status(),
      ).toBe(404);

      expect(
        (
          await hostB.request.get(
            `/api/host/channel-board-posts?villageSlug=${state.tenantA.villageSlug}`,
          )
        ).status(),
      ).toBe(403);
      expect(
        (
          await hostB.request.get(
            `/api/host/media?villageSlug=${state.tenantA.villageSlug}`,
          )
        ).status(),
      ).toBe(403);
      expect(
        (
          await hostB.request.get(
            `/api/host/village-pages/sections?villageSlug=${state.tenantA.villageSlug}&pageKey=home`,
          )
        ).status(),
      ).toBe(403);
      expect(
        (
          await hostB.request.post("/api/host/villages", {
            data: {
              name: state.tenantA.villageName,
              slug: state.tenantA.villageSlug,
            },
            headers: { Origin: origin },
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await hostB.request.post("/api/host/channel-board-posts", {
            data: {
              operation: "upsert",
              post: {
                body: `<p>${state.prefix} unauthorized board mutation</p>`,
                createdAt: new Date().toISOString(),
                id: state.boardPostId,
                pinned: false,
                title: `${state.prefix} Unauthorized Board`,
              },
              villageSlug: state.tenantA.villageSlug,
            },
            headers: { Origin: origin },
          })
        ).status(),
      ).toBe(403);

      expect(
        (
          await hostB.request.get(
            `/api/host/inquiries?programId=${state.tenantA.programId}`,
          )
        ).status(),
      ).toBe(403);
      expect(
        (
          await hostB.request.patch(`/api/host/inquiries/${state.tenantA.inquiryId}`, {
            data: { status: "answered" },
            headers: { Origin: origin },
          })
        ).status(),
      ).toBe(404);
      expect(
        (
          await hostB.request.post(
            `/api/host/inquiries/${state.tenantA.inquiryId}/messages`,
            {
              data: { message: `${state.prefix} unauthorized host message` },
              headers: { Origin: origin },
            },
          )
        ).status(),
      ).toBe(404);

      const validPng = await sharp({
        create: {
          background: { alpha: 1, b: 20, g: 40, r: 60 },
          channels: 4,
          height: 2,
          width: 2,
        },
      })
        .png()
        .toBuffer();
      const crossTenantUpload = await hostB.request.post("/api/host/program-assets", {
        headers: { Origin: origin },
        multipart: {
          file: { buffer: validPng, mimeType: "image/png", name: "safe.png" },
          programId: state.tenantA.programId,
          usage: "image",
        },
      });
      expect(crossTenantUpload.status()).toBe(403);

      expect(
        (await hostA.request.get(`/api/host/applications/${state.tenantA.applicationId}`)).status(),
      ).toBe(200);
      expect(
        (await admin.request.get(`/api/host/applications/${state.tenantA.applicationId}`)).status(),
      ).toBe(200);
      expect((await admin.request.get("/api/implementation-status")).status()).toBe(200);

      await assertProtectedRowsUnchanged(state);
    } finally {
      await Promise.all([
        memberA.close(),
        memberB.close(),
        hostA.close(),
        hostB.close(),
        admin.close(),
      ]);
    }
  });

  test("enforces CSRF, payload, rate-limit, and upload boundaries", async ({ browser }) => {
    const state = await readSecurityE2EState();
    const member = await browser.newContext({ storageState: state.accounts.memberA.storagePath });
    const host = await browser.newContext({ storageState: state.accounts.hostA.storagePath });
    const admin = await browser.newContext({ storageState: state.accounts.admin.storagePath });
    const anonymous = await browser.newContext();

    try {
      expect(
        (
          await member.request.patch("/api/me/profile", {
            data: { displayName: `${state.prefix} CSRF mutation` },
            headers: { Origin: attackerOrigin },
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await host.request.patch(`/api/host/applications/${state.tenantA.applicationId}`, {
            data: { status: "rejected" },
            headers: { Origin: attackerOrigin },
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await admin.request.post("/api/admin/home-hero", {
            data: {},
            headers: { Origin: attackerOrigin },
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await anonymous.request.post("/api/support", {
            data: {},
            headers: { Origin: attackerOrigin },
          })
        ).status(),
      ).toBe(403);

      const oversizedPayload = await member.request.post("/api/me/onboarding", {
        data: { address: "x".repeat(9 * 1024) },
        headers: { Origin: origin },
      });
      expect(oversizedPayload.status()).toBe(413);

      const malformedUpload = await member.request.post("/api/me/avatar", {
        headers: { Origin: origin },
        multipart: {
          file: {
            buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            mimeType: "image/png",
            name: "truncated.png",
          },
        },
      });
      expect(malformedUpload.status()).toBe(400);

      const rateLimitStatuses: number[] = [];
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const response = await member.request.post("/api/program-applications", {
          data: {},
          headers: { Origin: origin },
        });
        rateLimitStatuses.push(response.status());
        if (attempt === 5) {
          expect(response.headers()["retry-after"]).toBeTruthy();
          expect(response.headers()["x-ratelimit-remaining"]).toBe("0");
        }
      }
      expect(rateLimitStatuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
      expect(rateLimitStatuses[5]).toBe(429);

      await assertProtectedRowsUnchanged(state);
    } finally {
      await Promise.all([member.close(), host.close(), admin.close(), anonymous.close()]);
    }
  });

  test("sanitizes TipTap HTML before storage and prevents browser execution", async ({
    browser,
  }) => {
    const state = await readSecurityE2EState();
    const host = await browser.newContext({ storageState: state.accounts.hostA.storagePath });
    const publicContext = await browser.newContext();
    const maliciousBody = `
      <script>window.__nuvioSecurityXss = 1</script>
      <p onclick="window.__nuvioSecurityXss = 2">${state.prefix} safe board text</p>
      <a href="javascript:window.__nuvioSecurityXss = 3">unsafe link</a>
      <img src="x" onerror="window.__nuvioSecurityXss = 4">
    `;

    try {
      const createResponse = await host.request.post("/api/host/channel-board-posts", {
        data: {
          operation: "upsert",
          post: {
            body: maliciousBody,
            createdAt: new Date().toISOString(),
            id: state.boardPostId,
            pinned: false,
            title: `${state.prefix} XSS Boundary`,
          },
          villageSlug: state.tenantA.villageSlug,
        },
        headers: { Origin: origin },
      });
      expect(createResponse.status(), await createResponse.text()).toBe(201);

      const listResponse = await host.request.get(
        `/api/host/channel-board-posts?villageSlug=${state.tenantA.villageSlug}`,
      );
      const listPayload = (await listResponse.json()) as {
        data?: Array<{ body: string; id: string }>;
      };
      const savedBody = listPayload.data?.find((item) => item.id === state.boardPostId)?.body ?? "";
      expect(savedBody).toContain(`${state.prefix} safe board text`);
      expect(savedBody).not.toMatch(/<script|onclick|onerror|javascript:/iu);

      const page = await publicContext.newPage();
      await page.addInitScript(() => {
        (window as Window & { __nuvioSecurityXss?: number }).__nuvioSecurityXss = 0;
      });
      await page.goto(
        `/channels/${state.tenantA.villageSlug}/notice/${state.boardPostId}`,
      );
      await expect(page.getByText(`${state.prefix} safe board text`, { exact: true })).toBeVisible();
      expect(
        await page.evaluate(
          () => (window as Window & { __nuvioSecurityXss?: number }).__nuvioSecurityXss,
        ),
      ).toBe(0);

      const sql = createReleaseE2ESql();
      try {
        const [section] = await sql`
          select published_content::text as content
          from public.village_page_sections
          where village_slug = ${state.tenantA.villageSlug}
            and page_key = 'notice'
            and section_key = 'notice_index'
        `;
        expect(String(section.content)).not.toMatch(/<script|onclick|onerror|javascript:/iu);
      } finally {
        await sql.end();
      }
    } finally {
      await host.request.post("/api/host/channel-board-posts", {
        data: {
          operation: "delete",
          postId: state.boardPostId,
          villageSlug: state.tenantA.villageSlug,
        },
        headers: { Origin: origin },
      }).catch(() => undefined);
      await Promise.all([host.close(), publicContext.close()]);
    }
  });

  test("keeps OAuth callbacks and return paths on trusted origins", async ({ browser }) => {
    const state = await readSecurityE2EState();
    const hostA = await browser.newContext({ storageState: state.accounts.hostA.storagePath });
    const hostB = await browser.newContext({ storageState: state.accounts.hostB.storagePath });
    const anonymous = await browser.newContext();

    try {
      const crossTenantConnect = await hostB.request.get(
        `/api/host/facebook/connect?villageSlug=${state.tenantA.villageSlug}`,
        { maxRedirects: 0 },
      );
      expect(crossTenantConnect.status()).toBe(403);

      const connect = await hostA.request.get(
        `/api/host/facebook/connect?villageSlug=${state.tenantA.villageSlug}&returnTo=${encodeURIComponent("//attacker.example/steal")}`,
        { maxRedirects: 0 },
      );
      expect([302, 303, 307, 308]).toContain(connect.status());
      const connectLocation = new URL(connect.headers().location, origin);
      expect(connectLocation.origin).not.toBe(attackerOrigin);
      if (connectLocation.hostname === "www.facebook.com") {
        const encodedState = connectLocation.searchParams.get("state");
        expect(encodedState).toBeTruthy();
        const oauthState = JSON.parse(
          Buffer.from(encodedState ?? "", "base64url").toString("utf8"),
        ) as { returnTo?: string; villageSlug?: string };
        expect(oauthState.returnTo).toBe("/host/villages/boseong");
        expect(oauthState.villageSlug).toBe(state.tenantA.villageSlug);
      }

      const forgedState = Buffer.from(
        JSON.stringify({
          nonce: "forged-nonce",
          returnTo: "//attacker.example/steal",
          villageSlug: state.tenantA.villageSlug,
        }),
        "utf8",
      ).toString("base64url");
      const callback = await anonymous.request.get(
        `/api/host/facebook/callback?state=${encodeURIComponent(forgedState)}&code=forged`,
        { maxRedirects: 0 },
      );
      expect([302, 303, 307, 308]).toContain(callback.status());
      const callbackLocation = new URL(callback.headers().location, origin);
      expectTrustedApplicationOrigin(callbackLocation);
      expect(callbackLocation.pathname).toBe("/host/villages/boseong");
      expect(callbackLocation.searchParams.has("facebook_error")).toBe(true);

      const authCallback = await anonymous.request.get(
        `/auth/callback?code=invalid&next=${encodeURIComponent("//attacker.example/steal")}`,
        { maxRedirects: 0 },
      );
      expect([302, 303, 307, 308]).toContain(authCallback.status());
      const authLocation = new URL(authCallback.headers().location, origin);
      expectTrustedApplicationOrigin(authLocation);
      expect(authLocation.pathname).toBe("/login");
    } finally {
      await Promise.all([hostA.close(), hostB.close(), anonymous.close()]);
    }
  });
});

async function loginWithEmail(page: Page, account: SecurityE2EAccount) {
  await page.goto("/login?next=/support");
  if (!(await page.locator("#login-email").isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "이메일로 계속하기" }).click();
  }
  await page.locator("#login-email").fill(account.email);
  await page.locator("#login-password").fill(account.password);
  await page.locator('form button[type="submit"]').click();
  await expect
    .poll(async () => {
      const response = await page.request.get("/api/auth/session");
      if (!response.ok()) return "";
      const payload = (await response.json()) as { data?: { user?: { email?: string } } };
      return payload.data?.user?.email ?? "";
    })
    .toBe(account.email);
  await page.waitForURL((url) => url.pathname === "/support");
}

function accountKeys(): SecurityAccountKey[] {
  return ["memberA", "memberB", "hostA", "hostB", "admin"];
}

function expectTrustedApplicationOrigin(url: URL) {
  const loopback = ["127.0.0.1", "localhost"].includes(url.hostname);
  if (loopback) {
    expect(url.port).toBe(String(e2ePort));
  } else {
    expect(["https://nuvio.kr", "https://www.nuvio.kr"]).toContain(url.origin);
  }
  expect(url.origin).not.toBe(attackerOrigin);
}

function deniedRoleExpectations(
  policy: SensitiveApiPolicy,
): Array<["anonymous" | "hostA" | "hostB" | "memberA", number]> {
  if (policy === "oauth-callback") return [];
  if (policy === "admin") {
    return [
      ["anonymous", 401],
      ["memberA", 403],
      ["hostA", 403],
      ["hostB", 403],
    ];
  }
  if (policy === "host") {
    return [
      ["anonymous", 401],
      ["memberA", 403],
    ];
  }
  return [["anonymous", 401]];
}

async function sendMatrixRequest(request: APIRequestContext, item: SensitiveApiCase) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await request.fetch(item.requestPath, {
        ...(stateChangingMethods.has(item.method) ? { data: {} } : {}),
        headers: { Origin: origin },
        maxRedirects: 0,
        method: item.method,
        timeout: 15_000,
      });
    } catch {
      if (attempt === 1) {
        throw new Error(`Security matrix request timed out: ${item.method} ${item.requestPath}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error(`Security matrix request failed: ${item.method} ${item.requestPath}`);
}

async function expectGetStatusWithRetry(
  request: APIRequestContext,
  path: string,
  expectedStatus: number,
) {
  let lastStatus: number | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await request.get(path, { timeout: 15_000 });
      lastStatus = response.status();
      if (lastStatus === expectedStatus) return;
    } catch {
      lastStatus = undefined;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Expected ${expectedStatus} from ${path}, received ${lastStatus ?? "timeout"}.`,
  );
}

async function assertOwnedLists(
  request: APIRequestContext,
  state: SecurityE2EState,
  label: "A" | "B",
) {
  const own = label === "A" ? state.tenantA : state.tenantB;
  const other = label === "A" ? state.tenantB : state.tenantA;
  const applications = await request.get("/api/me/applications");
  expect(applications.status()).toBe(200);
  const applicationPayload = (await applications.json()) as { data?: Array<{ id: string }> };
  expect(applicationPayload.data?.some((item) => item.id === own.applicationId)).toBe(true);
  expect(applicationPayload.data?.some((item) => item.id === other.applicationId)).toBe(false);

  const inquiries = await request.get("/api/me/inquiries");
  expect(inquiries.status()).toBe(200);
  const inquiryPayload = (await inquiries.json()) as { data?: Array<{ id: string }> };
  expect(inquiryPayload.data?.some((item) => item.id === own.inquiryId)).toBe(true);
  expect(inquiryPayload.data?.some((item) => item.id === other.inquiryId)).toBe(false);
}

async function assertProtectedRowsUnchanged(state: SecurityE2EState) {
  const sql = createReleaseE2ESql();
  try {
    const [application] = await sql`
      select status from public.program_applications where id = ${state.tenantA.applicationId}::uuid
    `;
    const [review] = await sql`
      select body from public.reviews where id = ${state.tenantA.reviewId}::uuid
    `;
    const [messageCount] = await sql`
      select count(*)::int as value
      from public.program_inquiry_messages
      where inquiry_id = ${state.tenantA.inquiryId}::uuid
    `;
    const [programCount] = await sql`
      select count(*)::int as value from public.programs where id = ${state.tenantA.programId}::uuid
    `;
    const [profile] = await sql`
      select display_name, avatar_url
      from public.profiles
      where id = ${state.accounts.memberA.userId}::uuid
    `;
    expect(application.status).toBe("completed");
    expect(review.body).toBe(state.tenantA.reviewBody);
    expect(messageCount.value).toBe(1);
    expect(programCount.value).toBe(1);
    expect(profile.display_name).toBe(`${state.prefix} memberA`);
    expect(profile.avatar_url).toBeNull();
  } finally {
    await sql.end();
  }
}
