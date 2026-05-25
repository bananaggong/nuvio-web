import type { Metadata } from "next";
import { HostApplicationDetail } from "@/components/host-application-detail";

export const metadata: Metadata = {
  title: "프로그램 신청서 상세 | 누비오",
  description: "선택한 프로그램의 신청서 응답과 상태 이력을 확인하는 화면입니다.",
};

export default async function StandaloneProgramApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string; programId: string }>;
}) {
  const { applicationId, programId } = await params;

  return (
    <HostApplicationDetail
      applicationId={decodeURIComponent(applicationId)}
      programId={decodeURIComponent(programId)}
    />
  );
}
