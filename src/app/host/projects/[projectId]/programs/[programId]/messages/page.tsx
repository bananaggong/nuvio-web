import type { Metadata } from "next";
import { HostMessageAutomation } from "@/components/host-message-automation";
import {
  buildHostRouteNextPath,
  type HostRouteSearchParams,
  requireHostConsoleAccess,
} from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "프로그램 메시지 | 누비오",
  description:
    "선택한 프로그램 신청자에게 보낼 안내 메시지를 예약하고 수신자 큐를 관리하는 화면입니다.",
};

export default async function HostProgramMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string; projectId: string }>;
  searchParams?: Promise<HostRouteSearchParams>;
}) {
  const { programId, projectId } = await params;
  const decodedProgramId = decodeURIComponent(programId);
  const decodedProjectId = decodeURIComponent(projectId);
  const queryParams = await searchParams;
  await requireHostConsoleAccess(
    buildHostRouteNextPath(
      `/host/projects/${encodeURIComponent(decodedProjectId)}/programs/${encodeURIComponent(decodedProgramId)}/messages`,
      queryParams,
    ),
  );
  const panel =
    typeof queryParams?.panel === "string" ? queryParams.panel : undefined;

  return (
    <>
      <HostMessageAutomation
        panel={panel}
        programId={decodedProgramId}
        projectId={decodedProjectId}
      />
    </>
  );
}
