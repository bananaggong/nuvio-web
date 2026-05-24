import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostProgramHub } from "@/components/host-program-hub";

export const metadata: Metadata = {
  title: "프로그램 운영 허브 | 누비오",
  description:
    "폴더 안의 특정 프로그램을 선택해 신청자, 신청서, 안내 메시지를 관리하는 화면입니다.",
};

export default async function HostProgramPage({
  params,
}: {
  params: Promise<{ programId: string; projectId: string }>;
}) {
  const { programId, projectId } = await params;

  return (
    <>
      <HostAccessBanner />
      <HostProgramHub
        programId={decodeURIComponent(programId)}
        projectId={decodeURIComponent(projectId)}
      />
    </>
  );
}
