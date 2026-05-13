import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostFormBuilder } from "@/components/host-form-builder";

export const metadata: Metadata = {
  title: "프로젝트 신청서 설정 | NUVIO",
  description:
    "선택한 운영 프로젝트의 모집 흐름에 연결되는 신청서 질문을 구성하는 화면입니다.",
};

export default async function HostProjectFormsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      <HostAccessBanner />
      <HostFormBuilder projectId={decodeURIComponent(projectId)} />
    </>
  );
}
