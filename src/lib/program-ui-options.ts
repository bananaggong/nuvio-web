import type { PeriodKey, ReviewCategory, ThemeKey } from "@/lib/types";

export const themeOptions: Array<{
  key: ThemeKey;
  label: string;
  description: string;
}> = [
  { key: "short", label: "짧은여행", description: "4박 이하" },
  { key: "month", label: "7일~한달살기", description: "체류형" },
  { key: "workation", label: "워케이션", description: "일과 여행" },
  { key: "local", label: "로컬미션", description: "지역 미션" },
  { key: "returnFarm", label: "귀농귀촌", description: "농촌체험" },
  { key: "event", label: "공모/이벤트", description: "상금/공모" },
  { key: "pet", label: "반려견지원", description: "동반 여행" },
  { key: "half", label: "반값여행", description: "페이백" },
  { key: "daily", label: "일상지원금", description: "생활 혜택" },
  { key: "family", label: "아이랑", description: "가족 여행" },
  { key: "easy", label: "간편신청", description: "서류 최소" },
  { key: "benefit", label: "전용혜택", description: "회원 혜택" },
  { key: "exclusive", label: "전용이벤트", description: "한정 모집" },
];

export const periodOptions: Array<{ key: PeriodKey; label: string }> = [
  { key: "month", label: "한달살기(28일 이상)" },
  { key: "week", label: "일주일살기(5박~9박)" },
  { key: "twoWeeks", label: "2주살기(10박~17박)" },
  { key: "threeWeeks", label: "3주살기(18박~27박)" },
  { key: "under4", label: "짧은여행(4박 이하)" },
];

export const regions = [
  "전체",
  "해외",
  "전국",
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

export const reviewCategories: Array<{
  key: "all" | ReviewCategory;
  label: string;
}> = [
  { key: "all", label: "전체" },
  { key: "programTip", label: "프로그램 후기/팁" },
  { key: "selected", label: "선정됐어요" },
  { key: "rejected", label: "탈락했어요" },
  { key: "trip", label: "여행후기" },
  { key: "free", label: "자유수다" },
  { key: "question", label: "질문답변" },
];
