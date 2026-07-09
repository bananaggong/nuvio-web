import {
  listHostVillagePageSections,
  listPublicVillagePageSections,
  publishHostVillagePageSection,
  type PublishedVillagePageSection,
  type VillagePageSectionDraft,
} from "@/lib/village-page-cms";
import { channelPath } from "@/lib/channel-routing";
import type { Village } from "@/lib/village-types";
import type { VillageNotice } from "@/lib/village-template";

export type ChannelBoardPost = {
  body?: string;
  createdAt: string;
  id: string;
  pinned?: boolean;
  title: string;
  unread?: boolean;
};

const BOARD_PAGE_KEY = "notice";
const BOARD_SECTION_KEY = "notice_index";
const BOARD_SECTION_TYPE = "media_preview";

export async function listHostChannelBoardPosts(
  villageSlug: string,
): Promise<ChannelBoardPost[]> {
  const sections = await listHostVillagePageSections(villageSlug, BOARD_PAGE_KEY);
  const section = findBoardSection(sections);

  return normalizeChannelBoardPosts(section?.draftContent.posts);
}

export async function listPublicChannelBoardPosts(
  villageSlug: string,
): Promise<ChannelBoardPost[]> {
  const sections = await listPublicVillagePageSections(villageSlug, BOARD_PAGE_KEY);
  const section = findBoardSection(sections);

  return normalizeChannelBoardPosts(section?.content.posts);
}

export async function saveHostChannelBoardPosts({
  posts,
  villageSlug,
}: {
  posts: ChannelBoardPost[];
  villageSlug: string;
}): Promise<ChannelBoardPost[]> {
  const normalizedPosts = normalizeChannelBoardPosts(posts);
  const existingSections = await listHostVillagePageSections(villageSlug, BOARD_PAGE_KEY);
  const existingSection = findBoardSection(existingSections);
  const now = new Date().toISOString();

  const draft: VillagePageSectionDraft = {
    id: existingSection?.id ?? `${villageSlug}-${BOARD_PAGE_KEY}-${BOARD_SECTION_KEY}`,
    villageSlug,
    pageKey: BOARD_PAGE_KEY,
    sectionKey: BOARD_SECTION_KEY,
    sectionType: BOARD_SECTION_TYPE,
    label: existingSection?.label ?? "게시판",
    draftContent: {
      ...(existingSection?.draftContent ?? {}),
      posts: normalizedPosts,
    },
    publishedContent: existingSection?.publishedContent,
    orderIndex: existingSection?.orderIndex ?? 10,
    publishedOrderIndex: existingSection?.publishedOrderIndex,
    visible: existingSection?.visible ?? true,
    publishedVisible: existingSection?.publishedVisible,
    status: "published",
    publishedAt: existingSection?.publishedAt,
    updatedAt: existingSection?.updatedAt ?? now,
  };

  await publishHostVillagePageSection(draft, {
    allowedVillageSlug: villageSlug,
  });

  return normalizedPosts;
}

export function buildChannelBoardNoticesFromPosts({
  posts,
  village,
}: {
  posts: ChannelBoardPost[];
  village: Village;
}): VillageNotice[] {
  const noticeHref = `${channelPath(village.slug)}/notice`;

  return normalizeChannelBoardPosts(posts).map((post) => ({
    date: post.createdAt,
    href: `${noticeHref}#${encodeURIComponent(post.id)}`,
    title: post.title,
    type: post.pinned ? "고정" : post.unread ? "새글" : "게시글",
  }));
}

export function normalizeChannelBoardPosts(input: unknown): ChannelBoardPost[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => normalizeChannelBoardPost(item, index))
    .filter((post): post is ChannelBoardPost => Boolean(post));
}

function normalizeChannelBoardPost(
  input: unknown,
  index: number,
): ChannelBoardPost | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;

  const value = input as Record<string, unknown>;
  const title = asString(value.title) || "게시글 제목";
  const createdAt = asIsoDate(value.createdAt) ?? new Date().toISOString();

  return {
    body: asString(value.body) || undefined,
    createdAt,
    id: asString(value.id) || `channel-board-post-${Date.now()}-${index}`,
    pinned: value.pinned === true,
    title,
    unread: value.unread === true,
  };
}

function findBoardSection<
  T extends VillagePageSectionDraft | PublishedVillagePageSection,
>(sections: T[]): T | undefined {
  return sections.find((section) => section.sectionKey === BOARD_SECTION_KEY);
}

function asIsoDate(value: unknown): string | undefined {
  const text = asString(value);
  if (!text) return undefined;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
