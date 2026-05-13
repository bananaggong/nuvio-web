import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostReportAutomation } from "@/components/host-report-automation";

export const metadata: Metadata = {
  title: "운영 프로젝트 마감 | 누비오",
  description:
    "로컬홈 운영자가 지출, 증빙, 활동, 참석자 데이터를 운영 프로젝트 단위로 모아 마감 자료를 준비하는 화면입니다.",
};

export default function HostReportsPage() {
  return (
    <>
      <HostAccessBanner />
      <HostReportAutomation />
    </>
  );
}
