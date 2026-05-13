import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostProgramCreateWizard } from "@/components/host-program-create-wizard";

export const metadata: Metadata = {
  title: "새 프로그램 신설 | 누비오",
  description:
    "선택한 운영 프로젝트 안에서 공개 모집 프로그램, 신청 폼, 안내문자를 순서대로 만드는 화면입니다.",
};

export default async function HostProgramNewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      <HostAccessBanner />
      <HostProgramCreateWizard projectId={decodeURIComponent(projectId)} />
    </>
  );
}
