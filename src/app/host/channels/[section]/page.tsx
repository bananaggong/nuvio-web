import type { Metadata } from "next";
import { HostChannelPlaceholder } from "@/components/host-channel-placeholder";

export const metadata: Metadata = {
  title: "채널 관리 | 누비오 호스트센터",
};

export default async function HostChannelSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  return <HostChannelPlaceholder section={section} />;
}
