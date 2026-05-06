import type { Metadata } from "next";
import { BoseongAdminConsole } from "@/components/boseong-admin-console";
import { HostAccessBanner } from "@/components/host-access-banner";

export const metadata: Metadata = {
  title: "전체차LAB 관리자",
  description:
    "보성청년마을 전체차LAB의 프로그램과 참여 후기를 관리하는 전용 운영 화면입니다.",
};

export default function HostBoseongPage() {
  return (
    <>
      <HostAccessBanner />
      <BoseongAdminConsole />
    </>
  );
}
