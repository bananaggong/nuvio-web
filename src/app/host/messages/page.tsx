import type { Metadata } from "next";
import {
  HostMessageInbox,
  type HostMessageInboxView,
} from "@/components/host-message-inbox";
import {
  buildHostRouteNextPath,
  type HostRouteSearchParams,
  requireHostConsoleAccess,
} from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "메세지함 | 누비오",
  description: "누비오 호스트가 진행 중인 문의와 종료된 상담을 확인하는 화면입니다.",
};

export default async function HostMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<HostRouteSearchParams>;
}) {
  const params = await searchParams;
  await requireHostConsoleAccess(
    buildHostRouteNextPath("/host/messages", params),
  );
  const view: HostMessageInboxView =
    params?.view === "ended" ||
    params?.status === "ended" ||
    params?.status === "end" ||
    params?.panel === "ended" ||
    params?.panel === "end"
      ? "ended"
      : "ongoing";

  return <HostMessageInbox view={view} />;
}
