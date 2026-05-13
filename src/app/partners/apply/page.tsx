import type { Metadata } from "next";
import { PartnerForm } from "@/components/partner-form";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "빌리지 회원가입",
  description:
    "로컬 프로그램 운영자가 누비오 로컬홈을 개설하고 모집, 신청, 후기 관리를 시작할 수 있습니다.",
  path: "/partners/apply",
  keywords: ["로컬 프로그램 등록", "로컬홈 개설", "청년마을 운영"],
});

export default function PartnerApplyPage() {
  return <PartnerForm />;
}
