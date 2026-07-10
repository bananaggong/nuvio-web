import { XMLParser } from "fast-xml-parser";
import { getConfiguredAnnouncementSources } from "./announcement-sources";
import { announcements, programs } from "./data";
import {
  listAnnouncementSourceStatuses,
  listPersistedExternalAnnouncements,
  listRuntimeAnnouncementSources,
} from "./external-announcement-db";
import {
  fetchPublicHttpUrl,
  readLimitedResponseText,
} from "./outbound-fetch-security";
import type { ExternalAnnouncementSource } from "./announcement-sources";
import type {
  Announcement,
  AnnouncementType,
  LiveAnnouncement,
  Program,
} from "./types";
import { trySanitizeHttpUrl } from "./url-security";

type RssDocument = {
  rss?: {
    channel?: {
      item?: RssItem | RssItem[];
    };
  };
  feed?: {
    entry?: RssItem | RssItem[];
  };
};

type RssItem = Record<string, unknown>;

export type SourceResult = {
  source: ExternalAnnouncementSource;
  items: LiveAnnouncement[];
  error?: string;
};

export type LiveAnnouncementFeed = {
  items: LiveAnnouncement[];
  meta: {
    refreshedAt: string;
    refreshSeconds: number;
    internalCount: number;
    externalCount: number;
    sources: Array<{
      id: string;
      name: string;
      url: string;
      itemCount: number;
      error?: string;
    }>;
  };
};

const DEFAULT_REFRESH_SECONDS = 43_200;
const MAX_RSS_RESPONSE_BYTES = 1024 * 1024;

const parser = new XMLParser({
  cdataPropName: "__cdata",
  ignoreAttributes: false,
  trimValues: true,
});

export function getAnnouncementRefreshSeconds(): number {
  const parsed = Number(process.env.ANNOUNCEMENT_REFRESH_SECONDS);
  if (!Number.isFinite(parsed) || parsed < 3_600) return DEFAULT_REFRESH_SECONDS;
  return Math.floor(parsed);
}

export async function getLiveAnnouncementFeed(
  options: { limit?: number; forceRefresh?: boolean } = {},
): Promise<LiveAnnouncementFeed> {
  const limit = options.limit ?? 40;
  const persistedFeed = await getPersistedExternalFeed(limit, options.forceRefresh);
  const externalItems = persistedFeed.items;
  const internalItems = announcements.map(toLiveAnnouncement);
  const items = dedupeAnnouncements([...externalItems, ...internalItems])
    .sort(compareAnnouncements)
    .slice(0, limit);

  return {
    items,
    meta: {
      refreshedAt: new Date().toISOString(),
      refreshSeconds: getAnnouncementRefreshSeconds(),
      internalCount: internalItems.length,
      externalCount: externalItems.length,
      sources: persistedFeed.sources,
    },
  };
}

export async function fetchLiveAnnouncements(
  limit = 40,
): Promise<LiveAnnouncement[]> {
  const feed = await getLiveAnnouncementFeed({ limit });
  return feed.items;
}

function getExternalAnnouncementSources(): ExternalAnnouncementSource[] {
  return getConfiguredAnnouncementSources();
}

export async function getRuntimeExternalAnnouncementSources(): Promise<
  ExternalAnnouncementSource[]
> {
  return listRuntimeAnnouncementSources();
}

export async function fetchExternalAnnouncementResults(
  sources?: ExternalAnnouncementSource[],
): Promise<SourceResult[]> {
  const sourceList = sources ?? (await getRuntimeExternalAnnouncementSources());
  return Promise.all(sourceList.map(fetchSourceAnnouncements));
}

async function getPersistedExternalFeed(
  limit: number,
  forceRefresh = false,
): Promise<{
  items: LiveAnnouncement[];
  sources: LiveAnnouncementFeed["meta"]["sources"];
}> {
  if (!forceRefresh) {
    try {
      const [items, sourceStatuses] = await Promise.all([
        listPersistedExternalAnnouncements(limit),
        listAnnouncementSourceStatuses(),
      ]);

      if (items.length > 0 || sourceStatuses.length > 0) {
        return {
          items,
          sources: sourceStatuses.map((source) => ({
            id: source.id,
            name: source.name,
            url: source.url,
            itemCount: source.itemCount,
            error: source.lastError ?? undefined,
          })),
        };
      }
    } catch {
      // Fall through to on-demand fetching when the database is not ready.
    }
  }

  const sourceResults = await fetchExternalAnnouncementResults(
    getExternalAnnouncementSources(),
  );
  const items = dedupeAnnouncements(
    sourceResults.flatMap((result) => result.items),
  );

  return {
    items,
    sources: sourceResults.map((result) => ({
      id: result.source.id,
      name: result.source.name,
      url: result.source.url,
      itemCount: result.items.length,
      error: result.error,
    })),
  };
}

