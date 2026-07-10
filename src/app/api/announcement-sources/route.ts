import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireAdminRole,
} from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import { getConfiguredAnnouncementSources } from "@/lib/announcement-sources";
import {
  listAnnouncementSourceStatuses,
  updateAnnouncementSource,
  upsertAnnouncementSource,
} from "@/lib/external-announcement-db";

export const runtime = "nodejs";

const MAX_ANNOUNCEMENT_SOURCE_PAYLOAD_BYTES = 32 * 1024;

export async function GET(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "admin-announcement-sources:list",
    limit: 90,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const sources = await listAnnouncementSourceStatuses();
    return NextResponse.json({ data: sources });
  } catch (error) {
    const fallbackSources = getConfiguredAnnouncementSources().map((source) => ({
      ...source,
      itemCount: 0,
      lastError:
        error instanceof Error
          ? error.message
          : "Failed to load announcement sources.",
    }));

    return NextResponse.json({ data: fallbackSources, degraded: true });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const limited = applyRateLimit(request, {
      key: "announcement-source:create",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (limited) return limited;

    const { body: rawBody, response } = await readJsonWithLimit(
      request,
      MAX_ANNOUNCEMENT_SOURCE_PAYLOAD_BYTES,
    );
    if (response) return response;
    const body = rawBody as Record<string, unknown>;
    const source = await upsertAnnouncementSource({
      id: normalizeId(String(body.id ?? body.name ?? body.url ?? "")),
      name: normalizeText(body.name, 120),
      type: "rss",
      url: normalizeUrl(body.url),
      enabled: body.enabled !== false,
      keywords: normalizeStringArray(body.keywords),
      minimumKeywordMatches: normalizeInteger(body.minimumKeywordMatches),
      notes: normalizeOptionalText(body.notes, 500),
    });

    void safeCreateAuditLog({
      action: "announcementSource.upsert",
      actorId: auth.user.id,
      entityId: source.id,
      entityType: "announcement_source",
      metadata: {
        enabled: source.enabled,
        name: source.name,
        type: source.type,
        url: source.url,
      },
    });

    return NextResponse.json({ data: source }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save announcement source.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const limited = applyRateLimit(request, {
      key: "announcement-source:update",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });
    if (limited) return limited;

    const { body: rawBody, response } = await readJsonWithLimit(
      request,
      MAX_ANNOUNCEMENT_SOURCE_PAYLOAD_BYTES,
    );
    if (response) return response;
    const body = rawBody as Record<string, unknown>;
    const sourceId = String(body.id ?? "").trim();
    if (!sourceId) {
      return NextResponse.json({ error: "Source id is required." }, { status: 400 });
    }

    const source = await updateAnnouncementSource(sourceId, {
      ...(typeof body.name === "string" ? { name: normalizeText(body.name, 120) } : {}),
      ...(typeof body.url === "string" ? { url: normalizeUrl(body.url) } : {}),
      ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
      ...(body.keywords !== undefined
        ? { keywords: normalizeStringArray(body.keywords) }
        : {}),
      ...(body.minimumKeywordMatches !== undefined
        ? { minimumKeywordMatches: normalizeInteger(body.minimumKeywordMatches) }
        : {}),
      ...(typeof body.notes === "string"
        ? { notes: normalizeOptionalText(body.notes, 500) }
        : {}),
    });

    if (!source) {
      return NextResponse.json({ error: "Source was not found." }, { status: 404 });
    }

    void safeCreateAuditLog({
      action: "announcementSource.update",
      actorId: auth.user.id,
      entityId: source.id,
      entityType: "announcement_source",
      metadata: {
        enabled: source.enabled,
        name: source.name,
        type: source.type,
        url: source.url,
      },
    });

    return NextResponse.json({ data: source });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update announcement source.",
      },
      { status: 400 },
    );
  }
}

function normalizeId(value: string): string {
  const id = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 64);

  if (!id) throw new Error("Source id could not be generated.");
  return id;
}

function normalizeStringArray(value: unknown): string[] {
  const normalize = (item: unknown) => String(item).trim().slice(0, 80);
  if (Array.isArray(value)) {
    return value.map(normalize).filter(Boolean).slice(0, 20);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map(normalize)
      .filter(Boolean)
      .slice(0, 20);
  }

  return [];
}

function normalizeInteger(value: unknown): number {
  const numericValue = Number(value);
  return Number.isInteger(numericValue)
    ? Math.max(0, Math.min(numericValue, 10))
    : 0;
}

function normalizeText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeOptionalText(value: unknown, maxLength: number): string | undefined {
  const text = normalizeText(value, maxLength);
  return text || undefined;
}

function normalizeUrl(value: unknown): string {
  const url = normalizeText(value, 500);
  if (!/^https?:\/\//iu.test(url)) {
    throw new Error("Announcement source URL must start with http:// or https://.");
  }
  return url;
}
