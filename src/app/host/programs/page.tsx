import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostProgramHome } from "@/components/host-program-home";

export const metadata: Metadata = {
  title: "프로그램 홈 | 누비오",
  description:
    "호스트가 폴더와 최근 프로그램을 한곳에서 확인하고 프로그램 편집 화면으로 이동하는 화면입니다.",
};

export default function HostProgramsPage() {
  return (
    <>
      <HostAccessBanner />
      <HostProgramHome />
    </>
  );
}
