import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostOpsDashboard } from "@/components/host-ops-dashboard";

export const metadata: Metadata = {
  title: "폴더 운영 대시보드",
  description:
    "누비오 호스트가 폴더를 먼저 선택하고 신청자, 메시지, 증빙, 마감 업무를 폴더 하위에서 관리하는 대시보드입니다.",
};

export default function HostProjectsPage() {
  return (
    <>
      <HostAccessBanner />
      <HostOpsDashboard />
    </>
  );
}
