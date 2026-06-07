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
  description: "선택한 프로그램의 안내 메시지를 준비하는 화면입니다.",
};

export default async function StandaloneProgramMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<HostRouteSearchParams>;
}) {
  const { programId } = await params;
  const decodedProgramId = decodeURIComponent(programId);
  const queryParams = await searchParams;
  await requireHostConsoleAccess(
    buildHostRouteNextPath(
      `/host/programs/${encodeURIComponent(decodedProgramId)}/messages`,
      queryParams,
    ),
  );
  const panel =
    typeof queryParams?.panel === "string" ? queryParams.panel : undefined;

  return (
    <HostMessageAutomation
      panel={panel}
      programId={decodedProgramId}
    />
  );
}
