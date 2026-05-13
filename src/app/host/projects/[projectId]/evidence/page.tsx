import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostProjectWorkspace } from "@/components/host-project-workspace";

export const metadata: Metadata = {
  title: "프로젝트 지출/증빙 | NUVIO",
  description:
    "선택한 운영 프로젝트의 지출 이벤트와 증빙 체크리스트를 확인하는 화면입니다.",
};

export default async function HostProjectEvidencePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      <HostAccessBanner />
      <HostProjectWorkspace
        projectId={decodeURIComponent(projectId)}
        section="evidence"
      />
    </>
  );
}
