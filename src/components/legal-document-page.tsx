import Link from "next/link";
import { legalDocumentList, type LegalDocument } from "@/lib/legal-documents";

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 md:px-8">
      <LegalDocumentContent document={document} />
    </main>
  );
}

export function LegalDocumentContent({
  document,
  hrefPrefix = "",
}: {
  document: LegalDocument;
  hrefPrefix?: string;
}) {
  return (
    <>
      <div>
        <p className="text-sm font-black text-teal-700">그린티모시레</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
          {document.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {document.description}
        </p>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        {legalDocumentList.map((item) => (
          <Link
            className={`inline-flex h-10 items-center border px-3 text-sm font-black ${
              item.key === document.key
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-teal-700 hover:text-teal-700"
            }`}
            href={resolveHref(item.href, hrefPrefix)}
            key={item.key}
          >
            {item.title}
          </Link>
        ))}
      </nav>

      <article className="mt-6 border border-slate-200 bg-white p-5 md:p-7">
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700 md:text-base md:leading-8">
          {document.content}
        </div>
      </article>
    </>
  );
}

function resolveHref(href: string, prefix: string): string {
  if (!prefix) return href;
  if (href === "/terms") return `${prefix}/terms`;
  if (href === "/privacy") return `${prefix}/privacy`;
  return `${prefix}${href}`;
}
