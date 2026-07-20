import { NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-security";
import { readLimitedResponseText } from "@/lib/outbound-fetch-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NAVER_USERINFO_URL = "https://openapi.naver.com/v1/nid/me";
const NAVER_USERINFO_TIMEOUT_MS = 5_000;
const NAVER_USERINFO_MAX_RESPONSE_BYTES = 16 * 1024;
const NAVER_ACCESS_TOKEN_MAX_LENGTH = 4_096;
const NAVER_USERINFO_RATE_LIMIT = {
  key: "auth-naver-userinfo:get",
  limit: 60,
  windowMs: 60 * 1000,
};
const bearerTokenPattern = /^[A-Za-z0-9._~+\/-]+=*$/u;
const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
};

type JsonRecord = Record<string, unknown>;

export async function GET(request: Request) {
  const accessToken = getBearerToken(request.headers.get("authorization"));
  if (!accessToken) return unauthorizedResponse();

  const limited = applyRateLimit(request, NAVER_USERINFO_RATE_LIMIT);
  if (limited) {
    limited.headers.set("Cache-Control", privateNoStoreHeaders["Cache-Control"]);
    limited.headers.set("Pragma", privateNoStoreHeaders.Pragma);
    return limited;
  }

  try {
    const response = await fetch(NAVER_USERINFO_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(NAVER_USERINFO_TIMEOUT_MS),
    });
    const responseText = await readLimitedResponseText(
      response,
      NAVER_USERINFO_MAX_RESPONSE_BYTES,
    );

    if (!response.ok) {
      return response.status === 401 || response.status === 403
        ? unauthorizedResponse()
        : upstreamFailureResponse();
    }

    const payload = parseJsonRecord(responseText);
    if (!payload) return upstreamFailureResponse();
    if (payload.resultcode !== "00") return unauthorizedResponse();

    const profile = asJsonRecord(payload.response);
    const subject = normalizeSubject(profile?.id);
    const email = normalizeEmail(profile?.email);
    if (!subject || !email) return upstreamFailureResponse();

    return jsonResponse(
      {
        email,
        email_verified: true,
        sub: subject,
      },
      200,
    );
  } catch {
    return upstreamFailureResponse();
  }
}

function getBearerToken(value: string | null): string | null {
  if (!value || value.length > NAVER_ACCESS_TOKEN_MAX_LENGTH + 7) return null;

  if (value.slice(0, 7).toLowerCase() !== "bearer ") return null;
  const token = value.slice(7);
  if (
    !token ||
    token.length > NAVER_ACCESS_TOKEN_MAX_LENGTH ||
    !bearerTokenPattern.test(token)
  ) {
    return null;
  }

  return token;
}

function parseJsonRecord(value: string): JsonRecord | null {
  if (!value.trim()) return null;

  try {
    return asJsonRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function asJsonRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function normalizeSubject(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const subject = value.trim();
  if (
    !subject ||
    subject.length > 255 ||
    /[\u0000-\u001f\u007f]/u.test(subject)
  ) {
    return null;
  }

  return subject;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();
  if (
    !email ||
    email.length > 320 ||
    /[\u0000-\u001f\u007f]/u.test(email) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)
  ) {
    return null;
  }

  return email;
}

function unauthorizedResponse() {
  return jsonResponse({ error: "unauthorized" }, 401);
}

function upstreamFailureResponse() {
  return jsonResponse({ error: "upstream_unavailable" }, 502);
}

function jsonResponse(body: JsonRecord, status: number) {
  return NextResponse.json(body, {
    headers: privateNoStoreHeaders,
    status,
  });
}
