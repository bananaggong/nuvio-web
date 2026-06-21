import type { Metadata } from "next";
import { HostChannelMenuSettings } from "@/components/host-channel-menu-settings";

export const metadata: Metadata = {
  title: "메뉴 설정 | 누비오 채널 관리자",
};

export default function HostChannelMenuPage() {
  return <HostChannelMenuSettings />;
}