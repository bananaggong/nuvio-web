import { createHash } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { and, eq, isNull, sql } from "drizzle-orm";
import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { apiRateLimits, hostVillageMemberships } from "@/db/schema";
import {
  ensureUserProfile,
  getUserProfile,
  type AuthProfile,
} from "@/lib/auth-profile-db";
import { getConfirmedAuthEmail } from "@/lib/auth-email";
import { getLocalDevAuthContext } from "@/lib/local-dev-auth";
import { logServerPersistenceError } from "@/lib/server-error-diagnostics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ApiRole = AuthProfile["role"];

export type ApiAuthContext = {
  profile: AuthProfile;
  user: User;
};

export type ApiAuthResult = ApiAuthContext | { response: NextResponse };

type RateLimitOptions = {
  failureMode?: "deny" | "memory";
  identity?: string;
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
    unstable_rethrow(error);
    logServerPersistenceError("API authentication failed.", error);
    return {
      response: apiError("Authentication is unavailable.", 500),
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
  if (!rawLength) {
    return request.body ? apiError("Content-Length is required.", 411) : null;
  }

  const length = Number(rawLength);
  if (!Number.isInteger(length) || length < 0) {
    return apiError("Content-Length is invalid.", 400);
  }

  if (length <= maxBytes) return null;

  return apiError("Payload is too large.", 413);
}

export function enforceSameOrigin(request: Request): NextResponse | null {
  const allowedOrigins = getAllowedOrigins(request);
  const origin = normalizeRequestOrigin(request.headers.get("origin"));
  if (origin && allowedOrigins.has(origin)) return null;

  if (!origin) {
    const refererOrigin = normalizeRequestOrigin(request.headers.get("referer"));
    if (refererOrigin && allowedOrigins.has(refererOrigin)) return null;

    if (request.headers.get("sec-fetch-site") === "same-origin") return null;
  }

  return apiError("Cross-origin state-changing requests are not allowed.", 403);
}

export function applyRateLimit(
  request: Request,
  options: RateLimitOptions,
): NextResponse | null {
  const now = Date.now();
  const identity = options.identity || getClientIp(request);
  const key = `${options.key}:${identity}`;
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

export async function applyPersistentRateLimit(
  request: Request,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const nowMs = Date.now();
  const windowStartMs = Math.floor(nowMs / options.windowMs) * options.windowMs;
  const resetAtMs = windowStartMs + options.windowMs;
  const scope = normalizeRateLimitScope(options.key);
  const identity = normalizeRateLimitIdentity(options.identity || getClientIp(request));
  const identityHash = hashRateLimitValue(`${scope}:${identity}`);
  const bucketKey = hashRateLimitValue(`${scope}:${identityHash}:${windowStartMs}`);
  const now = new Date(nowMs);
  const windowStart = new Date(windowStartMs);
  const resetAt = new Date(resetAtMs);

  try {
    const [row] = await getDb()
      .insert(apiRateLimits)
      .values({
        bucketKey,
        count: 1,
        identityHash,
        resetAt,
        scope,
        updatedAt: now,
        windowStart,
      })
      .onConflictDoUpdate({
        target: apiRateLimits.bucketKey,
        set: {
          count: sql`${apiRateLimits.count} + 1`,
          updatedAt: now,
        },
      })
      .returning({ count: apiRateLimits.count, resetAt: apiRateLimits.resetAt });

    maybeCleanupPersistentRateLimits(nowMs);

    if (!row || row.count <= options.limit) return null;

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((row.resetAt.getTime() - nowMs) / 1000),
    );

    return apiError("Too many requests. Please try again later.", 429, {
      "Retry-After": String(retryAfterSeconds),
      "X-RateLimit-Limit": String(options.limit),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.ceil(row.resetAt.getTime() / 1000)),
    });
  } catch {
    if (options.failureMode === "deny") {
      return apiError("Request throttling is temporarily unavailable.", 503, {
        "Retry-After": "60",
      });
    }

    return applyRateLimit(request, options);
  }
}

export function asJsonRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}
export async function readJsonWithLimit(
  request: Request,
  maxBytes: number,
): Promise<{ body: unknown; response: NextResponse | null }> {
  const contentLengthError = enforceContentLength(request, maxBytes);
  if (contentLengthError) return { body: {}, response: contentLengthError };
  if (!request.body) return { body: {}, response: null };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    receivedBytes += value.byteLength;
    if (receivedBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return { body: {}, response: apiError("Payload is too large.", 413) };
    }

    chunks.push(value);
  }

  if (receivedBytes === 0) return { body: {}, response: null };

  const rawBody = new TextDecoder().decode(concatBytes(chunks, receivedBytes)).trim();
  if (!rawBody) return { body: {}, response: null };

  try {
    return { body: JSON.parse(rawBody) as unknown, response: null };
  } catch {
    return { body: {}, response: apiError("Invalid JSON payload.", 400) };
  }
}

function concatBytes(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const output = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

export function apiError(
  message: string,
  status: number,
  headers?: HeadersInit,
): NextResponse {
  return NextResponse.json({ error: message }, { headers, status });
}

let lastPersistentRateLimitCleanupAt = 0;

function maybeCleanupPersistentRateLimits(nowMs: number) {
  if (nowMs - lastPersistentRateLimitCleanupAt < 60_000) return;
  if (Math.random() > 0.02) return;

  lastPersistentRateLimitCleanupAt = nowMs;
  const expiredBefore = new Date(nowMs - 60_000);
  void getDb()
    .delete(apiRateLimits)
    .where(sql`${apiRateLimits.resetAt} < ${expiredBefore}`)
    .catch(() => undefined);
}

function normalizeRateLimitScope(value: string): string {
  return value.trim().replace(/[^a-z0-9_.:-]/giu, ":").slice(0, 120) || "default";
}

function normalizeRateLimitIdentity(value: string): string {
  return value.trim().toLowerCase().slice(0, 240) || "unknown";
}

function hashRateLimitValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getClientIp(request: Request): string {
  const forwardedFor =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for");
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

  if (host && process.env.NODE_ENV !== "production") {
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

  addOrigin(origins, "https://nuvio.kr");
  addOrigin(origins, "https://www.nuvio.kr");

  return origins;
}

function normalizeRequestOrigin(value: string | null): string {
  if (!value) return "";

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return "";
  }
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
  const accountEmail = getConfirmedAuthEmail(auth.user);
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
