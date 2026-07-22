import { expect, test, type Page } from "@playwright/test";
import {
  createReleaseE2EAdminClient,
  createReleaseE2ESql,
} from "./support/database";
import {
  readReleaseE2EState,
  updateReleaseE2EState,
  type ReleaseE2EAccount,
  type ReleaseE2EState,
} from "./support/state";

const e2ePort = Number(process.env.NUVIO_E2E_PORT ?? "3100");
const origin = `http://127.0.0.1:${e2ePort}`;

test.describe.serial("release critical journeys", () => {
  test("keeps support public and preserves the anonymous mypage return path", async ({
    page,
  }) => {
    const nextPath =
      "/mypage/messages?programId=program-1&hostName=%EA%B0%80%EC%9D%B4%EB%93%9C";

    await page.goto(nextPath);
    const loginUrl = new URL(page.url());
    expect(loginUrl.pathname).toBe("/login");
    expect(loginUrl.searchParams.get("next")).toBe(nextPath);

    await page.goto("/support");
    await expect(page).toHaveURL(/\/support$/u);
    await expect(page.getByTestId("mypage-side-menu")).toHaveCount(0);
  });

  test("signs up, logs in, and completes participant onboarding", async ({ page }, testInfo) => {
    let state = await readReleaseE2EState();
    await page.goto("/signup?intent=participant");
    await page.locator("#agreement-terms").check();
    await page.locator("#agreement-privacy").check();
    await page.locator("#agreement-age").check();
    await page.getByRole("button", { name: "시작하기" }).click();

    await page.locator("#signup-email").fill(state.participant.email);
    await page.locator("#signup-password").fill(state.participant.password);
    const signupResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.url().includes("/auth/v1/signup"),
    );
    await page.locator('form button[type="submit"]').click();
    const signupResponse = await signupResponsePromise;
    const signupPayload = (await signupResponse.json()) as {
      code?: string;
      id?: string;
      message?: string;
      user?: { id?: string };
    };
    const admin = createReleaseE2EAdminClient();
    let participantUserId = signupPayload.user?.id ?? signupPayload.id;
    if (!signupResponse.ok()) {
      if (signupPayload.code !== "over_email_send_rate_limit") {
        throw new Error(JSON.stringify(signupPayload));
      }
      if (process.env.NUVIO_E2E_ALLOW_AUTH_RATE_LIMIT_FALLBACK !== "1") {
        throw new Error(
          `${signupPayload.code}: ${signupPayload.message ?? "Supabase auth email rate limit exceeded."}`,
        );
      }
      testInfo.annotations.push({
        description: signupPayload.message ?? "Supabase auth email rate limit exceeded.",
        type: "external-auth-rate-limit",
      });
      console.warn(
        JSON.stringify({
          code: signupPayload.code,
          event: "release-e2e-signup-provider-fallback",
        }),
      );
      const fallbackUser = await admin.auth.admin.createUser({
        email: state.participant.email,
        email_confirm: true,
        password: state.participant.password,
        user_metadata: { e2e_prefix: state.prefix },
      });
      if (fallbackUser.error || !fallbackUser.data.user) {
        throw new Error(
          fallbackUser.error?.message ?? "Failed to create the rate-limit fallback user.",
        );
      }
      participantUserId = fallbackUser.data.user.id;
    }
    expect(participantUserId).toMatch(/^[0-9a-f-]{36}$/iu);
    if (!participantUserId) throw new Error("Signup response did not include a user id.");

    state = await updateReleaseE2EState((current) => ({
      ...current,
      participant: { ...current.participant, userId: participantUserId },
    }));
    const confirmed = await admin.auth.admin.updateUserById(participantUserId, {
      email_confirm: true,
    });
    expect(confirmed.error?.message ?? "").toBe("");

    await page.request.post("/api/auth/logout", { headers: { Origin: origin } });
    await loginWithEmail(page, state.participant, "/login?intent=participant");
    await expect(page).toHaveURL(/\/onboarding(?:\?|$)/u);

    await page.locator('form button[type="submit"]').click();
    await page.locator('input[autocomplete="name"]').fill(`${state.prefix} Participant`);
    await page.locator('input[autocomplete="tel"]').fill("010-9000-0002");
    await page.locator('input[autocomplete="email"]').fill(state.participant.email);
    await page.locator('form button[type="submit"]').click();
    await page.locator('input[autocomplete="street-address"]').fill("Seoul E2E District");
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/$/u, { timeout: 30_000 });
    await page.context().storageState({ path: state.participantStoragePath });

    await page.goto("/support");
    await expect(page.getByTestId("mypage-side-menu")).toHaveCount(1);

    const sql = createReleaseE2ESql();
    try {
      const [profile] = await sql`
        select onboarding_intent, onboarding_completed_at, display_name, phone, address
        from public.profiles
        where id = ${participantUserId}::uuid
      `;
      expect(profile.onboarding_intent).toBe("participant");
      expect(profile.onboarding_completed_at).toBeTruthy();
      expect(profile.display_name).toBe(`${state.prefix} Participant`);
      expect(profile.phone).toBe("010-9000-0002");
      expect(profile.address).toBe("Seoul E2E District");
    } finally {
      await sql.end();
    }
  });

  test("discovers a program, prevents duplicate applications, and reflects my trip", async ({
    browser,
  }) => {
    let state = await readReleaseE2EState();
    const context = await browser.newContext({ storageState: state.participantStoragePath });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await expect(page.getByText(state.program.title, { exact: true }).first()).toBeVisible();
      await page.goto(`/programs/${state.program.slug}`);
      await expect(page.getByRole("heading", { name: state.program.title }).first()).toBeVisible();
      await page.goto(`/programs/${state.program.slug}/apply`);

      const applicantName = `${state.prefix} Participant`;
      const applicationPayload = buildApplicationPayload(state, applicantName);
      const concurrentResults = await page.evaluate(async (payload) => {
        return Promise.all(
          [0, 1].map(async () => {
            const response = await fetch("/api/program-applications", {
              body: JSON.stringify(payload),
              headers: { "Content-Type": "application/json" },
              method: "POST",
            });
            return { body: await response.text(), status: response.status };
          }),
        );
      }, applicationPayload);
      expect(concurrentResults.map((result) => result.status)).toEqual([202, 202]);

      const sql = createReleaseE2ESql();
      try {
        const rows = await sql`
          select id, status, submitted_by
          from public.program_applications
          where program_id = ${state.program.id}::uuid
            and lower(email) = ${state.participant.email.toLowerCase()}
        `;
        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe("submitted");
        expect(rows[0].submitted_by).toBe(state.participant.userId);
        state = await updateReleaseE2EState((current) => ({
          ...current,
          applicationId: String(rows[0].id),
        }));
      } finally {
        await sql.end();
      }

      const basicInputs = page.locator(
        'form input:not([type="checkbox"]):not([type="file"]):not([type="hidden"])',
      );
      await basicInputs.nth(0).fill(applicantName);
      await basicInputs.nth(1).fill(state.participant.email);
      await basicInputs.nth(2).fill("010-9000-0002");
      await page.locator("form textarea").nth(0).fill(`${state.prefix} motivation`);
      await page.locator("#application-consent-all").check();
      await page.locator('form button[type="submit"]').click();
      await expect(page.locator('a[href="/mypage"]')).toBeVisible();

      const verificationSql = createReleaseE2ESql();
      try {
        const [count] = await verificationSql`
          select count(*)::int as value
          from public.program_applications
          where program_id = ${state.program.id}::uuid
            and lower(email) = ${state.participant.email.toLowerCase()}
        `;
        expect(count.value).toBe(1);
      } finally {
        await verificationSql.end();
      }

      await page.goto("/mypage/trips");
      await expect(page.getByText(state.program.title, { exact: true }).first()).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await context.close();
    }
  });

  test("shows the application in host CRM and persists every status transition", async ({
    browser,
  }) => {
    const state = await readReleaseE2EState();
    expect(state.applicationId).toBeTruthy();
    const applicationId = state.applicationId;
    if (!applicationId) throw new Error("Application fixture is missing.");
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await loginWithEmail(page, state.host, "/login?intent=host");
      await page.context().storageState({ path: state.hostStoragePath });
      await page.goto(
        `/host/programs/${state.program.id}/applications?applicationId=${applicationId}`,
      );
      await expect(page.getByText(`${state.prefix} Participant`, { exact: true }).first()).toBeVisible({
        timeout: 30_000,
      });

      for (const status of ["screening", "accepted", "checkedIn", "completed"] as const) {
        const response = await page.request.patch(
          `/api/host/applications/${applicationId}`,
          {
            data: { status },
            headers: { Origin: origin },
          },
        );
        expect(response.status(), await response.text()).toBe(200);
      }

      const applicationsResponse = await page.request.get("/api/host/applications");
      expect(applicationsResponse.status()).toBe(200);
      const applicationsPayload = (await applicationsResponse.json()) as {
        data?: Array<{ id: string; status: string }>;
      };
      expect(
        applicationsPayload.data?.find((application) => application.id === applicationId)
          ?.status,
      ).toBe("completed");

      const sql = createReleaseE2ESql();
      try {
        const [application] = await sql`
          select status from public.program_applications where id = ${applicationId}::uuid
        `;
        const [events] = await sql`
          select count(*)::int as value
          from public.application_status_events
          where application_id = ${applicationId}::uuid
        `;
        expect(application.status).toBe("completed");
        expect(events.value).toBe(4);
      } finally {
        await sql.end();
      }

      await page.reload();
      await expect(page.getByText(`${state.prefix} Participant`, { exact: true }).first()).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("submits one review, blocks duplicates, publishes it, and exposes it publicly", async ({
    browser,
  }) => {
    let state = await readReleaseE2EState();
    expect(state.applicationId).toBeTruthy();
    const applicationId = state.applicationId;
    if (!applicationId) throw new Error("Application fixture is missing.");
    const participantContext = await browser.newContext({
      storageState: state.participantStoragePath,
    });
    const participantPage = await participantContext.newPage();
    try {
      await participantPage.goto(`/reviews/new?applicationId=${applicationId}`);
      await expect(participantPage.getByRole("heading").first()).toContainText(state.program.title);
      const invalidReviewResponse = await participantPage.request.post("/api/reviews", {
        data: {
          applicationId,
          body: "short",
          images: [],
          rating: 5,
        },
        headers: { Origin: origin },
      });
      expect(invalidReviewResponse.status()).toBe(400);
      const invalidReviewPayload = (await invalidReviewResponse.json()) as { error?: string };
      expect(invalidReviewPayload.error).toBe("Review body must be at least 10 characters.");

      await participantPage.locator('[role="radio"]').nth(4).click();
      await participantPage.locator('textarea[name="body"]').fill(state.reviewBody);
      const reviewResponsePromise = participantPage.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/api/reviews",
      );
      await participantPage.locator('form button[type="submit"]').click();
      const reviewResponse = await reviewResponsePromise;
      expect(reviewResponse.status(), await reviewResponse.text()).toBe(201);
      await expect(participantPage).toHaveURL(/\/mypage\/reviews$/u);
      const reviewPayload = (await reviewResponse.json()) as { data?: { id?: string } };
      expect(reviewPayload.data?.id).toBeTruthy();
      state = await updateReleaseE2EState((current) => ({
        ...current,
        reviewId: reviewPayload.data?.id,
      }));

      const duplicateResponse = await participantPage.request.post("/api/reviews", {
        data: {
          applicationId,
          body: state.reviewBody,
          images: [],
          rating: 5,
        },
        headers: { Origin: origin },
      });
      expect(duplicateResponse.status()).toBe(409);

      const sql = createReleaseE2ESql();
      try {
        const rows = await sql`
          select id, status, rating
          from public.reviews
          where application_id = ${applicationId}::uuid
            and status <> 'deleted'
        `;
        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe("pending");
        expect(rows[0].rating).toBe(5);
      } finally {
        await sql.end();
      }

      await participantPage.getByRole("button", { name: "내가 쓴 후기" }).click();
      await expect(participantPage.getByText(state.reviewBody, { exact: true }).first()).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await participantContext.close();
    }

    const reviewId = state.reviewId;
    if (!reviewId) throw new Error("Review fixture is missing.");

    const hostContext = await browser.newContext({ storageState: state.hostStoragePath });
    const hostPage = await hostContext.newPage();
    try {
      const publishResponse = await hostPage.request.patch("/api/host/reviews", {
        data: { id: reviewId, status: "published" },
        headers: { Origin: origin },
      });
      expect(publishResponse.status(), await publishResponse.text()).toBe(200);
      await hostPage.goto(`/host/channels/reviews?channel=${state.village.slug}`);
      await expect(hostPage.getByText(state.reviewBody, { exact: true }).first()).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await hostContext.close();
    }

    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    try {
      await publicPage.goto("/reviews");
      await expect(publicPage.getByText(state.reviewBody, { exact: true }).first()).toBeVisible();
      await publicPage.goto(`/channels/${state.village.slug}/reviews`);
      await expect(publicPage.getByText(state.reviewBody, { exact: true }).first()).toBeVisible();
    } finally {
      await publicContext.close();
    }

    const verificationSql = createReleaseE2ESql();
    try {
      const [review] = await verificationSql`
        select status, published_at from public.reviews where id = ${reviewId}::uuid
      `;
      expect(review.status).toBe("published");
      expect(review.published_at).toBeTruthy();
    } finally {
      await verificationSql.end();
    }
  });

  test("creates, reads, updates, and deletes channel board, gallery, and magazine content", async ({
    browser,
  }) => {
    let state = await readReleaseE2EState();
    const context = await browser.newContext({ storageState: state.hostStoragePath });
    const page = await context.newPage();
    const boardTitle = `${state.prefix} Board`;
    const boardBody = `<p>${state.prefix} board body</p>`;
    const galleryTitle = `${state.prefix} Gallery`;
    const magazineTitle = `${state.prefix} Magazine`;
    try {
      const boardResponse = await page.request.post("/api/host/channel-board-posts", {
        data: {
          operation: "upsert",
          post: {
            body: boardBody,
            createdAt: new Date().toISOString(),
            id: state.boardPostId,
            pinned: true,
            title: boardTitle,
          },
          villageSlug: state.village.slug,
        },
        headers: { Origin: origin },
      });
      expect(boardResponse.status(), await boardResponse.text()).toBe(201);

      const galleryResponse = await page.request.post("/api/host/media", {
        data: buildMediaPayload(state, {
          body: [`${state.prefix} gallery body`],
          category: "archive",
          sourceUrl: "/host/channels/galleries",
          title: galleryTitle,
        }),
        headers: { Origin: origin },
      });
      expect(galleryResponse.status(), await galleryResponse.text()).toBe(201);
      const galleryPayload = (await galleryResponse.json()) as { data?: { id?: string } };

      const magazineResponse = await page.request.post("/api/host/media", {
        data: buildMediaPayload(state, {
          body: [`<p>${state.prefix} magazine body</p>`],
          category: "original",
          sourceUrl: "/host/channels/magazines",
          title: magazineTitle,
        }),
        headers: { Origin: origin },
      });
      expect(magazineResponse.status(), await magazineResponse.text()).toBe(201);
      const magazinePayload = (await magazineResponse.json()) as { data?: { id?: string } };
      expect(galleryPayload.data?.id).toBeTruthy();
      expect(magazinePayload.data?.id).toBeTruthy();
      state = await updateReleaseE2EState((current) => ({
        ...current,
        galleryId: galleryPayload.data?.id,
        magazineId: magazinePayload.data?.id,
      }));

      const sql = createReleaseE2ESql();
      try {
        const [mediaCount] = await sql`
          select count(*)::int as value
          from public.village_media_contents
          where village_slug = ${state.village.slug}
        `;
        const [boardCount] = await sql`
          select jsonb_array_length(published_content->'posts')::int as value
          from public.village_page_sections
          where village_slug = ${state.village.slug}
            and page_key = 'notice'
            and section_key = 'notice_index'
        `;
        expect(mediaCount.value).toBe(2);
        expect(boardCount.value).toBe(1);
      } finally {
        await sql.end();
      }

      await assertHostAndPublicChannelContent(page, state, {
        boardTitle,
        galleryTitle,
        magazineTitle,
      });

      const updatedBoardTitle = `${boardTitle} Updated`;
      const updatedGalleryTitle = `${galleryTitle} Updated`;
      const updatedMagazineTitle = `${magazineTitle} Updated`;
      const boardUpdate = await page.request.post("/api/host/channel-board-posts", {
        data: {
          operation: "upsert",
          post: {
            body: `<p>${state.prefix} updated board body</p>`,
            createdAt: new Date().toISOString(),
            id: state.boardPostId,
            pinned: false,
            title: updatedBoardTitle,
          },
          villageSlug: state.village.slug,
        },
        headers: { Origin: origin },
      });
      expect(boardUpdate.status()).toBe(201);
      const galleryUpdate = await page.request.post("/api/host/media", {
        data: buildMediaPayload(state, {
          body: [`${state.prefix} updated gallery body`],
          category: "archive",
          id: state.galleryId,
          sourceUrl: "/host/channels/galleries",
          title: updatedGalleryTitle,
        }),
        headers: { Origin: origin },
      });
      expect(galleryUpdate.status()).toBe(201);
      const magazineUpdate = await page.request.post("/api/host/media", {
        data: buildMediaPayload(state, {
          body: [`<p>${state.prefix} updated magazine body</p>`],
          category: "original",
          id: state.magazineId,
          sourceUrl: "/host/channels/magazines",
          title: updatedMagazineTitle,
        }),
        headers: { Origin: origin },
      });
      expect(magazineUpdate.status()).toBe(201);

      await page.goto(`/channels/${state.village.slug}/notice/${state.boardPostId}`);
      await expect(page.getByText(updatedBoardTitle, { exact: true }).first()).toBeVisible();
      await page.goto(`/channels/${state.village.slug}/media?type=gallery`);
      await expect(
        page.getByText(`${updatedGalleryTitle} summary`, { exact: true }).first(),
      ).toBeVisible();
      await page.goto(`/channels/${state.village.slug}/media?type=magazine`);
      await expect(page.getByText(updatedMagazineTitle, { exact: true }).first()).toBeVisible();

      const boardDelete = await page.request.post("/api/host/channel-board-posts", {
        data: {
          operation: "delete",
          postId: state.boardPostId,
          villageSlug: state.village.slug,
        },
        headers: { Origin: origin },
      });
      expect(boardDelete.status()).toBe(201);
      for (const id of [state.galleryId, state.magazineId]) {
        const response = await page.request.delete("/api/host/media", {
          data: { id, villageSlug: state.village.slug },
          headers: { Origin: origin },
        });
        expect(response.status(), await response.text()).toBe(200);
      }

      const deleteSql = createReleaseE2ESql();
      try {
        const [mediaCount] = await deleteSql`
          select count(*)::int as value
          from public.village_media_contents
          where village_slug = ${state.village.slug}
        `;
        const [boardCount] = await deleteSql`
          select jsonb_array_length(published_content->'posts')::int as value
          from public.village_page_sections
          where village_slug = ${state.village.slug}
            and page_key = 'notice'
            and section_key = 'notice_index'
        `;
        expect(mediaCount.value).toBe(0);
        expect(boardCount.value).toBe(0);
      } finally {
        await deleteSql.end();
      }

      await page.goto(`/channels/${state.village.slug}/media?type=gallery`);
      await expect(
        page.getByText(`${updatedGalleryTitle} summary`, { exact: true }),
      ).toHaveCount(0);
      await page.goto(`/channels/${state.village.slug}/media?type=magazine`);
      await expect(page.getByText(updatedMagazineTitle, { exact: true })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});

async function loginWithEmail(page: Page, account: ReleaseE2EAccount, path: string) {
  await page.goto(path);
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
}

function buildApplicationPayload(state: ReleaseE2EState, applicantName: string) {
  return {
    answers: {
      legalConsent: {
        privacyCollectionAgreed: true,
        termsAgreed: true,
        thirdPartyAgreed: true,
      },
      motivation: `${state.prefix} motivation`,
    },
    applicantName,
    email: state.participant.email,
    phone: "010-9000-0002",
    programId: state.program.id,
  };
}

function buildMediaPayload(
  state: ReleaseE2EState,
  input: {
    body: string[];
    category: "archive" | "original";
    id?: string;
    sourceUrl: string;
    title: string;
  },
) {
  return {
    body: input.body,
    category: input.category,
    date: new Date().toISOString().slice(0, 10),
    featured: false,
    id: input.id ?? "",
    imageUrls: ["/brand/nuvio-social-preview.png"],
    provider: "link",
    published: true,
    sourceName: state.village.name,
    sourceUrl: input.sourceUrl,
    summary: `${input.title} summary`,
    thumbnail: "/brand/nuvio-social-preview.png",
    title: input.title,
    villageSlug: state.village.slug,
  };
}

async function assertHostAndPublicChannelContent(
  page: Page,
  state: ReleaseE2EState,
  titles: { boardTitle: string; galleryTitle: string; magazineTitle: string },
) {
  await page.goto(`/host/channels/boards?channel=${state.village.slug}`);
  await expect(page.getByText(titles.boardTitle, { exact: true }).first()).toBeVisible({
    timeout: 30_000,
  });
  await page.goto(`/host/channels/galleries?channel=${state.village.slug}`);
  await expect(
    page.getByText(`${titles.galleryTitle} summary`, { exact: true }).first(),
  ).toBeVisible();
  await page.goto(`/host/channels/magazines?channel=${state.village.slug}`);
  await expect(page.getByText(titles.magazineTitle, { exact: true }).first()).toBeVisible();
  await page.goto(`/channels/${state.village.slug}/notice/${state.boardPostId}`);
  await expect(page.getByText(titles.boardTitle, { exact: true }).first()).toBeVisible();
  await page.goto(`/channels/${state.village.slug}/media?type=gallery`);
  await expect(
    page.getByText(`${titles.galleryTitle} summary`, { exact: true }).first(),
  ).toBeVisible();
  await page.goto(`/channels/${state.village.slug}/media?type=magazine`);
  await expect(page.getByText(titles.magazineTitle, { exact: true }).first()).toBeVisible();
}
