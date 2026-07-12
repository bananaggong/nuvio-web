import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { villagePageRevisions, villagePageSections } from "@/db/schema";
import {
  listHostVillagePageSections,
  listPublicVillagePageSections,
  type PublishedVillagePageSection,
  type VillagePageSectionDraft,
} from "@/lib/village-page-cms";
import { channelPath } from "@/lib/channel-routing";
import { sanitizeMagazineHtml } from "@/lib/magazine-content";
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
const BOARD_NEW_DAYS = 10;
let boardPostIdSequence = 0;

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

export async function getPublicChannelBoardPost(
  villageSlug: string,
  postId: string,
): Promise<ChannelBoardPost | undefined> {
  const normalizedPostId = normalizeChannelBoardPostId(postId);
  if (!normalizedPostId) return undefined;

  const posts = await listPublicChannelBoardPosts(villageSlug);
  return posts.find((post) => post.id === normalizedPostId);
}

export async function saveHostChannelBoardPosts({
  posts,
  villageSlug,
}: {
  posts: ChannelBoardPost[];
  villageSlug: string;
}): Promise<ChannelBoardPost[]> {
  const normalizedPosts = normalizeChannelBoardPosts(posts);

  return mutateHostChannelBoardPosts(villageSlug, () => normalizedPosts);
}

export async function upsertHostChannelBoardPost({
  post,
  villageSlug,
}: {
  post: unknown;
  villageSlug: string;
}): Promise<ChannelBoardPost[]> {
  const [normalizedPost] = normalizeChannelBoardPosts([post]);
  if (!normalizedPost) {
    throw new Error("Board post payload is required.");
  }

  return mutateHostChannelBoardPosts(villageSlug, (existingPosts) => {
    const existingPost = existingPosts.find(
      (item) => item.id === normalizedPost.id,
    );
    const savedPost: ChannelBoardPost = {
      ...normalizedPost,
      createdAt: existingPost?.createdAt ?? normalizedPost.createdAt,
      id: existingPost?.id ?? normalizedPost.id,
    };

    return [
      savedPost,
      ...existingPosts.filter((item) => item.id !== savedPost.id),
    ];
  });
}

export async function deleteHostChannelBoardPost({
  postId,
  villageSlug,
}: {
  postId: string;
  villageSlug: string;
}): Promise<ChannelBoardPost[]> {
  const normalizedPostId = postId.trim();
  if (!normalizedPostId) {
    throw new Error("Board post id is required.");
  }

  return mutateHostChannelBoardPosts(villageSlug, (existingPosts) =>
    existingPosts.filter((item) => item.id !== normalizedPostId),
  );
}

