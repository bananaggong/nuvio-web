import type { Metadata } from "next";
import { PartnerForm } from "@/components/partner-form";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "운영 문의",
  description:
    "로컬 프로그램 운영자가 누비오 로컬페이지 구성과 운영 협업을 문의할 수 있습니다.",
  path: "/partners/apply",
  keywords: ["로컬 프로그램 운영", "로컬페이지 문의", "청년마을 운영"],
});

export default function PartnerApplyPage() {
  return <PartnerForm />;
}
