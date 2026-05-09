import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostApplicationsCrm } from "@/components/host-applications-crm";

export const metadata: Metadata = {
  title: "신청자 CRM",
  description:
    "NUVIO 운영자가 프로그램 신청자를 검색하고 상태를 관리하는 신청자 CRM입니다.",
};

export default function HostApplicationsPage() {
  return (
    <>
      <HostAccessBanner />
      <HostApplicationsCrm />
    </>
  );
}
