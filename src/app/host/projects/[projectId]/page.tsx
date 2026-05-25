import type { Metadata } from "next";
import { HostProjectHub } from "@/components/host-project-hub";

export const metadata: Metadata = {
  title: "폴더 운영 허브 | 누비오",
  description:
    "폴더별 신청자, 신청서, 메시지, 활동, 증빙, 마감 업무를 한곳에서 관리하는 호스트 운영 화면입니다.",
};

export default async function HostProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      <HostProjectHub projectId={decodeURIComponent(projectId)} />
    </>
  );
}
