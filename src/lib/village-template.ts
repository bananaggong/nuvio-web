import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { villagePath, villageProgramPath } from "@/lib/village-routing";
import type { Program } from "@/lib/types";
import type { Village, VillageSection } from "@/lib/village-types";

export type VillageNotice = {
  date: string;
  href: string;
  title: string;
  type: string;
};

export const sectionTypeLabels: Record<VillageSection["type"], string> = {
  board: "게시판",
  community: "커뮤니티",
  faq: "안내",
  free: "자유형",
  gallery: "갤러리",
  magazine: "매거진",
  notice: "공지",
  programs: "프로그램",
  stay: "체류",
  story: "소개",
};

export function getVillageEnglishLabel(village: Village): string {
  const explicit = village.links.find((link) => link.id === "english-name")?.label;
  if (explicit) return explicit;

  return `${romanizeKoreanLabel(village.city || village.name)} Local Village`;
}

export function getVillageHeroTitle(village: Village): string {
  return village.name;
}

export function getVillageApplyLabel(village: Village): string {
  return `${village.name} 프로그램 신청`;
}

export function buildVillageNotices(
  village: Village,
  programs: Program[],
): VillageNotice[] {
  const programNotices = programs.slice(0, 4).map((program) => ({
    date: program.recruitStart,
    href: villageProgramPath(village.slug, program.slug),
    title: `${program.title} 신청 접수 안내`,
    type: "모집",
  }));
  const reviewNotices: VillageNotice[] = launchFeatureFlags.reviews
    ? [
        {
          date: village.updatedAt,
          href: `${villagePath(village.slug)}/reviews`,
          title: "활동 후기와 만족도 조사 제출 안내",
          type: "후기",
        },
      ]
    : [];

  return [
    ...programNotices,
    {
      date: village.updatedAt,
      href: `${villagePath(village.slug)}/notice`,
      title: "선정자 대상 OT, 숙소 위치, 공지방 입장 안내",
      type: "공지",
    },
    ...reviewNotices,
  ].slice(0, 6);
}

function romanizeKoreanLabel(value: string): string {
  const cleaned = value
    .replace(/군|시|구|읍|면|동|청년마을/gu, "")
    .trim()
    .toLowerCase();

  const map: Record<string, string> = {
    강릉: "Gangneung",
    남해: "Namhae",
    보성: "Boseong",
  };

  return map[cleaned] ?? "누비오";
}
