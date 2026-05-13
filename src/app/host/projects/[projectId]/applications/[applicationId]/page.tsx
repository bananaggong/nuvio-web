import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostApplicationDetail } from "@/components/host-application-detail";

export const metadata: Metadata = {
  title: "프로젝트 신청서 상세 | NUVIO",
  description:
    "선택한 운영 프로젝트 안에서 신청서 응답과 상태 이력을 확인하는 화면입니다.",
};

export default async function HostProjectApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string; projectId: string }>;
}) {
  const { applicationId, projectId } = await params;

  return (
    <>
      <HostAccessBanner />
      <HostApplicationDetail
        applicationId={decodeURIComponent(applicationId)}
        projectId={decodeURIComponent(projectId)}
      />
    </>
  );
}
