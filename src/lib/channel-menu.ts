import { villagePath } from "@/lib/village-routing";
import type { Village, VillageSection, VillageSectionType } from "@/lib/village-types";

export type ChannelMenuKind = "program" | "gallery" | "magazine" | "board" | "free";

export type ChannelMenuItem = {
  description: string;
  id: string;
  kind: ChannelMenuKind;
  label: string;
  locked: boolean;
  order: number;
  visible: boolean;
};

export type ChannelMenuTypeOption = {
  description: string;
  kind: Exclude<ChannelMenuKind, "program" | "free">;
  label: string;
};

export const CHANNEL_MENU_SECTION_MARKER = "__nuvio_channel_menu__";

export const channelHomeLabel = "채널 홈";

export const channelMenuMeta: Record<
  ChannelMenuKind,
  {
    badge: string;
    defaultDescription: string;
    defaultLabel: string;
    guestHref: (homeHref: string) => string;
    hostHref: string;
    sectionType: VillageSectionType;
  }
> = {
  board: {
    badge: "게시판형",
    defaultDescription: "공지사항과 글 목록이 게시판 형태로 표시돼요",
    defaultLabel: "게시판형",
    guestHref: (homeHref) => `${homeHref}/notice`,
    hostHref: "/host/channels/boards",
    sectionType: "board",
  },
  free: {
    badge: "자유형",
    defaultDescription:
      "소개 페이지 등 원페이지 형태로 자유롭게 구성할 수 있으며 홈 화면에는 표시되지 않아요",
    defaultLabel: "자유형",
    guestHref: (homeHref) => `${homeHref}#channel-free`,
    hostHref: "/host/channels/free",
    sectionType: "free",
  },
  gallery: {
    badge: "갤러리형",
    defaultDescription: "이미지와 영상을 그리드로 표시해요",
    defaultLabel: "갤러리형",
    guestHref: (homeHref) => `${homeHref}/media?type=gallery`,
    hostHref: "/host/channels/galleries",
    sectionType: "gallery",
  },
  magazine: {
    badge: "매거진형",
    defaultDescription: "블로그처럼 글을 작성하고 목록은 웹페이지 카드로 표시해요",
    defaultLabel: "매거진형",
    guestHref: (homeHref) => `${homeHref}/media?type=magazine`,
    hostHref: "/host/channels/magazines",
    sectionType: "magazine",
  },
  program: {
    badge: "기본 메뉴",
    defaultDescription: "운영 중인 프로그램 목록을 표시해요",
    defaultLabel: "프로그램",
    guestHref: (homeHref) => `${homeHref}/programs`,
    hostHref: "/host/channels/programs",
    sectionType: "programs",
  },
};

export const channelMenuTypeOptions: ChannelMenuTypeOption[] = [
  {
    description: channelMenuMeta.gallery.defaultDescription,
    kind: "gallery",
    label: channelMenuMeta.gallery.defaultLabel,
  },
  {
    description: channelMenuMeta.magazine.defaultDescription,
    kind: "magazine",
    label: channelMenuMeta.magazine.defaultLabel,
  },
  {
    description: channelMenuMeta.board.defaultDescription,
    kind: "board",
    label: channelMenuMeta.board.defaultLabel,
  },
];

export function getChannelMenuItems(
  value: Pick<Village, "sections"> | VillageSection[] | null | undefined,
  options: { includeFree?: boolean; includeHidden?: boolean } = {},
): ChannelMenuItem[] {
  const includeFree = options.includeFree ?? false;
  const includeHidden = options.includeHidden ?? true;
  const sections = Array.isArray(value) ? value : value?.sections ?? [];
  const storedItems = sections
    .map((section, index) => menuItemFromSection(section, index))
    .filter((item): item is ChannelMenuItem => Boolean(item));
  const items =
    storedItems.length > 0 ? ensureProgramMenu(storedItems) : [createProgramMenuItem()];

  return items
    .filter((item) => includeFree || item.kind !== "free")
    .filter((item) => includeHidden || item.visible)
    .sort((a, b) => a.order - b.order);
}

export function getVisibleChannelMenuItems(
  value: Pick<Village, "sections"> | VillageSection[] | null | undefined,
) {
  return getChannelMenuItems(value, { includeHidden: false });
}

