import type { Metadata } from "next";
import { HostChannelMenuSettings } from "@/components/host-channel-menu-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "메뉴 설정 | 누비오 채널 관리자",
  description: "누비오 채널 관리자가 공개 채널의 메뉴 구조를 관리하는 화면입니다.",
};

export default function HostChannelSettingsPage() {
  return <HostChannelMenuSettings />;
}
