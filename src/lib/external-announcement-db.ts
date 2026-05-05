import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  externalAnnouncements,
  externalAnnouncementSources,
} from "@/db/schema";
import {
  DEFAULT_ANNOUNCEMENT_SOURCES,
  getConfiguredAnnouncementSources,
} from "@/lib/announcement-sources";
import type { ExternalAnnouncementSource } from "@/lib/announcement-sources";
import type { LiveAnnouncement } from "@/lib/types";

type SourceRow = typeof externalAnnouncementSources.$inferSelect;
type SourceInsert = typeof externalAnnouncementSources.$inferInsert;

export type AnnouncementSourceStatus = ExternalAnnouncementSource & {
  lastFetchedAt?: string;
  lastError?: string | null;
  itemCount: number;
};

export async function listRuntimeAnnouncementSources(): Promise<
  ExternalAnnouncementSource[]
> {
  try {
    const databaseSources = await listAnnouncementSourcesFromDb();
    const configuredSources = getConfiguredAnnouncementSources();
    const byId = new Map<string, ExternalAnnouncementSource>();

    for (const source of configuredSources) {
      if (source.enabled !== false) byId.set(source.id, source);
    }

    for (const source of databaseSources) {
      if (source.enabled !== false) byId.set(source.id, source);
      else byId.delete(source.id);
    }

    return [...byId.values()];
  } catch {
    return getConfiguredAnnouncementSources();
  }
}

export async function listAnnouncementSourceStatuses(): Promise<
  AnnouncementSourceStatus[]
> {
  const rows = await getDb()
    .select()
    .from(externalAnnouncementSources)
    .orderBy(desc(externalAnnouncementSources.updatedAt))
    .limit(200);
  const counts = await getAnnouncementCountsBySource();
  const merged = mergeConfiguredSources(rows.map(mapSourceRowToSource));

  return merged.map((source) => {
    const row = rows.find((item) => item.id === source.id);

    return {
      ...source,
      lastFetchedAt: row?.lastFetchedAt?.toISOString(),
      lastError: row?.lastError,
      itemCount: counts.get(source.id) ?? 0,
    };
  });
}

export async function listPersistedExternalAnnouncements(
  limit = 40,
): Promise<LiveAnnouncement[]> {
  const rows = await getDb()
    .select({
      id: externalAnnouncements.id,
      sourceId: externalAnnouncements.sourceId,
      sourceName: externalAnnouncementSources.name,
      title: externalAnnouncements.title,
      body: externalAnnouncements.body,
      type: externalAnnouncements.type,
      sourceUrl: externalAnnouncements.sourceUrl,
      publishedAt: externalAnnouncements.publishedAt,
      relevance: externalAnnouncements.relevance,
      fetchedAt: externalAnnouncements.fetchedAt,
    })
    .from(externalAnnouncements)
    .leftJoin(
      externalAnnouncementSources,
      eq(externalAnnouncements.sourceId, externalAnnouncementSources.id),
    )
    .orderBy(desc(externalAnnouncements.publishedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    date: row.publishedAt.toISOString(),
    body: row.body,
    sourceId: row.sourceId ?? undefined,
    sourceName: row.sourceName ?? "External source",
    sourceUrl: row.sourceUrl,
    isExternal: true,
    relevance: row.relevance,
    fetchedAt: row.fetchedAt.toISOString(),
  }));
}

