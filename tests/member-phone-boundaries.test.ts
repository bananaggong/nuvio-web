import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  applicationApi: new URL("../src/app/api/program-applications/route.ts", import.meta.url),
  migration: new URL(
    "../supabase/migrations/20260714000000_guard_member_mobile_phone_writes.sql",
    import.meta.url,
  ),
  onboardingApi: new URL("../src/app/api/me/onboarding/route.ts", import.meta.url),
  profileApi: new URL("../src/app/api/me/profile/route.ts", import.meta.url),
};

test("member write APIs share the Korean mobile phone boundary", async () => {
  const [applicationApi, onboardingApi, profileApi] = await Promise.all([
    readFile(files.applicationApi, "utf8"),
    readFile(files.onboardingApi, "utf8"),
    readFile(files.profileApi, "utf8"),
  ]);

  assert.match(onboardingApi, /normalizeKoreanMobilePhone\(body\.phone\)/u);
  assert.match(profileApi, /normalizeProfilePhone\(body\.phone\)/u);
  assert.match(applicationApi, /getUserProfile\(auth\.user\.id\)/u);
  assert.match(applicationApi, /phone: verifiedPhone/u);
  assert.doesNotMatch(applicationApi, /phone: normalizeText\(body\.phone/u);
});

test("database guard protects new phone writes without validating legacy rows", async () => {
  const migration = await readFile(files.migration, "utf8");

  assert.match(migration, /before insert or update of phone on public\.profiles/u);
  assert.match(
    migration,
    /before insert or update of phone on public\.program_applications/u,
  );
  assert.match(migration, /new\.phone !~ '\^010\[0-9\]\{8\}\$'/u);
  assert.doesNotMatch(migration, /alter table[\s\S]+validate constraint/iu);
});
