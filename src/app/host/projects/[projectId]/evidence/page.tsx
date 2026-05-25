import type { Metadata } from "next";
import { HostProjectWorkspace } from "@/components/host-project-workspace";

export const metadata: Metadata = {
  title: "폴더 지출/증빙 | 누비오",
  description:
    "선택한 폴더의 지출 이벤트와 증빙 체크리스트를 확인하는 화면입니다.",
};

export default async function HostProjectEvidencePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      <HostProjectWorkspace
        projectId={decodeURIComponent(projectId)}
        section="evidence"
      />
    </>
  );
}
