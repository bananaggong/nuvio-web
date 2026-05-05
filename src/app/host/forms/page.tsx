import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostFormBuilder } from "@/components/host-form-builder";

export const metadata: Metadata = {
  title: "신청서 빌더",
  description: "누비오 호스트가 프로그램 신청서 질문을 직접 구성하는 화면입니다.",
};

export default function HostFormsPage() {
  return (
    <>
      <HostAccessBanner />
      <HostFormBuilder />
    </>
  );
}
