export const MAGAZINE_CATEGORIES = [
  { value: "local", label: "로컬 이야기" },
  { value: "program", label: "프로그램 소식" },
  { value: "people", label: "사람과 인터뷰" },
  { value: "guide", label: "여행 가이드" },
  { value: "notice", label: "누비오 소식" },
] as const;

export const MAGAZINE_STATUSES = ["draft", "published", "archived"] as const;

export type MagazineCategory = (typeof MAGAZINE_CATEGORIES)[number]["value"];
export type MagazinePostStatus = (typeof MAGAZINE_STATUSES)[number];

export function getMagazineCategoryLabel(value: string): string {
  return MAGAZINE_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

export function isMagazineCategory(value: string): value is MagazineCategory {
  return MAGAZINE_CATEGORIES.some((item) => item.value === value);
}

export function isMagazinePostStatus(value: string): value is MagazinePostStatus {
  return MAGAZINE_STATUSES.some((item) => item === value);
}
