import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostApplicationsCrm } from "@/components/host-applications-crm";

export const metadata: Metadata = {
  title: "프로그램 신청자 CRM | 누비오",
  description:
    "선택한 폴더의 특정 프로그램에 신청한 사람만 검토하고 상태를 관리하는 화면입니다.",
};

export default async function HostProgramApplicationsPage({
  params,
}: {
  params: Promise<{ programId: string; projectId: string }>;
}) {
  const { programId, projectId } = await params;

  return (
    <>
      <HostAccessBanner />
      <HostApplicationsCrm
        programId={decodeURIComponent(programId)}
        projectId={decodeURIComponent(projectId)}
      />
    </>
  );
}
