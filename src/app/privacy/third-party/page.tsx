import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { legalDocuments } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "개인정보 제3자 제공 동의",
  description: "그린티모시레 개인정보 제3자 제공 동의입니다.",
};

export default function ThirdPartyPrivacyPage() {
  return <LegalDocumentPage document={legalDocuments.thirdParty} />;
}
