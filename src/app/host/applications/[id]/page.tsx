import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getHostApplicationDetail } from "@/lib/host-application-db";
import { requireHostConsoleAccess } from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HostApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "신청자 관리",
  description: "누비오 호스트가 신청서 응답과 상태 이력을 확인하는 화면입니다.",
};

export default async function HostApplicationDetailPage({
  params,
}: HostApplicationDetailPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const overview = await requireHostConsoleAccess(
    `/host/applications/${encodeURIComponent(decodedId)}`,
  );
  const villageIds = overview.isAdmin
    ? undefined
    : overview.workspaces.map((workspace) => workspace.villageId);
  const application = await getHostApplicationDetail(decodedId, { villageIds });

  if (!application?.programId) {
    notFound();
  }

  redirect(
    `/host/programs/${encodeURIComponent(String(application.programId))}/applications?applicationId=${encodeURIComponent(decodedId)}`,
  );
}
