import type { Metadata } from "next";
import { HostProgramFormAttachment } from "@/components/host-program-form-attachment";
import { requireHostConsoleAccess } from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "프로그램 신청서 설정 | 누비오",
  description:
    "선택한 프로그램의 모집 흐름에 연결되는 신청서 질문을 구성하는 화면입니다.",
};

export default async function HostProgramFormsPage({
  params,
}: {
  params: Promise<{ programId: string; projectId: string }>;
}) {
  const { programId, projectId } = await params;
  const decodedProgramId = decodeURIComponent(programId);
  const decodedProjectId = decodeURIComponent(projectId);
  await requireHostConsoleAccess(
    `/host/projects/${encodeURIComponent(decodedProjectId)}/programs/${encodeURIComponent(decodedProgramId)}/forms`,
  );

  return (
    <>
      <HostProgramFormAttachment
        programId={decodedProgramId}
        projectId={decodedProjectId}
      />
    </>
  );
}
