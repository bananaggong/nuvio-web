import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostVillageStudio } from "@/components/host-village-studio";

export const metadata: Metadata = {
  title: "로컬홈 페이지 관리 | NUVIO Host",
  description:
    "호스트가 자신의 로컬홈 페이지와 연결 프로그램, 소개, 문의 정보를 관리합니다.",
};

export default function HostVillagesPage() {
  return (
    <>
      <HostAccessBanner />
      <HostVillageStudio />
    </>
  );
}
