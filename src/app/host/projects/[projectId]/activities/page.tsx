import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostProjectWorkspace } from "@/components/host-project-workspace";

export const metadata: Metadata = {
  title: "폴더 활동/참석 | 누비오",
  description:
    "선택한 폴더의 활동, 참석자, 사진 기록을 확인하는 화면입니다.",
};

export default async function HostProjectActivitiesPage({
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
        section="activities"
      />
    </>
  );
}
