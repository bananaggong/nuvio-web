import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostProjectCreateWizard } from "@/components/host-project-create-wizard";

export const metadata: Metadata = {
  title: "새 운영 프로젝트 | 누비오",
  description:
    "누비오 호스트가 예산, 증빙, 활동, 보고를 묶는 상위 운영 프로젝트를 생성하는 화면입니다.",
};

export default function HostProjectNewPage() {
  return (
    <>
      <HostAccessBanner />
      <HostProjectCreateWizard />
    </>
  );
}
