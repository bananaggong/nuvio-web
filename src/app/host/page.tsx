import type { Metadata } from "next";
import { HostOpsDashboard } from "@/components/host-ops-dashboard";

export const metadata: Metadata = {
  title: "호스트 운영 콘솔",
  description:
    "누비오 호스트가 신청자, 안내 메시지, 증빙, 리뷰, 보고서 준비 상태를 관리하는 운영 콘솔입니다.",
};

export default function HostPage() {
  return <HostOpsDashboard />;
}
