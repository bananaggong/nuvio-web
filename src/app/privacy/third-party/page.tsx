import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { legalDocuments } from "@/lib/legal-documents";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "개인정보 제3자 제공 동의",
  description: "누비오 개인정보 제3자 제공 동의입니다.",
  path: "/privacy/third-party",
});

export default function ThirdPartyPrivacyPage() {
  return <LegalDocumentPage document={legalDocuments.thirdParty} />;
}
