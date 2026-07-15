import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isDemoModeEnabledForEnvironment } from "../src/lib/demo-mode";

const root = new URL("../", import.meta.url);

test("production cannot enable static demo seeds", () => {
  assert.equal(
    isDemoModeEnabledForEnvironment({
      NEXT_PUBLIC_NUVIO_DEMO_MODE: "true",
      NODE_ENV: "production",
      NUVIO_DEMO_MODE: "true",
    }),
    false,
  );
  assert.equal(
    isDemoModeEnabledForEnvironment({ NODE_ENV: "development" }),
    true,
  );
  assert.equal(isDemoModeEnabledForEnvironment({ NODE_ENV: "test" }), true);
  assert.equal(isDemoModeEnabledForEnvironment({}), false);
});

test("release routes and application writes keep static seeds out of production", () => {
  const applicationDb = read("src/lib/host-application-db.ts");
  const applicationRoute = read("src/app/api/program-applications/route.ts");
  const announcementPage = read("src/app/announcements/page.tsx");
  const announcementDetailPage = read("src/app/announcements/[id]/page.tsx");
  const halfPricePage = read("src/app/half-price-travel/page.tsx");
  const llmsRoute = read("src/app/llms.txt/route.ts");
  const programApplyPage = read("src/app/programs/[id]/apply/page.tsx");
  const publicProgramDb = read("src/lib/public-program-db.ts");
  const sitemap = read("src/app/sitemap.ts");
  const villageDb = read("src/lib/village-db.ts");

  assert.match(applicationDb, /if \(isDemoModeEnabled\(\)\)[\s\S]*ensureProgramRecord/u);
  assert.match(applicationDb, /throw new ProgramNotFoundError\(\)/u);
  assert.match(applicationRoute, /ProgramNotFoundError[\s\S]*status: 404/u);
  assert.match(announcementPage, /if \(!isDemoModeEnabled\(\)\) notFound\(\)/u);
  assert.match(announcementDetailPage, /if \(!isDemoModeEnabled\(\)\) return \[\]/u);
  assert.match(halfPricePage, /await listPublicPrograms\(\)/u);
  assert.doesNotMatch(halfPricePage, /@\/lib\/data/u);
  assert.match(llmsRoute, /isDemoModeEnabled\(\)[\s\S]*Public announcements/u);
  assert.match(programApplyPage, /if \(!isDemoModeEnabled\(\)\) return \[\]/u);
  assert.match(publicProgramDb, /if \(!isDemoModeEnabled\(\)\) return undefined/u);
  assert.match(sitemap, /isDemoModeEnabled\(\)[\s\S]*\/announcements/u);
  assert.match(villageDb, /isDemoModeEnabled\(\) \? reviews : \[\]/u);
});

test("public auto replies reject missing or non-public programs", () => {
  const route = read("src/app/api/program-auto-replies/route.ts");

  assert.match(
    route,
    /!program[\s\S]*!program\.publishedAt[\s\S]*program\.status === "closed"[\s\S]*program\.status === "earlyClosed"[\s\S]*status: 404/u,
  );
  assert.match(
    route,
    /getProgramAutoReplyConfigByProgramId\(program\.id\)/u,
  );
  assert.match(
    route,
    /createDefaultProgramAutoReplyConfig\(program\.id\)/u,
  );
  assert.doesNotMatch(route, /program\?\.id \?\? programIdentifier/u);
});

test("database migration revokes browser writes and protects profile identity", () => {
  const migration = read("supabase/migrations/20260711000000_lock_browser_data_writes.sql");

  assert.match(migration, /revoke all privileges on table/iu);
  assert.match(migration, /drop policy if exists "Users can update their own profile"/u);
  assert.match(migration, /prevent_browser_profile_identity_mutation/u);
  assert.match(migration, /auth\.jwt\(\)[\s\S]*email/iu);
  assert.doesNotMatch(migration, /contact_email.*any/iu);
  assert.doesNotMatch(migration, /grant select on table/iu);
  assert.match(migration, /Village members can read own assets/u);
  assert.match(migration, /current_user_can_view_village_slug\(village_slug\)/u);
  assert.match(migration, /drop policy if exists "Users can manage their application forms"/u);
  assert.doesNotMatch(migration, /created_by\s*=\s*\(select auth\.uid\(\)\)/iu);
});

