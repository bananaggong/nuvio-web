import type { Metadata } from "next";
import { HostFormLibrary } from "@/components/host-form-library";

export const metadata: Metadata = {
  title: "신청폼 관리 | 누비오 호스트",
  description:
    "누비오 호스트가 신청폼을 직접 만들고 프로그램에 복제해 재사용하는 화면입니다.",
};

export default function HostFormsPage() {
  return (
    <>
      <HostFormLibrary />
    </>
  );
}
