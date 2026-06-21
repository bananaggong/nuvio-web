import type { Metadata } from "next";
import { HostChannelSettings } from "@/components/host-channel-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "채널 설정 | 누비오 호스트센터",
  description: "누비오 채널 관리자가 공개 채널 정보와 연결 프로그램을 관리하는 화면입니다.",
};

export default function HostChannelSettingsPage() {
  return <HostChannelSettings />;
}
