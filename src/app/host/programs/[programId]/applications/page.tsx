import type { Metadata } from "next";
import { HostApplicationsCrm } from "@/components/host-applications-crm";
import { requireHostConsoleAccess } from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "프로그램 신청자 CRM | 누비오",
  description: "선택한 프로그램의 신청자 목록과 상태를 관리하는 화면입니다.",
};

export default async function StandaloneProgramApplicationsPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const decodedProgramId = decodeURIComponent(programId);
  await requireHostConsoleAccess(
    `/host/programs/${encodeURIComponent(decodedProgramId)}/applications`,
  );

  return <HostApplicationsCrm programId={decodedProgramId} />;
}
