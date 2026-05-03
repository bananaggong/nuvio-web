export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function hasSupabasePublicConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublishableKey(),
  );
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase public env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, publishableKey };
}

export function getSupabaseServiceRoleKey(): string {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for server-side admin operations.",
    );
  }

  return serviceRoleKey;
}

function getSupabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}