export function getChannelMenuLabel(
  village: Pick<Village, "sections"> | VillageSection[] | null | undefined,
  kind: ChannelMenuKind,
) {
  return (
    getChannelMenuItems(village).find((item) => item.kind === kind)?.label ||
    channelMenuMeta[kind].defaultLabel
  );
}

export function applyChannelMenuItemsToSections(
  sections: VillageSection[],
  items: ChannelMenuItem[],
): VillageSection[] {
  const preservedSections = sections.filter((section) => !isChannelMenuSection(section));
  const normalizedItems = ensureProgramMenu(items)
    .filter((item) => item.kind !== "free")
    .map((item, index) => ({
      ...item,
      id: item.id || createMenuId(item.kind),
      label: item.label.trim() || channelMenuMeta[item.kind].defaultLabel,
      locked: item.kind === "program" || item.locked,
      order: index,
    }));

  return [
    ...preservedSections,
    ...normalizedItems.map((item): VillageSection => ({
      body: CHANNEL_MENU_SECTION_MARKER,
      description: item.description || channelMenuMeta[item.kind].defaultDescription,
      id: item.id,
      items: [],
      locked: item.locked,
      menuKind: item.kind,
      order: item.order,
      title: item.label,
      type: channelMenuMeta[item.kind].sectionType,
      visible: item.visible,
    })),
  ];
}

export function isChannelMenuSection(section: VillageSection): boolean {
  return Boolean(
    section.body === CHANNEL_MENU_SECTION_MARKER ||
      section.id.startsWith("channel-menu-") ||
      asChannelMenuKind(section.menuKind),
  );
}

export function channelGuestHref(kind: ChannelMenuKind, village: Pick<Village, "slug">) {
  return channelMenuMeta[kind].guestHref(villagePath(village.slug));
}

export function channelHostHref(kind: ChannelMenuKind) {
  return channelMenuMeta[kind].hostHref;
}

export function createMenuId(kind: ChannelMenuKind) {
  return `channel-menu-${kind}-${Date.now().toString(36)}`;
}

export function createChannelMenuItem(kind: ChannelMenuKind): ChannelMenuItem {
  return {
    description: channelMenuMeta[kind].defaultDescription,
    id: createMenuId(kind),
    kind,
    label: channelMenuMeta[kind].defaultLabel,
    locked: kind === "program",
    order: 0,
    visible: true,
  };
}

function createProgramMenuItem(): ChannelMenuItem {
  return {
    ...createChannelMenuItem("program"),
    id: "channel-menu-program",
    order: 0,
  };
}

function ensureProgramMenu(items: ChannelMenuItem[]) {
  const normalized = items.map((item, index) => ({
    ...item,
    locked: item.kind === "program" || item.locked,
    order: Number.isFinite(item.order) ? item.order : index,
    visible: item.kind === "program" ? item.visible : item.visible,
  }));

  if (normalized.some((item) => item.kind === "program")) return normalized;

  return [createProgramMenuItem(), ...normalized.map((item) => ({ ...item, order: item.order + 1 }))];
}

function menuItemFromSection(section: VillageSection, index: number): ChannelMenuItem | null {
  const kind = getSectionMenuKind(section);
  if (!kind) return null;

  return {
    description:
      section.description?.trim() || channelMenuMeta[kind].defaultDescription,
    id: section.id || createMenuId(kind),
    kind,
    label: section.title?.trim() || channelMenuMeta[kind].defaultLabel,
    locked: kind === "program" || section.locked === true,
    order: typeof section.order === "number" && Number.isFinite(section.order)
      ? section.order
      : index,
    visible: section.visible !== false,
  };
}

function getSectionMenuKind(section: VillageSection): ChannelMenuKind | null {
  const explicit = asChannelMenuKind(section.menuKind);
  if (explicit) return explicit;

  if (
    section.body !== CHANNEL_MENU_SECTION_MARKER &&
    !section.id.startsWith("channel-menu-")
  ) {
    return null;
  }

  if (section.type === "programs") return "program";
  return asChannelMenuKind(section.type);
}

function asChannelMenuKind(value: unknown): ChannelMenuKind | null {
  if (
    value === "program" ||
    value === "gallery" ||
    value === "magazine" ||
    value === "board" ||
    value === "free"
  ) {
    return value;
  }

  return null;
}
