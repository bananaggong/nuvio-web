import { refreshExternalAnnouncementPipeline } from "@/lib/announcement-refresh";
import { shouldRefreshPersistedAnnouncements } from "@/lib/external-announcement-db";
import { getLiveAnnouncementFeed } from "@/lib/live-announcements";
import { buildProgramLeadsFromAnnouncements } from "@/lib/program-leads";
import type { LiveAnnouncement, PeriodKey, Program, ProgramStatus, ThemeKey } from "@/lib/types";

export async function listCrawledPrograms(limit = 80): Promise<Program[]> {
  await ensureFreshAnnouncementFeed();

  const feed = await getLiveAnnouncementFeed({ limit: 120 });
  const externalAnnouncements = feed.items.filter((item) => item.isExternal);
  const leads = buildProgramLeadsFromAnnouncements(externalAnnouncements, {
    limit,
    minimumScore: 2,
  });

  return leads.map((lead) => {
    const sourceAnnouncement = externalAnnouncements.find(
      (announcement) => announcement.id === lead.sourceAnnouncementId,
    );
    return mapAnnouncementLeadToProgram(sourceAnnouncement, {
      title: lead.title,
      summary: lead.summary,
      sourceAnnouncementId: lead.sourceAnnouncementId,
      sourceName: lead.sourceName,
      sourceUrl: lead.sourceUrl,
      publishedAt: lead.publishedAt,
      region: lead.suggestedRegion,
      themes: lead.suggestedThemes,
      score: lead.score,
    });
  });
}

export async function getCrawledProgramByIdentifier(
  identifier: string,
): Promise<Program | undefined> {
  const programs = await listCrawledPrograms(120);
  return programs.find(
    (program) => String(program.id) === identifier || program.slug === identifier,
  );
}

async function ensureFreshAnnouncementFeed() {
  try {
    const feed = await getLiveAnnouncementFeed({ limit: 1 });
    const refreshSeconds = feed.meta.refreshSeconds;

    if (await shouldRefreshPersistedAnnouncements(refreshSeconds)) {
      await refreshExternalAnnouncementPipeline();
    }
  } catch {
    // If persistence is unavailable, getLiveAnnouncementFeed will still fetch RSS on demand.
  }
}

function mapAnnouncementLeadToProgram(
  announcement: LiveAnnouncement | undefined,
  lead: {
    title: string;
    summary: string;
    sourceAnnouncementId: string;
    sourceName: string;
    sourceUrl?: string;
    publishedAt: string;
    region?: string;
    themes: ThemeKey[];
    score: number;
  },
): Program {
  const publishedDate = normalizeDate(lead.publishedAt);
  const recruitEnd = inferRecruitEnd(lead.title, announcement?.body, publishedDate);
  const theme = lead.themes[0] ?? "event";
  const sourceUrl = lead.sourceUrl || announcement?.sourceUrl || "";
  const sourceName = lead.sourceName || announcement?.sourceName || "외부 공고";
  const slug = createSlug(`${lead.title}-${stableHash(sourceUrl || lead.sourceAnnouncementId)}`);

  return {
    id: `crawl-${stableHash(sourceUrl || lead.sourceAnnouncementId || lead.title)}`,
    title: lead.title,
    slug,
    region: lead.region ?? inferRegion(`${lead.title} ${announcement?.body ?? ""}`),
    city: "원문 확인",
    isGlobal: false,
    summary: lead.summary || announcement?.body || lead.title,
    description:
      announcement?.body ||
      "공식 공고에서 수집한 모집/지원사업 후보입니다. 세부 일정과 지원 조건은 원문에서 확인해야 합니다.",
    theme,
    categories: Array.from(new Set<ThemeKey>([theme, ...lead.themes, "benefit"])),
    hashtags: buildHashtags(lead.themes, lead.region, sourceName),
    periodKey: inferPeriodKey(theme, `${lead.title} ${announcement?.body ?? ""}`),
    activityStart: publishedDate,
    activityEnd: addDays(publishedDate, 45),
    recruitStart: publishedDate,
    recruitEnd,
    target: "원문 확인",
    capacity: "원문 확인",
    announcement: "공식 공고 원문 기준",
    subsidyLabel: "원문 확인",
    subsidyAmount: 0,
    fee: "원문 확인",
    applicants: 0,
    status: inferStatus(`${lead.title} ${announcement?.body ?? ""}`),
    sourceName,
    sourceUrl,
    applyUrl: sourceUrl,
    phone: "원문 확인",
    image: fallbackImage,
    gallery: [fallbackImage],
    badges: ["공식 공고 수집", `점수 ${lead.score}`, sourceName],
    body: [
      announcement?.body || lead.summary || lead.title,
      "NUVIO가 공식 RSS/공고 소스에서 자동 수집한 후보입니다. 신청 가능 여부, 마감일, 지원금, 제출 서류는 원문 링크를 기준으로 확인하세요.",
    ],
    dataSource: "external",
    sourcePublishedAt: publishedDate,
    sourceFetchedAt: announcement?.fetchedAt,
  };
}

function inferStatus(text: string): ProgramStatus {
  const normalized = normalizeForMatch(text);
  if (["마감", "종료", "조기"].some((word) => normalized.includes(word))) {
    return "closed";
  }
  if (["모집", "접수", "공모", "참여자", "신청"].some((word) => normalized.includes(word))) {
    return "open";
  }
  return "upcoming";
}

function inferPeriodKey(theme: ThemeKey, text: string): PeriodKey {
  const normalized = normalizeForMatch(text);
  if (theme === "month" || normalized.includes("한달")) return "month";
  if (normalized.includes("2주") || normalized.includes("이주")) return "twoWeeks";
  if (normalized.includes("3주") || normalized.includes("삼주")) return "threeWeeks";
  if (normalized.includes("당일") || normalized.includes("1박") || normalized.includes("2박")) {
    return "under4";
  }
  return "week";
}

function inferRecruitEnd(title: string, body: string | undefined, publishedDate: string): string {
  const text = `${title} ${body ?? ""}`;
  const dateMatch = text.match(/(\d{4})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/u);
  if (dateMatch) {
    return toDateString(
      new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]))),
    );
  }

  return addDays(publishedDate, 30);
}

function inferRegion(text: string): string {
  const normalized = normalizeForMatch(text);
  const region = regions.find((item) => normalized.includes(normalizeForMatch(item)));
  return region ?? "전국";
}

function buildHashtags(themes: ThemeKey[], region: string | undefined, sourceName: string): string[] {
  const labels = themes.map((theme) => themeLabelMap[theme] ?? theme);
  return Array.from(
    new Set(
      [region, ...labels, sourceName, "실시간수집"].filter(
        (item): item is string => Boolean(item),
      ),
    ),
  ).slice(0, 8);
}

function normalizeDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return toDateString(new Date());
  return toDateString(parsed);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createSlug(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 90);
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/\s+/gu, "");
}

function stableHash(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

const regions = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

const themeLabelMap: Record<ThemeKey, string> = {
  short: "짧은여행",
  month: "한달살기",
  workation: "워케이션",
  local: "로컬",
  returnFarm: "귀농귀촌",
  event: "공모",
  pet: "반려동물",
  half: "반값여행",
  daily: "생활혜택",
  family: "가족",
  easy: "간편신청",
  benefit: "지원혜택",
  exclusive: "전용모집",
};

const fallbackImage =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80";
