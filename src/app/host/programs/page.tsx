import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostProgramStudio } from "@/components/host-program-studio";

export const metadata: Metadata = {
  title: "프로그램 스튜디오",
  description:
    "누비오 호스트가 지역 체류 프로그램 공급 데이터를 등록하고 검수하는 화면입니다.",
};

export default function HostProgramsPage() {
  return (
    <>
      <HostAccessBanner />
      <HostProgramStudio />
    </>
  );
}
