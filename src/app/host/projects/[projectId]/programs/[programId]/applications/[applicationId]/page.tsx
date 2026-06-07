import type { Metadata } from "next";
import { HostApplicationDetail } from "@/components/host-application-detail";
import { requireHostConsoleAccess } from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "프로그램 신청서 상세 | 누비오",
  description:
    "선택한 프로그램 안에서 신청서 응답과 상태 이력을 확인하는 화면입니다.",
};

export default async function HostProgramApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string; programId: string; projectId: string }>;
}) {
  const { applicationId, programId, projectId } = await params;
  const decodedApplicationId = decodeURIComponent(applicationId);
  const decodedProgramId = decodeURIComponent(programId);
  const decodedProjectId = decodeURIComponent(projectId);
  await requireHostConsoleAccess(
    `/host/projects/${encodeURIComponent(decodedProjectId)}/programs/${encodeURIComponent(decodedProgramId)}/applications/${encodeURIComponent(decodedApplicationId)}`,
  );

  return (
    <>
      <HostApplicationDetail
        applicationId={decodedApplicationId}
        programId={decodedProgramId}
        projectId={decodedProjectId}
      />
    </>
  );
}
