import { regions } from "./data";
import { getLiveAnnouncementFeed } from "./live-announcements";
import type { LiveAnnouncement, ProgramLead, ThemeKey } from "./types";

type KeywordRule = {
  words: string[];
  reason: string;
  score: number;
};

const positiveRules: KeywordRule[] = [
  {
    words: ["모집", "접수", "참가자", "체험단", "서포터즈"],
    reason: "모집/접수 성격",
    score: 3,
  },
  {
    words: ["지원", "보조", "선정", "공모", "사업"],
    reason: "지원사업 가능성",
    score: 2,
  },
  {
    words: ["관광", "여행", "체류", "워케이션", "한달살기", "지역살이"],
    reason: "여행지원금 주제",
    score: 3,
  },
  {
    words: ["숙박", "교통", "체험", "리워드", "페이백", "할인"],
    reason: "혜택/비용 지원 단서",
    score: 2,
  },
];

const negativeRules: KeywordRule[] = [
  {
    words: ["행정처분", "제재부가금", "공시송달", "인사발령", "채용"],
    reason: "프로그램 모집과 관련 낮음",
    score: -4,
  },
  {
    words: ["규정 개정", "의견수렴", "권리협회", "수수료"],
    reason: "제도 안내 성격",
    score: -2,
  },
];

const themeRules: Array<{ theme: ThemeKey; words: string[] }> = [
  { theme: "workation", words: ["워케이션", "원격근무", "리모트"] },
  { theme: "month", words: ["한달살기", "장기체류", "체류", "지역살이"] },
  { theme: "half", words: ["반값", "페이백", "환급", "할인"] },
  { theme: "local", words: ["로컬", "지역", "마을", "생활관광"] },
  { theme: "returnFarm", words: ["귀농", "귀촌", "농촌", "어촌"] },
  { theme: "event", words: ["공모", "이벤트", "서포터즈", "체험단"] },
  { theme: "family", words: ["가족", "아이", "아동"] },
  { theme: "pet", words: ["반려", "반려견", "반려동물"] },
  { theme: "benefit", words: ["지원", "보조", "리워드", "쿠폰"] },
];

const regionCandidates = [
  ...regions.filter((region) => region !== "전체" && region !== "전국" && region !== "해외"),
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

export type ProgramLeadFeed = {
  items: ProgramLead[];
  meta: {
    generatedAt: string;
    sourceAnnouncementCount: number;
    candidateCount: number;
    minimumScore: number;
  };
};

export async function getProgramLeadFeed(
  options: { limit?: number; minimumScore?: number } = {},
): Promise<ProgramLeadFeed> {
  const announcementFeed = await getLiveAnnouncementFeed({ limit: 80 });
  const minimumScore = options.minimumScore ?? getProgramLeadMinimumScore();
  const externalAnnouncements = announcementFeed.items.filter(
    (announcement) => announcement.isExternal,
  );
  const items = externalAnnouncements
    .map(toProgramLead)
    .filter((lead): lead is ProgramLead => Boolean(lead))
    .filter((lead) => lead.score >= minimumScore)
    .sort((a, b) => b.score - a.score || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, options.limit ?? 20);

  return {
    items,
    meta: {
      generatedAt: new Date().toISOString(),
      sourceAnnouncementCount: externalAnnouncements.length,
      candidateCount: items.length,
      minimumScore,
    },
  };
}

function getProgramLeadMinimumScore(): number {
  const parsed = Number(process.env.PROGRAM_LEAD_MIN_SCORE);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(Math.floor(parsed), 0);
}

function toProgramLead(announcement: LiveAnnouncement): ProgramLead | null {
  const text = `${announcement.title} ${announcement.body}`;
  const normalizedText = normalize(text);
  const positiveMatches = evaluateRules(normalizedText, positiveRules);
  const negativeMatches = evaluateRules(normalizedText, negativeRules);
  const score =
    announcement.relevance +
    positiveMatches.reduce((sum, match) => sum + match.score, 0) +
    negativeMatches.reduce((sum, match) => sum + match.score, 0);

  if (score <= 0) return null;

  const themes = inferThemes(normalizedText);

  return {
    id: `lead-${announcement.id}`,
    title: announcement.title,
    summary: buildSummary(announcement),
    sourceAnnouncementId: announcement.id,
    sourceName: announcement.sourceName,
    sourceUrl: announcement.sourceUrl,
    publishedAt: announcement.date,
    confidence: score >= 7 ? "high" : score >= 4 ? "medium" : "low",
    score,
    suggestedRegion: inferRegion(normalizedText),
    suggestedThemes: themes.length > 0 ? themes : ["event"],
    suggestedStatus: announcement.type === "close" ? "closed" : "upcoming",
    reasons: [
      ...positiveMatches.map((match) => match.reason),
      ...negativeMatches.map((match) => match.reason),
    ],
  };
}

function evaluateRules(
  normalizedText: string,
  rules: KeywordRule[],
): Array<{ reason: string; score: number }> {
  return rules
    .filter((rule) => rule.words.some((word) => normalizedText.includes(normalize(word))))
    .map((rule) => ({ reason: rule.reason, score: rule.score }));
}

function inferThemes(normalizedText: string): ThemeKey[] {
  return themeRules
    .filter((rule) => rule.words.some((word) => normalizedText.includes(normalize(word))))
    .map((rule) => rule.theme);
}

function inferRegion(normalizedText: string): string | undefined {
  return regionCandidates.find((region) => normalizedText.includes(normalize(region)));
}

function buildSummary(announcement: LiveAnnouncement): string {
  const body = announcement.body.replace(/\s+/gu, " ").trim();
  if (body.length <= 110) return body;
  return `${body.slice(0, 110)}...`;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/gu, "");
}
