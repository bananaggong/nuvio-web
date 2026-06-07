import type { Metadata } from "next";
import { HostApplicationDetail } from "@/components/host-application-detail";
import { requireHostConsoleAccess } from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const decodedId = decodeURIComponent(id);
  await requireHostConsoleAccess(
    `/host/applications/${encodeURIComponent(decodedId)}`,
  );

  return (
    <>
      <HostApplicationDetail applicationId={decodedId} />
    </>
  );
}
