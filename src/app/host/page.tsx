import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HostCenterHome } from "@/components/host-center-home";
import { HostLocalPageCreate } from "@/components/host-local-page-create";
import { getHostConsoleOverview } from "@/lib/host-village-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "호스트센터 | 누비오",
  description:
    "누비오 호스트가 채널와 프로그램을 관리하는 시작 화면입니다.",
};

export default async function HostPage() {
  const overview = await getHostConsoleOverview();

  if (!overview.signedIn) {
    redirect("/login?intent=host&next=/host");
  }

  if (overview.signedIn && overview.workspaces.length === 0) {
    return <HostLocalPageCreate />;
  }

  if (overview.signedIn && overview.workspaces[0]) {
    return <HostCenterHome workspace={overview.workspaces[0]} />;
  }
}
