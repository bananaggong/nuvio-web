import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { villagePath } from "@/lib/village-routing";
import type { Village, VillageSection, VillageSectionType } from "@/lib/village-types";

export type ChannelMenuKind = "program" | "review" | "gallery" | "magazine" | "board" | "free";

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
  kind: Exclude<ChannelMenuKind, "program" | "review">;
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
    badge: "게시판 형",
    defaultDescription: "공지사항과 같이 목록이 게시판 형태로 표시돼요",
    defaultLabel: "게시판",
    guestHref: (homeHref) => `${homeHref}/notice`,
    hostHref: "/host/channels/boards",
    sectionType: "board",
  },
  free: {
    badge: "자유 형",
    defaultDescription:
      "소개 페이지 등 원페이지 형태로 자유롭게 구성할 수 있으며, 홈 화면에는 표시되지 않고 메뉴에서만 접근할 수 있어요",
    defaultLabel: "자유",
    guestHref: (homeHref) => `${homeHref}#channel-free`,
    hostHref: "/host/channels/free",
    sectionType: "free",
  },
  gallery: {
    badge: "갤러리 형",
    defaultDescription: "이미지와 영상을 그리드로 표시돼요",
    defaultLabel: "갤러리",
    guestHref: (homeHref) => `${homeHref}/media?type=gallery`,
    hostHref: "/host/channels/galleries",
    sectionType: "gallery",
  },
  magazine: {
    badge: "매거진 형",
    defaultDescription: "블로그 처럼 글을 작성하고 목록은 썸네일 카드로 표시돼요",
    defaultLabel: "매거진",
    guestHref: (homeHref) => `${homeHref}/media?type=magazine`,
    hostHref: "/host/channels/magazines",
    sectionType: "magazine",
  },
  program: {
    badge: "기본 메뉴",
    defaultDescription: "운영 중인 프로그램 목록이 표시돼요",
    defaultLabel: "프로그램",
    guestHref: (homeHref) => `${homeHref}/programs`,
    hostHref: "/host/channels/programs",
    sectionType: "programs",
  },
  review: {
    badge: "기본 메뉴",
    defaultDescription: "호스트가 오픈한 모든 프로그램의 후기가 표시돼요",
    defaultLabel: "후기",
    guestHref: (homeHref) => `${homeHref}/reviews`,
    hostHref: "/host/channels/reviews",
    sectionType: "review",
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
  {
    description: channelMenuMeta.free.defaultDescription,
    kind: "free",
    label: channelMenuMeta.free.defaultLabel,
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
  const items = storedItems.length > 0 ? ensureCoreMenus(storedItems) : createDefaultChannelMenuItems();

  return items
    .filter((item) => includeFree || item.kind !== "free")
    .filter((item) => includeHidden || item.visible)
    .sort((a, b) => a.order - b.order);
}

export function getVisibleChannelMenuItems(
  value: Pick<Village, "sections"> | VillageSection[] | null | undefined,
) {
  return getChannelMenuItems(value, { includeFree: true, includeHidden: false });
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
  const normalizedItems = ensureCoreMenus(items)
    .map((item, index) => ({
      ...item,
      description: isCoreMenuKind(item.kind)
        ? channelMenuMeta[item.kind].defaultDescription
        : item.description,
      id: item.id || createMenuId(item.kind),
      label: item.label.trim() || channelMenuMeta[item.kind].defaultLabel,
      locked: isCoreMenuKind(item.kind) || item.locked,
      order: index,
      visible: isCoreMenuKind(item.kind) ? true : item.visible,
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
    locked: isCoreMenuKind(kind),
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

function createReviewMenuItem(): ChannelMenuItem {
  return {
    ...createChannelMenuItem("review"),
    id: "channel-menu-review",
    order: 1,
  };
}

function createDefaultEditableMenuItem(
  kind: Exclude<ChannelMenuKind, "program" | "review">,
  order: number,
): ChannelMenuItem {
  return {
    ...createChannelMenuItem(kind),
    id: `channel-menu-${kind}`,
    order,
  };
}

function createDefaultChannelMenuItems() {
  const defaults: ChannelMenuItem[] = [
    createProgramMenuItem(),
    ...(launchFeatureFlags.reviews ? [createReviewMenuItem()] : []),
    createDefaultEditableMenuItem("gallery", launchFeatureFlags.reviews ? 2 : 1),
    createDefaultEditableMenuItem("magazine", launchFeatureFlags.reviews ? 3 : 2),
    createDefaultEditableMenuItem("board", launchFeatureFlags.reviews ? 4 : 3),
    createDefaultEditableMenuItem("free", launchFeatureFlags.reviews ? 5 : 4),
  ];

  return defaults;
}

function ensureCoreMenus(items: ChannelMenuItem[]) {
  const normalized = items.map((item, index) => ({
    ...item,
    description: isCoreMenuKind(item.kind)
      ? channelMenuMeta[item.kind].defaultDescription
      : item.description,
    locked: isCoreMenuKind(item.kind) || item.locked,
    order: Number.isFinite(item.order) ? item.order : index,
    visible: isCoreMenuKind(item.kind) ? true : item.visible,
  }));

  const withProgram = normalized.some((item) => item.kind === "program")
    ? normalized
    : [createProgramMenuItem(), ...normalized.map((item) => ({ ...item, order: item.order + 1 }))];

  if (!launchFeatureFlags.reviews || withProgram.some((item) => item.kind === "review")) {
    return withProgram;
  }

  const reviewOrder =
    Math.min(...withProgram.filter((item) => item.kind === "program").map((item) => item.order)) + 1;

  return [
    ...withProgram.map((item) =>
      item.order >= reviewOrder ? { ...item, order: item.order + 1 } : item,
    ),
    { ...createReviewMenuItem(), order: reviewOrder },
  ];
}

function menuItemFromSection(section: VillageSection, index: number): ChannelMenuItem | null {
  const kind = getSectionMenuKind(section);
  if (!kind) return null;

  return {
    description: isCoreMenuKind(kind)
      ? channelMenuMeta[kind].defaultDescription
      : section.description?.trim() || channelMenuMeta[kind].defaultDescription,
    id: section.id || createMenuId(kind),
    kind,
    label: section.title?.trim() || channelMenuMeta[kind].defaultLabel,
    locked: isCoreMenuKind(kind) || section.locked === true,
    order: typeof section.order === "number" && Number.isFinite(section.order)
      ? section.order
      : index,
    visible: isCoreMenuKind(kind) ? true : section.visible !== false,
  };
}

function isCoreMenuKind(kind: ChannelMenuKind) {
  return kind === "program" || kind === "review";
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
    value === "review" ||
    value === "gallery" ||
    value === "magazine" ||
    value === "board" ||
    value === "free"
  ) {
    return value;
  }

  return null;
}
