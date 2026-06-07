import type { Metadata } from "next";
import { HostApplicationsCrm } from "@/components/host-applications-crm";
import {
  buildHostRouteNextPath,
  type HostRouteSearchParams,
  requireHostConsoleAccess,
} from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "신청자 CRM",
  description:
    "누비오 호스트가 프로그램 신청자를 검색하고 상태를 관리하는 신청자 CRM입니다.",
};

export default async function HostApplicationsPage({
  searchParams,
}: {
  searchParams?: Promise<HostRouteSearchParams>;
}) {
  await requireHostConsoleAccess(
    buildHostRouteNextPath("/host/applications", await searchParams),
  );

  return (
    <>
      <HostApplicationsCrm />
    </>
  );
}
