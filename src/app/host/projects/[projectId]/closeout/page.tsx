import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostProjectWorkspace } from "@/components/host-project-workspace";

export const metadata: Metadata = {
  title: "프로젝트 마감/보고 | NUVIO",
  description:
    "선택한 운영 프로젝트의 마감 준비율과 누락 항목을 점검하는 화면입니다.",
};

export default async function HostProjectCloseoutPage({
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
        section="closeout"
      />
    </>
  );
}
