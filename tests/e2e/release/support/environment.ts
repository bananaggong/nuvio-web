import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

export function getReleaseE2EDatabaseUrl(): string {
  const rawUrl = process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL;
  if (!rawUrl) {
    throw new Error("Release E2E requires DIRECT_DATABASE_URL or DATABASE_URL.");
  }

  const url = new URL(rawUrl.trim());
  const localDatabase = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (!localDatabase && process.env.NUVIO_E2E_ALLOW_REMOTE_DB !== "1") {
    throw new Error(
      "Remote database writes are disabled. Set NUVIO_E2E_ALLOW_REMOTE_DB=1 only for an approved prefixed E2E run.",
    );
  }

  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "5432") {
    url.port = "6543";
  }

  return url.toString();
}

export function getReleaseE2ESupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Release E2E requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  return { serviceRoleKey, url };
}

export function assertReleaseE2EPrefix(prefix: string): void {
  if (!/^NUVIO_E2E_[A-Z0-9_]{8,80}$/u.test(prefix)) {
    throw new Error(`Unsafe release E2E prefix: ${prefix}`);
  }
}
