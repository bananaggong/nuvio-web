import Link from "next/link";
import {
  legalDocumentList,
  type LegalDocument,
  type LegalDocumentBlock,
} from "@/lib/legal-documents";

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <div className="bg-[#FFFDF9] font-pretendard text-[#5B3A29]">
      <LegalDocumentContent document={document} />
    </div>
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
    <div className="mx-auto w-full max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
      <header className="border-b border-[#F1E2D7] pb-8 md:pb-10">
        <p className="text-xs font-semibold tracking-[0.12em] text-[#FE701E]">
          누비오 정책
        </p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[34px] font-semibold leading-[1.25] tracking-normal text-[#5B3A29] md:text-[44px]">
              {document.title}
            </h1>
            <p className="mt-4 max-w-[720px] text-[15px] font-medium leading-[1.8] text-[#6D7A8A]">
              {document.description}
            </p>
          </div>
          <div className="w-fit rounded-full border border-[#F3D7C4] bg-white px-4 py-2 text-sm font-semibold text-[#6D7A8A]">
            시행일 {document.effectiveDate}
          </div>
        </div>
      </header>

      <nav className="mt-7 flex flex-wrap gap-2" aria-label="법적 고지 문서">
        {legalDocumentList.map((item) => {
          const active = item.key === document.key;

          return (
            <Link
              className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition ${
                active
                  ? "border-[#FE701E] bg-[#FE701E] text-white"
                  : "border-[#F1E2D7] bg-white text-[#5B3A29] hover:border-[#FE701E] hover:text-[#FE701E]"
              }`}
              href={resolveHref(item.href, hrefPrefix)}
              key={item.key}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>

      <article className="mt-8 overflow-hidden rounded-[8px] border border-[#F1E2D7] bg-white shadow-[0_18px_60px_rgba(91,58,41,0.06)]">
        <div className="border-b border-[#F1E2D7] bg-[#FFF8F2] px-5 py-4 md:px-8">
          <p className="text-sm font-semibold text-[#FE701E]">{document.title}</p>
        </div>
        <div className="px-5 py-6 md:px-8 md:py-9">
          {document.blocks.map((block, index) => (
            <LegalDocumentBlockView block={block} key={`${block.type}-${index}`} />
          ))}
        </div>
      </article>
    </div>
  );
}

function LegalDocumentBlockView({ block }: { block: LegalDocumentBlock }) {
  if (block.type === "heading") {
    const HeadingTag = block.level === 2 ? "h2" : "h3";
    const className =
      block.level === 2
        ? "mb-4 mt-9 text-[20px] font-semibold leading-[1.5] text-[#5B3A29] first:mt-0 md:text-[22px]"
        : "mb-3 mt-7 text-[17px] font-semibold leading-[1.5] text-[#5B3A29] first:mt-0 md:text-[18px]";

    return <HeadingTag className={className}>{block.text}</HeadingTag>;
  }

  if (block.type === "table") {
    return (
      <div className="my-6 overflow-x-auto rounded-[6px] border border-[#F1E2D7]">
        <table className="min-w-full border-collapse text-left text-[13px] leading-[1.6] text-[#5B3A29] md:text-sm">
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr
                className={rowIndex === 0 ? "bg-[#FFF8F2] font-semibold" : "bg-white"}
                key={rowIndex}
              >
                {row.map((cell, cellIndex) => {
                  const CellTag = rowIndex === 0 ? "th" : "td";

                  return (
                    <CellTag
                      className="min-w-[160px] whitespace-pre-line border-b border-r border-[#F1E2D7] px-4 py-3 align-top last:border-r-0"
                      key={cellIndex}
                    >
                      {cell}
                    </CellTag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <p className="mb-4 text-[14px] font-medium leading-[1.9] text-[#5B3A29] md:text-[15px]">
      {block.text}
    </p>
  );
}

function resolveHref(href: string, prefix: string): string {
  if (!prefix) return href;
  if (href === "/terms") return `${prefix}/terms`;
  if (href === "/privacy") return `${prefix}/privacy`;
  return `${prefix}${href}`;
}
