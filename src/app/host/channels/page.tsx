import type { Metadata } from "next";
import { HostChannelHome } from "@/components/host-channel-home";

export const metadata: Metadata = {
  title: "채널 홈 | 누비오 호스트센터",
};

export default function HostChannelHomePage() {
  return <HostChannelHome />;
}
