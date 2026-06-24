import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { HostChannelBoards } from "@/components/host-channel-boards";
import { HostChannelGalleries } from "@/components/host-channel-galleries";
import { HostChannelMagazines } from "@/components/host-channel-magazines";
import { HostChannelPrograms } from "@/components/host-channel-programs";
import { HostChannelSettings } from "@/components/host-channel-settings";

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
  if (section === "reviews") redirect("/host/channels/programs");
  if (section === "galleries") return <HostChannelGalleries />;
  if (section === "magazines") return <HostChannelMagazines />;
  if (section === "boards") return <HostChannelBoards />;
  if (section === "free") redirect("/host/channels");
  if (section === "channel-settings") return <HostChannelSettings />;

  notFound();
}
