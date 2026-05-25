import type { Metadata } from "next";
import { HostApplicationsCrm } from "@/components/host-applications-crm";

export const metadata: Metadata = {
  title: "프로그램 신청자 CRM | 누비오",
  description: "선택한 프로그램의 신청자 목록과 상태를 관리하는 화면입니다.",
};

export default async function StandaloneProgramApplicationsPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;

  return <HostApplicationsCrm programId={decodeURIComponent(programId)} />;
}
