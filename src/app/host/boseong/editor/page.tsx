import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "보성 공개 페이지 편집 | 누비오",
  description:
    "전체차LAB 공개 페이지 편집은 채널별 표준 운영 경로로 이동했습니다.",
};

export default function HostBoseongEditorPage() {
  redirect("/host/channels/settings?channel=boseong");
}
