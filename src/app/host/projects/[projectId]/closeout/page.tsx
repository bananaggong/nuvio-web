import type { Metadata } from "next";
import { HostProjectWorkspace } from "@/components/host-project-workspace";

export const metadata: Metadata = {
  title: "폴더 마감/보고 | 누비오",
  description:
    "선택한 폴더의 마감 준비율과 누락 항목을 점검하는 화면입니다.",
};

export default async function HostProjectCloseoutPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      <HostProjectWorkspace
        projectId={decodeURIComponent(projectId)}
        section="closeout"
      />
    </>
  );
}
