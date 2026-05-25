import type { Metadata } from "next";
import { HostApplicationsCrm } from "@/components/host-applications-crm";

export const metadata: Metadata = {
  title: "폴더 신청자 CRM | 누비오",
  description:
    "선택한 폴더에 연결된 신청자를 검토하고 상태를 관리하는 화면입니다.",
};

export default async function HostProjectApplicationsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      <HostApplicationsCrm projectId={decodeURIComponent(projectId)} />
    </>
  );
}
