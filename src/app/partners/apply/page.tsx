import type { Metadata } from "next";
import { PartnerForm } from "@/components/partner-form";

export const metadata: Metadata = {
  title: "빌리지 회원가입",
};

export default function PartnerApplyPage() {
  return <PartnerForm />;
}
