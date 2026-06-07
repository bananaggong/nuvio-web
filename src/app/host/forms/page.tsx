import type { Metadata } from "next";
import { HostFormLibrary } from "@/components/host-form-library";
import {
  buildHostRouteNextPath,
  type HostRouteSearchParams,
  requireHostConsoleAccess,
} from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "신청폼 관리 | 누비오 호스트",
  description:
    "누비오 호스트가 신청폼을 직접 만들고 프로그램에 복제해 재사용하는 화면입니다.",
};

export default async function HostFormsPage({
  searchParams,
}: {
  searchParams?: Promise<HostRouteSearchParams>;
}) {
  const params = await searchParams;
  await requireHostConsoleAccess(buildHostRouteNextPath("/host/forms", params));
  const kind = params?.kind === "inquiry" ? "inquiry" : "application";

  return (
    <>
      <HostFormLibrary initialKind={kind} />
    </>
  );
}
