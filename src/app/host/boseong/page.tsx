import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "전체차LAB 관리자",
  description:
    "전체차LAB 운영 화면은 채널별 표준 운영 경로로 이동했습니다.",
};

export default function HostBoseongPage() {
  redirect("/host/villages/boseong");
}
