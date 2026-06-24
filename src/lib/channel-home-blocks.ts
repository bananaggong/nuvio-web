import type { Village, VillageSection } from "@/lib/village-types";

export const channelHomeBlockBody = "__nuvio_channel_home_block__";

export type ChannelHomeBlockMode = "spacer" | "image" | "text" | "split";
export type ChannelHomeBlockTextPreset = "title" | "subtitle" | "body";
export type ChannelHomeBlockTextWeight = "regular" | "medium" | "semibold";
export type ChannelHomeBlockVerticalAlign = "top" | "middle" | "bottom";
export type ChannelHomeBlockTextAlign = "left" | "center" | "right";

export type ChannelHomeBlock = {
  backgroundColor: string;
  id: string;
  imageUrl: string;
  mode: ChannelHomeBlockMode;
  order: number;
  text: string;
  textAlign: ChannelHomeBlockTextAlign;
  textColor: string;
  textPreset: ChannelHomeBlockTextPreset;
  textWeight: ChannelHomeBlockTextWeight;
  verticalAlign: ChannelHomeBlockVerticalAlign;
};

export const channelHomeBlockTextPresets: Record<
  ChannelHomeBlockTextPreset,
  { fontSize: number; label: string }
> = {
  body: { fontSize: 14, label: "본문" },
  subtitle: { fontSize: 16, label: "소제목" },
  title: { fontSize: 20, label: "제목" },
};

export const channelHomeBlockTextWeights: Record<
  ChannelHomeBlockTextWeight,
  { fontWeight: number; label: string }
> = {
  medium: { fontWeight: 500, label: "M" },
  regular: { fontWeight: 400, label: "R" },
  semibold: { fontWeight: 600, label: "B" },
};

export const defaultChannelHomeBlock: Omit<ChannelHomeBlock, "id" | "order"> = {
  backgroundColor: "#F9F9F9",
  imageUrl: "",
  mode: "text",
  text: "",
  textAlign: "left",
  textColor: "#0D0D0C",
  textPreset: "title",
  textWeight: "regular",
  verticalAlign: "middle",
};

export function isChannelHomeBlockSection(section: VillageSection): boolean {
  return section.body === channelHomeBlockBody;
}

export function getChannelHomeBlocks(village?: Village | null): ChannelHomeBlock[] {
  if (!village) return [];

  return village.sections
    .filter(isChannelHomeBlockSection)
    .map(normalizeChannelHomeBlock)
    .sort((a, b) => a.order - b.order);
}

export function applyChannelHomeBlocksToSections(
  village: Village,
  blocks: ChannelHomeBlock[],
): VillageSection[] {
  const nonBlockSections = village.sections.filter(
    (section) => !isChannelHomeBlockSection(section),
  );

  return nonBlockSections.concat(blocks.map(channelHomeBlockToSection));
}

export function hasChannelHomeBlockContent(block: ChannelHomeBlock): boolean {
  if (block.mode === "spacer") return false;
  if (block.mode === "image") return Boolean(block.imageUrl);
  if (block.mode === "text") return Boolean(block.text.trim());
  return Boolean(block.imageUrl || block.text.trim());
}

export function channelHomeBlockToSection(
  block: ChannelHomeBlock,
  index: number,
): VillageSection {
  return {
    blockBackgroundColor: normalizeHexColor(
      block.backgroundColor,
      defaultChannelHomeBlock.backgroundColor,
    ),
    blockImageUrl: block.imageUrl.trim(),
    blockMode: normalizeBlockMode(block.mode),
    blockText: block.text,
    blockTextAlign: normalizeTextAlign(block.textAlign),
    blockTextColor: normalizeHexColor(block.textColor, defaultChannelHomeBlock.textColor),
    blockTextPreset: normalizeTextPreset(block.textPreset),
    blockTextWeight: normalizeTextWeight(block.textWeight),
    blockVerticalAlign: normalizeVerticalAlign(block.verticalAlign),
    body: channelHomeBlockBody,
    id: block.id,
    items: [],
    order: index,
    title: "블록 섹션",
    type: "free",
    visible: true,
  };
}

function normalizeChannelHomeBlock(
  section: VillageSection,
  index: number,
): ChannelHomeBlock {
  return {
    backgroundColor: normalizeHexColor(
      section.blockBackgroundColor,
      defaultChannelHomeBlock.backgroundColor,
    ),
    id: section.id || `channel-home-block-${index + 1}`,
    imageUrl: section.blockImageUrl || "",
    mode: normalizeBlockMode(section.blockMode),
    order: typeof section.order === "number" ? section.order : index,
    text: section.blockText || "",
    textAlign: normalizeTextAlign(section.blockTextAlign),
    textColor: normalizeHexColor(section.blockTextColor, defaultChannelHomeBlock.textColor),
    textPreset: normalizeTextPreset(section.blockTextPreset),
    textWeight: normalizeTextWeight(section.blockTextWeight),
    verticalAlign: normalizeVerticalAlign(section.blockVerticalAlign),
  };
}

function normalizeBlockMode(value: unknown): ChannelHomeBlockMode {
  return value === "image" || value === "text" || value === "split"
    ? value
    : "spacer";
}

function normalizeTextPreset(value: unknown): ChannelHomeBlockTextPreset {
  return value === "subtitle" || value === "body" ? value : "title";
}

function normalizeTextWeight(value: unknown): ChannelHomeBlockTextWeight {
  return value === "medium" || value === "semibold" ? value : "regular";
}

function normalizeVerticalAlign(value: unknown): ChannelHomeBlockVerticalAlign {
  return value === "top" || value === "bottom" ? value : "middle";
}

function normalizeTextAlign(value: unknown): ChannelHomeBlockTextAlign {
  return value === "center" || value === "right" ? value : "left";
}

function normalizeHexColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/iu.test(value)
    ? value.toUpperCase()
    : fallback;
}
