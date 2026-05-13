import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostFormBuilder } from "@/components/host-form-builder";

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

  return (
    <>
      <HostAccessBanner />
      <HostFormBuilder
        programId={decodeURIComponent(programId)}
        projectId={decodeURIComponent(projectId)}
      />
    </>
  );
}
