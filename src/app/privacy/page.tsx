import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { legalDocuments } from "@/lib/legal-documents";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "개인정보 처리방침",
  description: "누비오 개인정보 처리방침입니다.",
  path: "/privacy",
});

export default function PrivacyCollectionPage() {
  return <LegalDocumentPage document={legalDocuments.privacyCollection} />;
}
