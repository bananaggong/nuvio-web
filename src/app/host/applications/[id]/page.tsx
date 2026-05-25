import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostApplicationDetail } from "@/components/host-application-detail";

type HostApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "신청서 상세",
  description: "누비오 호스트가 신청서 응답과 상태 이력을 확인하는 화면입니다.",
};

export default async function HostApplicationDetailPage({
  params,
}: HostApplicationDetailPageProps) {
  const { id } = await params;

  return (
    <>
      <HostAccessBanner />
      <HostApplicationDetail applicationId={id} />
    </>
  );
}