async function mutateHostChannelBoardPosts(
  villageSlug: string,
  mutate: (posts: ChannelBoardPost[]) => ChannelBoardPost[],
): Promise<ChannelBoardPost[]> {
  const normalizedVillageSlug = villageSlug.trim().toLowerCase();
  if (!normalizedVillageSlug) {
    throw new Error("Village slug is required.");
  }

  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`channel-board:${normalizedVillageSlug}`}))`,
    );

    const [existingSection] = await tx
      .select()
      .from(villagePageSections)
      .where(
        and(
          eq(villagePageSections.villageSlug, normalizedVillageSlug),
          eq(villagePageSections.pageKey, BOARD_PAGE_KEY),
          eq(villagePageSections.sectionKey, BOARD_SECTION_KEY),
        ),
      )
      .limit(1);
    const currentPosts = normalizeChannelBoardPosts(
      existingSection?.draftContent.posts,
    );
    const savedPosts = normalizeChannelBoardPosts(mutate(currentPosts));
    const draftContent = {
      ...(existingSection?.draftContent ?? {}),
      posts: savedPosts,
    };
    const now = new Date();

    const [savedSection] = existingSection
      ? await tx
          .update(villagePageSections)
          .set({
            draftContent,
            publishedAt: now,
            publishedContent: draftContent,
            publishedOrderIndex: existingSection.orderIndex,
            publishedVisible: existingSection.visible,
            status: "published",
            updatedAt: now,
          })
          .where(eq(villagePageSections.id, existingSection.id))
          .returning()
      : await tx
          .insert(villagePageSections)
          .values({
            draftContent,
            label: "게시판",
            orderIndex: 10,
            pageKey: BOARD_PAGE_KEY,
            publishedAt: now,
            publishedContent: draftContent,
            publishedOrderIndex: 10,
            publishedVisible: true,
            sectionKey: BOARD_SECTION_KEY,
            sectionType: BOARD_SECTION_TYPE,
            status: "published",
            villageSlug: normalizedVillageSlug,
            visible: true,
          })
          .returning();

    await tx.insert(villagePageRevisions).values({
      content: draftContent,
      orderIndex: savedSection.orderIndex,
      pageKey: savedSection.pageKey,
      sectionId: savedSection.id,
      sectionKey: savedSection.sectionKey,
      villageSlug: savedSection.villageSlug,
      visible: savedSection.visible,
    });

    return savedPosts;
  });
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
    href: `${noticeHref}/${encodeURIComponent(post.id)}`,
    title: post.title,
    type: buildBoardNoticeType(post),
  }));
}

export function normalizeChannelBoardPosts(input: unknown): ChannelBoardPost[] {
  if (!Array.isArray(input)) return [];

  const seenIds = new Set<string>();
  const posts: ChannelBoardPost[] = [];

  input.forEach((item, index) => {
    const post = normalizeChannelBoardPost(item, index);
    if (!post) return;

    let id = post.id;
    while (seenIds.has(id)) {
      id = createChannelBoardPostId();
    }

    seenIds.add(id);
    posts.push({ ...post, id });
  });

  return sortChannelBoardPosts(posts);
}

export function isChannelBoardPostNew(createdAt: string): boolean {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;

  const age = Date.now() - date.getTime();
  return age >= 0 && age <= BOARD_NEW_DAYS * 24 * 60 * 60 * 1000;
}

function buildBoardNoticeType(post: ChannelBoardPost): string {
  const badges = [
    post.pinned ? "고정" : "",
    isChannelBoardPostNew(post.createdAt) ? "새글" : "",
  ].filter(Boolean);

  return badges.length > 0 ? badges.join(",") : "게시글";
}

function sortChannelBoardPosts(posts: ChannelBoardPost[]): ChannelBoardPost[] {
  return [...posts].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    const createdAtDifference = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (createdAtDifference !== 0) return createdAtDifference;

    return b.id.localeCompare(a.id);
  });
}

function normalizeChannelBoardPost(
  input: unknown,
  index: number,
): ChannelBoardPost | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;

  const value = input as Record<string, unknown>;
  const title = asString(value.title) || "게시글 제목";
  const createdAt = asIsoDate(value.createdAt) ?? new Date().toISOString();
  const body = sanitizeMagazineHtml(asString(value.body));
  const safeTitle = title.slice(0, 120);

  return {
    body: body || undefined,
    createdAt,
    id: asString(value.id).slice(0, 120) || createChannelBoardPostId(index),
    pinned: value.pinned === true,
    title: safeTitle,
    unread: value.unread === true,
  };
}

function createChannelBoardPostId(index?: number): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `channel-board-post-${randomId}`;

  boardPostIdSequence += 1;
  return [
    "channel-board-post",
    Date.now().toString(36),
    boardPostIdSequence.toString(36),
    typeof index === "number" ? index.toString(36) : "",
  ]
    .filter(Boolean)
    .join("-");
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

function normalizeChannelBoardPostId(value: string): string {
  const text = value.trim();
  if (!text) return "";

  try {
    return decodeURIComponent(text).trim();
  } catch {
    return text;
  }
}
