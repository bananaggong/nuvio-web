import { NextResponse } from "next/server";
import { getConfiguredAnnouncementSources } from "@/lib/announcement-sources";
import {
  listAnnouncementSourceStatuses,
  updateAnnouncementSource,
  upsertAnnouncementSource,
} from "@/lib/external-announcement-db";

export const runtime = "nodejs";

export async function GET() {
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
  try {
    const body = await request.json();
    const source = await upsertAnnouncementSource({
      id: normalizeId(String(body.id ?? body.name ?? body.url ?? "")),
      name: String(body.name ?? ""),
      type: "rss",
      url: String(body.url ?? ""),
      enabled: body.enabled !== false,
      keywords: normalizeStringArray(body.keywords),
      minimumKeywordMatches: normalizeInteger(body.minimumKeywordMatches),
      notes: typeof body.notes === "string" ? body.notes : undefined,
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
  try {
    const body = await request.json();
    const sourceId = String(body.id ?? "").trim();
    if (!sourceId) {
      return NextResponse.json({ error: "Source id is required." }, { status: 400 });
    }

    const source = await updateAnnouncementSource(sourceId, {
      ...(typeof body.name === "string" ? { name: body.name } : {}),
      ...(typeof body.url === "string" ? { url: body.url } : {}),
      ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
      ...(body.keywords !== undefined
        ? { keywords: normalizeStringArray(body.keywords) }
        : {}),
      ...(body.minimumKeywordMatches !== undefined
        ? { minimumKeywordMatches: normalizeInteger(body.minimumKeywordMatches) }
        : {}),
      ...(typeof body.notes === "string" ? { notes: body.notes } : {}),
    });

    if (!source) {
      return NextResponse.json({ error: "Source was not found." }, { status: 404 });
    }

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
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeInteger(value: unknown): number {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? Math.max(numericValue, 0) : 0;
}
