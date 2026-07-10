import type { User } from "@supabase/supabase-js";

export function getConfirmedAuthEmail(user: User): string {
  const email = user.email?.trim().toLowerCase() ?? "";
  if (!email) return "";

  if (user.app_metadata?.provider === "local-dev") return email;
  return user.email_confirmed_at ? email : "";
}
