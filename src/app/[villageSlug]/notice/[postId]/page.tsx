import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChannelGuestBoardDetailPage } from "@/components/channel-guest-board";
import { channelPath, isReservedChannelSlug } from "@/lib/channel-routing";
import { getPublicChannelBoardPost } from "@/lib/channel-board-posts";
import { stripHtmlText } from "@/lib/magazine-content";
import { createSeoMetadata } from "@/lib/seo";
import { getPublicVillageBySlug } from "@/lib/village-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string; villageSlug: string }>;
}): Promise<Metadata> {
  const { postId, villageSlug } = await params;
  if (isReservedChannelSlug(villageSlug)) return {};

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) return {};

  const post = await getPublicChannelBoardPost(village.slug, postId);
  if (!post) return {};

  const description =
    stripHtmlText(post.body ?? "").slice(0, 140) ||
    `${village.name} 게시판 글입니다.`;

  return createSeoMetadata({
    title: `${post.title} | ${village.name}`,
    description,
    image: village.heroImage,
    path: `${channelPath(village.slug)}/notice/${encodeURIComponent(post.id)}`,
  });
}

export default async function VillageNoticeDetailRoute({
  params,
}: {
  params: Promise<{ postId: string; villageSlug: string }>;
}) {
  const { postId, villageSlug } = await params;
  if (isReservedChannelSlug(villageSlug)) notFound();

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const post = await getPublicChannelBoardPost(village.slug, postId);
  if (!post) notFound();

  return <ChannelGuestBoardDetailPage post={post} village={village} />;
}
