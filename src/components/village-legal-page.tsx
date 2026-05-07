import { LegalDocumentContent } from "@/components/legal-document-page";
import {
  VillageSiteFooter,
  VillageSiteHeader,
} from "@/components/village-site-chrome";
import type { LegalDocument } from "@/lib/legal-documents";
import type { Village } from "@/lib/village-types";

export function VillageLegalPage({
  document,
  village,
}: {
  document: LegalDocument;
  village: Village;
}) {
  return (
    <div className="bg-[#f6f4ee] text-[#171717]">
      <VillageSiteHeader variant="dark" village={village} />
      <main className="mx-auto max-w-4xl px-5 py-12 md:px-8">
        <LegalDocumentContent document={document} hrefPrefix={`/${village.slug}`} />
      </main>
      <VillageSiteFooter village={village} />
    </div>
  );
}
