import type { Metadata } from "next";
import { HostProjectCreateWizard } from "@/components/host-project-create-wizard";

export const metadata: Metadata = {
  title: "새 폴더 | 누비오",
  description: "프로그램을 모아둘 폴더를 생성하는 화면입니다.",
};

export default function HostProjectNewPage() {
  return (
    <>
      <HostProjectCreateWizard />
    </>
  );
}
