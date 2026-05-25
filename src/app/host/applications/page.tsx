import type { Metadata } from "next";
import { HostApplicationsCrm } from "@/components/host-applications-crm";

export const metadata: Metadata = {
  title: "신청자 CRM",
  description:
    "누비오 호스트가 프로그램 신청자를 검색하고 상태를 관리하는 신청자 CRM입니다.",
};

export default function HostApplicationsPage() {
  return (
    <>
      <HostApplicationsCrm />
    </>
  );
}
