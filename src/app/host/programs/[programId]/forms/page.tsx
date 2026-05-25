import type { Metadata } from "next";
import { HostFormBuilder } from "@/components/host-form-builder";

export const metadata: Metadata = {
  title: "프로그램 신청 폼 | 누비오",
  description: "선택한 프로그램의 신청 폼 질문을 구성하는 화면입니다.",
};

export default async function StandaloneProgramFormsPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;

  return <HostFormBuilder programId={decodeURIComponent(programId)} />;
}
