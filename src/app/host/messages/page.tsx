import type { Metadata } from "next";
import { HostMessageAutomation } from "@/components/host-message-automation";

export const metadata: Metadata = {
  title: "메시지 자동화 센터",
  description:
    "누비오 호스트가 신청자 상태별 안내 메시지를 예약하고 수신자 큐를 관리하는 화면입니다.",
};

export default function HostMessagesPage() {
  return <HostMessageAutomation />;
}
