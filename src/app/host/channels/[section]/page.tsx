import type { Metadata } from "next";
import { HostChannelGalleries } from "@/components/host-channel-galleries";
import { HostChannelMagazines } from "@/components/host-channel-magazines";
import { HostChannelPlaceholder } from "@/components/host-channel-placeholder";
import { HostChannelPrograms } from "@/components/host-channel-programs";
import { HostChannelReviews } from "@/components/host-channel-reviews";

export const metadata: Metadata = {
  title: "채널 관리 | 누비오 호스트센터",
};

export default async function HostChannelSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (section === "programs") return <HostChannelPrograms />;
  if (section === "reviews") return <HostChannelReviews />;
  if (section === "galleries") return <HostChannelGalleries />;
  if (section === "magazines") return <HostChannelMagazines />;

  return <HostChannelPlaceholder section={section} />;
}
