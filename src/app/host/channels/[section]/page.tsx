import type { Metadata } from "next";
import { HostChannelPrograms } from "@/components/host-channel-programs";
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

  if (section === "programs") return <HostChannelPrograms />;

  return <HostChannelPlaceholder section={section} />;
}
