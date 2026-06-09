import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
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

export async function requireHostRole(): Promise<ApiAuthResult> {
  return requireAuthenticatedUser();
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

function sweepExpiredRateLimits(now: number) {
  if (rateLimitStore.size < 1000) return;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}
