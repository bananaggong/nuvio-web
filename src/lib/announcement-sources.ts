export type ExternalAnnouncementSource = {
  id: string;
  name: string;
  type: "rss";
  url: string;
  enabled?: boolean;
  keywords?: string[];
  minimumKeywordMatches?: number;
  notes?: string;
};

export const DEFAULT_ANNOUNCEMENT_SOURCES: ExternalAnnouncementSource[] = [
  {
    id: "mcst-notice",
    name: "문화체육관광부 공지 RSS",
    type: "rss",
    url: "http://www.mcst.go.kr/common/rss/notice.jsp",
    keywords: ["관광", "여행", "지원", "공모", "모집", "체류", "워케이션"],
    minimumKeywordMatches: 0,
    notes: "문화체육관광부 공식 RSS 서비스의 공지 피드입니다.",
  },
  {
    id: "mcst-press",
    name: "문화체육관광부 보도자료 RSS",
    type: "rss",
    url: "http://www.mcst.go.kr/common/rss/press.jsp",
    keywords: ["관광", "여행", "지역", "체류", "워케이션", "지원사업"],
    minimumKeywordMatches: 1,
    notes: "정책 발표와 사업 보도자료를 보수적으로 후보화합니다.",
  },
  {
    id: "kocca-notice",
    name: "한국콘텐츠진흥원 공지 RSS",
    type: "rss",
    url: "http://www.kocca.kr/xml/notice/notice/rss_2.xml",
    keywords: ["관광", "여행", "지역", "체류", "콘텐츠", "모집", "지원"],
    minimumKeywordMatches: 2,
    notes: "문화·관광 연계 공모 후보를 보조 소스로 확인합니다.",
  },
];

export function getConfiguredAnnouncementSources(): ExternalAnnouncementSource[] {
  const rawSources = process.env.EXTERNAL_ANNOUNCEMENT_SOURCES;
  const parsedSources = rawSources ? parseExternalAnnouncementSources(rawSources) : [];
  const sources = parsedSources.length > 0 ? parsedSources : DEFAULT_ANNOUNCEMENT_SOURCES;
  const disabledIds = getDisabledSourceIds();

  return sources.filter(
    (source) => source.enabled !== false && !disabledIds.has(source.id),
  );
}

export function parseExternalAnnouncementSources(
  rawSources: string,
): ExternalAnnouncementSource[] {
  try {
    const parsed = JSON.parse(rawSources) as unknown;
    const sourceList = Array.isArray(parsed) ? parsed : [parsed];

    return sourceList
      .map(normalizeSource)
      .filter((source): source is ExternalAnnouncementSource => Boolean(source));
  } catch {
    return [];
  }
}

function normalizeSource(value: unknown): ExternalAnnouncementSource | null {
  if (!value || typeof value !== "object") return null;

  const source = value as Partial<ExternalAnnouncementSource>;
  if (!source.id || !source.name || !source.url) return null;

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
    notes: source.notes,
  };
}

function getDisabledSourceIds(): Set<string> {
  const rawValue = process.env.DISABLED_ANNOUNCEMENT_SOURCE_IDS ?? "";
  return new Set(
    rawValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}
