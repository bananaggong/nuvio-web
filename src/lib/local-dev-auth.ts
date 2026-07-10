import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";
import {
  ensureUserProfile,
  getUserProfileByEmail,
} from "@/lib/auth-profile-db";
import type { ApiAuthContext } from "@/lib/api-security";

const localDevEmail =
  process.env.NUVIO_LOCAL_DEV_EMAIL?.trim().toLowerCase() ||
  "local-dev@nuvio.invalid";
const fallbackLocalDevUserId = "00000000-0000-4000-8000-000000000001";

export async function getLocalDevAuthContext(
  request?: Request,
): Promise<ApiAuthContext | null> {
  if (!(await isLocalDevAuthRequest(request))) return null;

  const existingProfile = await getUserProfileByEmail(localDevEmail);
  const user = buildLocalDevUser(existingProfile?.id ?? fallbackLocalDevUserId);
  const profile = existingProfile ?? (await ensureUserProfile(user));

  return { profile, user };
}

export async function isLocalDevAuthRequest(
  request?: Request,
): Promise<boolean> {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.NUVIO_ENABLE_LOCAL_DEV_AUTH !== "1") return false;
  if (process.env.NUVIO_DISABLE_LOCAL_DEV_AUTH === "1") return false;

  const host = await getRequestHost(request);
  return isLocalHost(host);
}

function buildLocalDevUser(userId: string): User {
  const timestamp = new Date(0).toISOString();

  return {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: localDevEmail,
    email_confirmed_at: timestamp,
    app_metadata: {
      provider: "local-dev",
      providers: ["local-dev"],
    },
    user_metadata: {
      email: localDevEmail,
      full_name: "Local Dev Host",
      name: "Local Dev Host",
    },
    created_at: timestamp,
    updated_at: timestamp,
  } as User;
}

async function getRequestHost(request?: Request): Promise<string> {
  const requestHost = request?.headers.get("host");
  if (requestHost) return requestHost;

  if (request?.url) {
    try {
      return new URL(request.url).host;
    } catch {
      return "";
    }
  }

  try {
    const headerStore = await headers();
    return headerStore.get("host") ?? "";
  } catch {
    return "";
  }
}

function isLocalHost(host: string): boolean {
  const hostname = host.trim().toLowerCase().replace(/^\[/u, "").replace(/\]$/u, "");
  const withoutPort = hostname.includes(":")
    ? hostname.replace(/:\d+$/u, "")
    : hostname;

  return (
    withoutPort === "localhost" ||
    withoutPort === "127.0.0.1" ||
    withoutPort === "::1"
  );
}
