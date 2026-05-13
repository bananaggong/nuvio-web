import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { legalDocuments } from "@/lib/legal-documents";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "이용약관",
  description: "NUVIO 서비스 이용약관입니다.",
  path: "/terms",
});

export default function TermsPage() {
  return <LegalDocumentPage document={legalDocuments.terms} />;
}