test("village and report mutations use server-resolved tenant identifiers", () => {
  const villageRoute = read("src/app/api/host/villages/route.ts");
  const villageDb = read("src/lib/village-db.ts");
  const reportDb = read("src/lib/report-automation-db.ts");

  assert.doesNotMatch(villageRoute, /upsertHostVillage/u);
  assert.match(villageRoute, /updateHostVillage\(existingVillage\.id/u);
  assert.match(villageDb, /pg_advisory_xact_lock/iu);
  assert.match(villageDb, /createHostVillageWithOwner/u);
  assert.match(reportDb, /reportVillageScope/u);
  assert.match(reportDb, /allowedVillageIds/u);
});

test("report migration fails closed when legacy tenant mapping is unresolved", () => {
  const migration = read(
    "supabase/migrations/20260711001000_scope_report_projects_to_villages.sql",
  );
  const schema = read("src/db/schema.ts");
  const announcementsBlock = schema.match(
    /export const announcements[\s\S]*?export const magazinePosts/u,
  )?.[0];

  assert.doesNotMatch(migration, /\(project\.schema ->> 'villageId'\)::uuid/u);
  assert.match(migration, /project\.program_id = program\.id/u);
  assert.match(migration, /Cannot scope %s legacy report project/u);
  assert.match(migration, /alter column village_id set not null/u);
  assert.ok(announcementsBlock);
  assert.doesNotMatch(announcementsBlock, /villageId/u);
});

test("host forms remain scoped to active village memberships", () => {
  const formsRoute = read("src/app/api/host/forms/route.ts");
  const formDeleteRoute = read("src/app/api/host/forms/[id]/route.ts");
  const formDb = read("src/lib/application-form-db.ts");

  assert.match(formsRoute, /resolveHostFormScope/u);
  assert.match(formsRoute, /listManageableHostVillageWorkspaces/u);
  assert.doesNotMatch(formsRoute, /restrictToOwner/u);
  assert.match(formDeleteRoute, /hostScope/u);
  assert.match(formDb, /canAccessFormWithinHostScope/u);
  assert.match(formDb, /programsTable\.villageId/u);
  assert.match(formDb, /villageIds\.length === 0/u);
});

test("public application responses do not return database application records", () => {
  const route = read("src/app/api/program-applications/route.ts");

  assert.match(route, /requireAuthenticatedUser/u);
  assert.match(route, /getConfirmedAuthEmail/u);
  assert.match(route, /acceptedApplicationResponse/u);
  assert.doesNotMatch(route, /data:\s*existingApplication/u);
  assert.doesNotMatch(route, /data:\s*application/u);
});

test("external dispatch and notification jobs are idempotent and literal", () => {
  const sheet = read("src/lib/manual-dispatch-sheet.ts");
  const discord = read("src/lib/manual-dispatch-discord.ts");
  const notifications = read("src/lib/notification-db.ts");
  const scheduledMessages = read("src/lib/scheduled-message-db.ts");

  assert.doesNotMatch(sheet, /USER_ENTERED/u);
  assert.match(sheet, /valueInputOption=RAW/u);
  assert.match(sheet, /GOOGLE_MANUAL_MESSAGE_SPREADSHEET_ID is required/u);
  assert.match(sheet, /notifyManualDispatchDiscord\(rows\)/u);
  assert.match(discord, /allowed_mentions:\s*\{ parse: \[\] \}/u);
  assert.match(discord, /rows\.length/u);
  assert.doesNotMatch(discord, /applicantName|\.phone|\.body/u);
  assert.match(notifications, /program-reminder:[^`]*reminderKey/u);
  assert.match(notifications, /idempotencyKey: event\.id/u);
  assert.match(scheduledMessages, /idempotencyKey: row\.id/u);
});

test("external announcement ingestion is removed without dropping scheduled messages", () => {
  const schema = read("src/db/schema.ts");
  const migration = read(
    "supabase/migrations/20260712000000_remove_external_announcement_pipeline.sql",
  );
  const vercel = read("vercel.json");

  assert.doesNotMatch(schema, /externalAnnouncementSources|programLeads/u);
  assert.match(migration, /drop table if exists public\.external_announcements/u);
  assert.match(migration, /drop table if exists public\.program_leads/u);
  assert.doesNotMatch(vercel, /refresh-announcements/u);
  assert.match(vercel, /process-scheduled-messages/u);
});

test("API JSON bodies are parsed through the bounded helper", () => {
  const routeFiles = [
    "src/app/api/program-applications/route.ts",
    "src/app/api/program-inquiries/route.ts",
    "src/app/api/support/route.ts",
    "src/app/api/host/villages/route.ts",
    "src/app/api/host/scheduled-messages/route.ts",
  ];

  for (const path of routeFiles) {
    const source = read(path);
    assert.match(source, /readJsonWithLimit/u, path);
    assert.doesNotMatch(source, /request\.json\(/u, path);
  }
});

test("stored HTML render sinks retain an explicit sanitizer boundary", () => {
  const magazinePage = read("src/app/magazine/[slug]/page.tsx");
  const boardRenderer = read("src/components/channel-guest-board.tsx");
  const mediaRenderer = read("src/components/village-media-pages.tsx");
  const boardStorage = read("src/lib/channel-board-posts.ts");

  assert.match(magazinePage, /sanitizeMagazineHtml\(post\.contentHtml\)/u);
  assert.match(boardRenderer, /sanitizeMagazineHtml\(post\.body/u);
  assert.match(mediaRenderer, /return sanitizeMagazineHtml\(firstBody\)/u);
  assert.match(boardStorage, /body = sanitizeMagazineHtml/u);
});

test("release-critical trigger fixes preserve application and review writes", () => {
  const applicationStatusFix = read(
    "supabase/migrations/20260712010000_fix_application_status_review_sync_config.sql",
  );
  const reviewVersionAuthorization = read(
    "supabase/migrations/20260712011000_restore_review_content_version_trigger_authorization.sql",
  );
  const reviewMaintenanceDelete = read(
    "supabase/migrations/20260712012000_restore_review_content_version_maintenance_delete.sql",
  );

  assert.match(applicationStatusFix, /new\.status::text/u);
  assert.match(
    reviewVersionAuthorization,
    /set_config\('app\.review_audit_insert_allowed', 'true', true\)/u,
  );
  assert.match(
    reviewMaintenanceDelete,
    /current_setting\('app\.review_hard_delete_allowed', true\) = 'true'/u,
  );
});

test("public persistence routes keep unexpected database details server-side", () => {
  const applicationRoute = read("src/app/api/program-applications/route.ts");
  const reviewRoute = read("src/app/api/reviews/route.ts");

  assert.match(applicationRoute, /logServerPersistenceError/u);
  assert.match(applicationRoute, /error: "Failed to create program application\."/u);
  assert.match(
    applicationRoute,
    /error: "Failed to create program application\."[\s\S]*?status: 500/u,
  );
  assert.doesNotMatch(
    applicationRoute,
    /error instanceof Error\s*\?\s*error\.message\s*:\s*"Failed to create program application\."/u,
  );
  assert.match(reviewRoute, /logServerPersistenceError/u);
  assert.match(reviewRoute, /error: "Failed to create review\."/u);
  assert.match(reviewRoute, /error: "Failed to create review\."[\s\S]*?status: 500/u);
  assert.match(reviewRoute, /error: "Failed to load reviews\."/u);
});

test("authentication failures keep provider and database details server-side", () => {
  const apiSecurity = read("src/lib/api-security.ts");

  assert.match(apiSecurity, /unstable_rethrow\(error\)/u);
  assert.match(apiSecurity, /logServerPersistenceError\("API authentication failed\."/u);
  assert.match(apiSecurity, /apiError\("Authentication is unavailable\.", 500\)/u);
  assert.doesNotMatch(
    apiSecurity,
    /apiError\([\s\S]{0,120}error instanceof Error\s*\?\s*error\.message/u,
  );
});

function read(path: string): string {
  return readFileSync(new URL(path, root), "utf8");
}