async function fetchSourceAnnouncements(
  source: ExternalAnnouncementSource,
): Promise<SourceResult> {
  const timeout = AbortSignal.timeout(5_000);

  try {
    const response = await fetchPublicHttpUrl(source.url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "NUVIO/0.1 (+https://github.com/bananaggong/nuvio-web)",
      },
      next: { revalidate: getAnnouncementRefreshSeconds() },
      signal: timeout,
    });

    if (!response.ok) {
      return {
        source,
        items: [],
        error: `HTTP ${response.status}`,
      };
    }

    const xml = await readLimitedResponseText(response, MAX_RSS_RESPONSE_BYTES);
    const parsed = parser.parse(xml) as RssDocument;
    const rssItems = getFeedItems(parsed);
    const items = rssItems
      .map((item) => normalizeRssItem(item, source))
      .filter((item): item is LiveAnnouncement => Boolean(item));

    return { source, items };
  } catch (error) {
    return {
      source,
      items: [],
      error: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

function getFeedItems(parsed: RssDocument): RssItem[] {
  const rssItems = parsed.rss?.channel?.item;
  const atomEntries = parsed.feed?.entry;
  return toArray(rssItems ?? atomEntries);
}

function normalizeRssItem(
  item: RssItem,
  source: ExternalAnnouncementSource,
): LiveAnnouncement | null {
  const title = stripMarkup(readText(item.title));
  if (!title) return null;

  const description = stripMarkup(
    readText(item.description) || readText(item.summary) || readText(item.content),
  );
  const sourceUrl =
    trySanitizeHttpUrl(readLink(item.link)) || trySanitizeHttpUrl(source.url);
  const date = normalizeDate(
    readText(item.pubDate) || readText(item.updated) || readText(item.published),
  );
  const textForMatching = `${title} ${description}`;
  const relevance = calculateKeywordMatches(textForMatching, source.keywords);

  if (relevance < (source.minimumKeywordMatches ?? 0)) return null;

  return {
    id: `external-${source.id}-${stableHash(sourceUrl || title)}`,
    title,
    type: inferAnnouncementType(textForMatching),
    date,
    body:
      description ||
      "공식 외부 소스에서 가져온 최신 공고입니다. 세부 조건은 원문 링크에서 확인하세요.",
    programId: findRelatedProgramId(textForMatching),
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl,
    isExternal: true,
    relevance,
    fetchedAt: new Date().toISOString(),
  };
}

function toLiveAnnouncement(announcement: Announcement): LiveAnnouncement {
  return {
    ...announcement,
    id: `internal-${announcement.id}`,
    internalId: announcement.id,
    sourceId: "nuvio",
    sourceName: "누비오 운영 공지",
    sourceUrl: `/announcements/${announcement.id}`,
    isExternal: false,
    relevance: 99,
  };
}

function calculateKeywordMatches(
  text: string,
  keywords: string[] | undefined,
): number {
  if (!keywords || keywords.length === 0) return 1;

  const normalizedText = normalizeForMatch(text);
  return keywords.reduce((score, keyword) => {
    return normalizedText.includes(normalizeForMatch(keyword)) ? score + 1 : score;
  }, 0);
}

function inferAnnouncementType(text: string): AnnouncementType {
  const normalized = normalizeForMatch(text);

  if (["마감", "종료", "조기"].some((keyword) => normalized.includes(keyword))) {
    return "close";
  }

  if (["변경", "연기", "수정", "정정"].some((keyword) => normalized.includes(keyword))) {
    return "change";
  }

  if (["모집", "공모", "접수", "공고", "선정"].some((keyword) => normalized.includes(keyword))) {
    return "open";
  }

  return "notice";
}

function findRelatedProgramId(text: string): number | undefined {
  const normalizedText = normalizeForMatch(text);
  const relatedProgram = programs.find((program) =>
    getProgramTokens(program).some((token) => {
      const normalizedToken = normalizeForMatch(token);
      return normalizedToken.length >= 2 && normalizedText.includes(normalizedToken);
    }),
  );

  return typeof relatedProgram?.id === "number" ? relatedProgram.id : undefined;
}

function getProgramTokens(program: Program): string[] {
  return [
    program.region,
    program.city,
    program.city.replace(/[시군구]$/u, ""),
    ...program.hashtags,
  ].filter(Boolean);
}

function readText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    return readText(objectValue.__cdata ?? objectValue["#text"]);
  }

  return "";
}

function readLink(value: unknown): string {
  if (Array.isArray(value)) {
    const alternate = value.find((item) => {
      if (!item || typeof item !== "object") return false;
      const relation = (item as Record<string, unknown>)["@_rel"];
      return !relation || relation === "alternate";
    });

    return readLink(alternate ?? value[0]);
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    return readText(objectValue["@_href"] ?? objectValue.__cdata ?? objectValue["#text"]);
  }

  return readText(value);
}

function normalizeDate(value: string): string {
  const normalizedValue = value.replace(/\sKST$/u, " +0900");
  const parsed = normalizedValue ? new Date(normalizedValue) : new Date();
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function stripMarkup(value: string): string {
  return value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/\s+/gu, "");
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function dedupeAnnouncements(items: LiveAnnouncement[]): LiveAnnouncement[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const keys = getAnnouncementDedupeKeys(item);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

function getAnnouncementDedupeKeys(item: LiveAnnouncement): string[] {
  const keys = new Set<string>();
  const canonicalUrl = canonicalizeUrlForDedupe(item.sourceUrl);

  if (canonicalUrl) keys.add(`url:${normalizeForMatch(canonicalUrl)}`);
  if (item.title) keys.add(`title:${normalizeForMatch(item.title)}`);

  return [...keys];
}

function canonicalizeUrlForDedupe(value: string | undefined): string {
  if (!value) return "";

  try {
    const fallbackOrigin = "https://nuvio.kr";
    const url = new URL(value, fallbackOrigin);
    ["menuNo", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
      (parameter) => url.searchParams.delete(parameter),
    );
    url.hash = "";
    return url.origin === fallbackOrigin
      ? `${url.pathname}${url.search}`
      : url.toString();
  } catch {
    return value;
  }
}

function compareAnnouncements(a: LiveAnnouncement, b: LiveAnnouncement): number {
  const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
  if (dateDiff !== 0) return dateDiff;
  return b.relevance - a.relevance;
}

function stableHash(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
