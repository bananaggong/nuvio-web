import type { User } from "@supabase/supabase-js";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { hostVillageMemberships } from "@/db/schema";
import {
  ensureUserProfile,
  getUserProfile,
  type AuthProfile,
} from "@/lib/auth-profile-db";
import { getLocalDevAuthContext } from "@/lib/local-dev-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ApiRole = AuthProfile["role"];

export type ApiAuthContext = {
  profile: AuthProfile;
  user: User;
};

export type ApiAuthResult = ApiAuthContext | { response: NextResponse };

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export async function requireAuthenticatedUser(): Promise<ApiAuthResult> {
  return requireApiRole(["user", "partner", "admin"]);
}

export async function getOptionalAuthenticatedUser(): Promise<ApiAuthContext | null> {
  try {
    const localDevAuth = await getLocalDevAuthContext();
    if (localDevAuth) return localDevAuth;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const profile = (await getUserProfile(user.id)) ?? (await ensureUserProfile(user));
    return { profile, user };
  } catch {
    return null;
  }
}

export async function requireHostRole(): Promise<ApiAuthResult> {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth;

  if (auth.profile.role === "admin" || auth.profile.role === "partner") {
    return auth;
  }

  if (await hasActiveHostVillageMembership(auth)) return auth;

  return { response: apiError("Host access is required.", 403) };
}

export async function requireAdminRole(): Promise<ApiAuthResult> {
  return requireApiRole(["admin"]);
}

export async function requireApiRole(
  allowedRoles: ApiRole[],
): Promise<ApiAuthResult> {
  try {
    const localDevAuth = await getLocalDevAuthContext();
    if (localDevAuth) {
      return allowedRoles.includes(localDevAuth.profile.role)
        ? localDevAuth
        : { response: apiError("Forbidden.", 403) };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { response: apiError("Unauthorized.", 401) };
    }

    const profile = (await getUserProfile(user.id)) ?? (await ensureUserProfile(user));
    if (!allowedRoles.includes(profile.role)) {
      return { response: apiError("Forbidden.", 403) };
    }

    return { profile, user };
  } catch (error) {
    return {
      response: apiError(
        error instanceof Error ? error.message : "Authentication is unavailable.",
        500,
      ),
    };
  }
}

export function isApiAuthError(result: ApiAuthResult): result is { response: NextResponse } {
  return "response" in result;
}

export function enforceContentLength(
  request: Request,
  maxBytes: number,
): NextResponse | null {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) return null;

  const length = Number(rawLength);
  if (!Number.isFinite(length) || length <= maxBytes) return null;

  return apiError("Payload is too large.", 413);
}

export function enforceSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const allowedOrigins = getAllowedOrigins(request);
  if (allowedOrigins.has(origin)) return null;

  return apiError("Cross-origin state-changing requests are not allowed.", 403);
}

export function applyRateLimit(
  request: Request,
  options: RateLimitOptions,
): NextResponse | null {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${options.key}:${ip}`;
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    sweepExpiredRateLimits(now);
    return null;
  }

  current.count += 1;
  if (current.count <= options.limit) return null;

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((current.resetAt - now) / 1000),
  );

  return apiError("Too many requests. Please try again later.", 429, {
    "Retry-After": String(retryAfterSeconds),
    "X-RateLimit-Limit": String(options.limit),
    "X-RateLimit-Remaining": "0",
    "X-RateLimit-Reset": String(Math.ceil(current.resetAt / 1000)),
  });
}

export function apiError(
  message: string,
  status: number,
  headers?: HeadersInit,
): NextResponse {
  return NextResponse.json({ error: message }, { headers, status });
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function getAllowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();
  const host = getFirstHeaderValue(
    request.headers.get("x-forwarded-host") || request.headers.get("host"),
  );
  const forwardedProto = getFirstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );

  if (host) {
    const proto =
      forwardedProto ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    addOrigin(origins, `${proto}://${host}`);

    if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
      addOrigin(origins, `http://${host}`);
      addOrigin(origins, `https://${host}`);
    }
  }

  [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.SITE_URL,
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ].forEach((value) => {
    if (!value) return;
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => addOrigin(origins, item));
  });

  return origins;
}

function getFirstHeaderValue(value: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}

function addOrigin(origins: Set<string>, value: string) {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    origins.add(url.origin);
  } catch {
    // Ignore invalid deployment metadata.
  }
}

function sweepExpiredRateLimits(now: number) {
  if (rateLimitStore.size < 1000) return;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}

async function hasActiveHostVillageMembership(
  auth: ApiAuthContext,
): Promise<boolean> {
  try {
    await activatePendingHostMembership(auth);

    const [membership] = await getDb()
      .select({ id: hostVillageMemberships.id })
      .from(hostVillageMemberships)
      .where(
        and(
          eq(hostVillageMemberships.userId, auth.user.id),
          eq(hostVillageMemberships.status, "active"),
        ),
      )
      .limit(1);

    return Boolean(membership);
  } catch {
    return false;
  }
}

async function activatePendingHostMembership(
  auth: ApiAuthContext,
): Promise<void> {
  const accountEmail = auth.profile.email.trim().toLowerCase();
  if (!accountEmail) return;

  await getDb()
    .update(hostVillageMemberships)
    .set({
      activatedAt: new Date(),
      status: "active",
      updatedAt: new Date(),
      userId: auth.user.id,
    })
    .where(
      and(
        eq(hostVillageMemberships.accountEmail, accountEmail),
        eq(hostVillageMemberships.status, "pending"),
        isNull(hostVillageMemberships.userId),
      ),
    );
}
