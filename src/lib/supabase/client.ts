"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./config";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createBrowserClient(url, publishableKey);
}