export async function upsertAnnouncementSource(
  source: ExternalAnnouncementSource,
): Promise<AnnouncementSourceStatus> {
  const [row] = await getDb()
    .insert(externalAnnouncementSources)
    .values(mapSourceToInsert(source))
    .onConflictDoUpdate({
      target: externalAnnouncementSources.id,
      set: {
        name: source.name,
        type: source.type,
        url: source.url,
        enabled: source.enabled ?? true,
        keywords: source.keywords ?? [],
        minimumKeywordMatches: source.minimumKeywordMatches ?? 0,
        notes: source.notes ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    ...mapSourceRowToSource(row),
    lastFetchedAt: row.lastFetchedAt?.toISOString(),
    lastError: row.lastError,
    itemCount: 0,
  };
}

export async function updateAnnouncementSource(
  sourceId: string,
  patch: Partial<ExternalAnnouncementSource>,
): Promise<AnnouncementSourceStatus | undefined> {
  const [row] = await getDb()
    .update(externalAnnouncementSources)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.url !== undefined ? { url: patch.url } : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      ...(patch.keywords !== undefined ? { keywords: patch.keywords } : {}),
      ...(patch.minimumKeywordMatches !== undefined
        ? { minimumKeywordMatches: patch.minimumKeywordMatches }
        : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(externalAnnouncementSources.id, sourceId))
    .returning();

  if (!row) return undefined;

  return {
    ...mapSourceRowToSource(row),
    lastFetchedAt: row.lastFetchedAt?.toISOString(),
    lastError: row.lastError,
    itemCount: (await getAnnouncementCountsBySource()).get(sourceId) ?? 0,
  };
}

export async function persistAnnouncementFetchResults(
  results: Array<{
    source: ExternalAnnouncementSource;
    items: LiveAnnouncement[];
    error?: string;
  }>,
): Promise<{
  sourceCount: number;
  insertedAnnouncementCount: number;
  errors: Array<{ sourceId: string; message: string }>;
}> {
  const now = new Date();
  let insertedAnnouncementCount = 0;
  const errors: Array<{ sourceId: string; message: string }> = [];

  for (const result of results) {
    await getDb()
      .insert(externalAnnouncementSources)
      .values({
        ...mapSourceToInsert(result.source),
        lastFetchedAt: now,
        lastError: result.error ?? null,
      })
      .onConflictDoUpdate({
        target: externalAnnouncementSources.id,
        set: {
          name: result.source.name,
          type: result.source.type,
          url: result.source.url,
          enabled: result.source.enabled ?? true,
          keywords: result.source.keywords ?? [],
          minimumKeywordMatches: result.source.minimumKeywordMatches ?? 0,
          notes: result.source.notes ?? null,
          lastFetchedAt: now,
          lastError: result.error ?? null,
          updatedAt: now,
        },
      });

    if (result.error) {
      errors.push({ sourceId: result.source.id, message: result.error });
    }

    for (const item of result.items) {
      await getDb()
        .insert(externalAnnouncements)
        .values({
          id: item.id,
          sourceId: result.source.id,
          title: item.title,
          body: item.body,
          type: item.type,
          sourceUrl: item.sourceUrl ?? result.source.url,
          publishedAt: new Date(item.date),
          relevance: item.relevance,
          raw: {
            sourceId: result.source.id,
            sourceName: result.source.name,
            fetchedAt: now.toISOString(),
          },
          fetchedAt: now,
        })
        .onConflictDoUpdate({
          target: externalAnnouncements.id,
          set: {
            title: item.title,
            body: item.body,
            type: item.type,
            sourceUrl: item.sourceUrl ?? result.source.url,
            publishedAt: new Date(item.date),
            relevance: item.relevance,
            raw: {
              sourceId: result.source.id,
              sourceName: result.source.name,
              fetchedAt: now.toISOString(),
            },
            fetchedAt: now,
          },
        });
      insertedAnnouncementCount += 1;
    }
  }

  return {
    sourceCount: results.length,
    insertedAnnouncementCount,
    errors,
  };
}

async function listAnnouncementSourcesFromDb(): Promise<ExternalAnnouncementSource[]> {
  const rows = await getDb()
    .select()
    .from(externalAnnouncementSources)
    .orderBy(desc(externalAnnouncementSources.updatedAt))
    .limit(200);

  return rows.map(mapSourceRowToSource);
}

async function getAnnouncementCountsBySource(): Promise<Map<string, number>> {
  const rows = await getDb()
    .select({
      sourceId: externalAnnouncements.sourceId,
    })
    .from(externalAnnouncements)
    .limit(5000);
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!row.sourceId) continue;
    counts.set(row.sourceId, (counts.get(row.sourceId) ?? 0) + 1);
  }

  return counts;
}

function mergeConfiguredSources(
  databaseSources: ExternalAnnouncementSource[],
): ExternalAnnouncementSource[] {
  const merged = new Map<string, ExternalAnnouncementSource>();

  for (const source of DEFAULT_ANNOUNCEMENT_SOURCES) {
    merged.set(source.id, source);
  }

  for (const source of getConfiguredAnnouncementSources()) {
    merged.set(source.id, source);
  }

  for (const source of databaseSources) {
    merged.set(source.id, source);
  }

  return [...merged.values()];
}

function mapSourceRowToSource(row: SourceRow): ExternalAnnouncementSource {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    enabled: row.enabled,
    keywords: row.keywords,
    minimumKeywordMatches: row.minimumKeywordMatches,
    notes: row.notes ?? undefined,
  };
}

function mapSourceToInsert(source: ExternalAnnouncementSource): SourceInsert {
  return {
    id: source.id,
    name: source.name,
    type: source.type,
    url: source.url,
    enabled: source.enabled ?? true,
    keywords: source.keywords ?? [],
    minimumKeywordMatches: source.minimumKeywordMatches ?? 0,
    notes: source.notes ?? null,
  };
}
