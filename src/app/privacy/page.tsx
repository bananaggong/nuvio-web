import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { legalDocuments } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "개인정보 수집 및 이용",
  description: "그린티모시레 개인정보 수집 및 이용 동의입니다.",
};

export default function PrivacyCollectionPage() {
  return <LegalDocumentPage document={legalDocuments.privacyCollection} />;
}
