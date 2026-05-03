import type { Metadata } from "next";
import { PartnerForm } from "@/components/partner-form";

export const metadata: Metadata = {
  title: "파트너 등록",
};

export default function PartnerApplyPage() {
  return <PartnerForm />;
}
