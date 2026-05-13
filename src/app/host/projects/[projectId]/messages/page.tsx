import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostMessageAutomation } from "@/components/host-message-automation";

export const metadata: Metadata = {
  title: "프로젝트 메시지 | NUVIO",
  description:
    "선택한 운영 프로젝트의 신청자에게 보낼 안내 메시지를 예약하고 수신자 큐를 관리하는 화면입니다.",
};

export default async function HostProjectMessagesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      <HostAccessBanner />
      <HostMessageAutomation projectId={decodeURIComponent(projectId)} />
    </>
  );
}
