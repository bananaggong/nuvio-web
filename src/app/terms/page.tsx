import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { legalDocuments } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "이용약관",
  description: "그린티모시레 서비스 이용약관입니다.",
};

export default function TermsPage() {
  return <LegalDocumentPage document={legalDocuments.terms} />;
}
