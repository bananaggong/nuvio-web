import assert from "node:assert/strict";
import test from "node:test";
import { getSupabaseSecretKey } from "@/lib/supabase/config";

test("Supabase admin config prefers the new secret key and keeps a migration fallback", () => {
  const originalSecretKey = process.env.SUPABASE_SECRET_KEY;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    process.env.SUPABASE_SECRET_KEY = "sb_secret_new";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-service-role";
    assert.equal(getSupabaseSecretKey(), "sb_secret_new");

    delete process.env.SUPABASE_SECRET_KEY;
    assert.equal(getSupabaseSecretKey(), "legacy-service-role");

    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.throws(getSupabaseSecretKey, /SUPABASE_SECRET_KEY/u);
  } finally {
    restoreEnvironmentVariable("SUPABASE_SECRET_KEY", originalSecretKey);
    restoreEnvironmentVariable(
      "SUPABASE_SERVICE_ROLE_KEY",
      originalServiceRoleKey,
    );
  }
});

function restoreEnvironmentVariable(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
