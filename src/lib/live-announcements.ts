import { XMLParser } from "fast-xml-parser";
import { announcements, programs } from "./data";
import type {
  Announcement,
  AnnouncementType,
  LiveAnnouncement,
  Program,
} from "./types";

export type ExternalAnnouncementSource = {
  id: string;
  name: string;
  type: "rss";
  url: string;
  enabled?: boolean;
  keywords?: string[];
  minimumKeywordMatches?: number;
};

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

type SourceResult = {
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

const DEFAULT_REFRESH_SECONDS = 300;

const defaultAnnouncementSources: ExternalAnnouncementSource[] = [
  {
    id: "mcst-notice",
    name: "문화체육관광부 공지 RSS",
    type: "rss",
    url: "http://www.mcst.go.kr/common/rss/notice.jsp",
    keywords: ["관광", "여행", "지원", "공모", "모집", "체류", "워케이션"],
    minimumKeywordMatches: 0,
  },
];

const parser = new XMLParser({
  cdataPropName: "__cdata",
  ignoreAttributes: false,
  trimValues: true,
});

export function getAnnouncementRefreshSeconds(): number {
  const parsed = Number(process.env.ANNOUNCEMENT_REFRESH_SECONDS);
  if (!Number.isFinite(parsed) || parsed < 30) return DEFAULT_REFRESH_SECONDS;
  return Math.floor(parsed);
}

export async function getLiveAnnouncementFeed(
  options: { limit?: number } = {},
): Promise<LiveAnnouncementFeed> {
  const sources = getExternalAnnouncementSources();
  const sourceResults = await Promise.all(sources.map(fetchSourceAnnouncements));
  const externalItems = sourceResults.flatMap((result) => result.items);
  const internalItems = announcements.map(toLiveAnnouncement);
  const items = dedupeAnnouncements([...externalItems, ...internalItems])
    .sort(compareAnnouncements)
    .slice(0, options.limit ?? 40);

  return {
    items,
    meta: {
      refreshedAt: new Date().toISOString(),
      refreshSeconds: getAnnouncementRefreshSeconds(),
      internalCount: internalItems.length,
      externalCount: externalItems.length,
      sources: sourceResults.map((result) => ({
        id: result.source.id,
        name: result.source.name,
        url: result.source.url,
        itemCount: result.items.length,
        error: result.error,
      })),
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
  const rawSources = process.env.EXTERNAL_ANNOUNCEMENT_SOURCES;
  if (!rawSources) return defaultAnnouncementSources;

  try {
    const parsed = JSON.parse(rawSources) as unknown;
    const sourceList = Array.isArray(parsed) ? parsed : [parsed];
    const sources = sourceList
      .map(normalizeSource)
      .filter((source): source is ExternalAnnouncementSource => Boolean(source));

    return sources.length > 0 ? sources : defaultAnnouncementSources;
  } catch {
    return defaultAnnouncementSources;
  }
}

function normalizeSource(value: unknown): ExternalAnnouncementSource | null {
  if (!value || typeof value !== "object") return null;

  const source = value as Partial<ExternalAnnouncementSource>;
  if (!source.id || !source.name || !source.url) return null;
  if (source.enabled === false) return null;

  return {
    id: source.id,
    name: source.name,
    type: "rss",
    url: source.url,
    enabled: source.enabled,
    keywords: Array.isArray(source.keywords) ? source.keywords : [],
    minimumKeywordMatches:
      typeof source.minimumKeywordMatches === "number"
        ? source.minimumKeywordMatches
        : 0,
  };
}

async function fetchSourceAnnouncements(
  source: ExternalAnnouncementSource,
): Promise<SourceResult> {
  const timeout = AbortSignal.timeout(5_000);

  try {
    const response = await fetch(source.url, {
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

    const xml = await response.text();
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
  const sourceUrl = readLink(item.link) || source.url;
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
      "외부 원문에서 가져온 최신 공지입니다. 원문 링크에서 상세 조건을 확인하세요.",
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
    sourceName: "NUVIO 운영 공지",
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

  return relatedProgram?.id;
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
    const key = normalizeForMatch(item.sourceUrl || item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
