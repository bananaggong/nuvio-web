import type { Metadata } from "next";
import { HostMessageAutomation } from "@/components/host-message-automation";

export const metadata: Metadata = {
  title: "프로그램 메시지 | 누비오",
  description: "선택한 프로그램의 안내 메시지를 준비하는 화면입니다.",
};

export default async function StandaloneProgramMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{ panel?: string }>;
}) {
  const { programId } = await params;
  const panel = (await searchParams)?.panel;

  return (
    <HostMessageAutomation
      panel={panel}
      programId={decodeURIComponent(programId)}
    />
  );
}
