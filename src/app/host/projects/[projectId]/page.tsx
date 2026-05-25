import type { Metadata } from "next";
import { HostProjectHub } from "@/components/host-project-hub";

export const metadata: Metadata = {
  title: "폴더 | 누비오",
  description: "폴더 안에 모아둔 프로그램 목록을 확인하는 화면입니다.",
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
