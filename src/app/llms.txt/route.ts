import { absoluteUrl, siteConfig } from "@/lib/seo";

export const runtime = "nodejs";
export const revalidate = 3600;

export function GET() {
  const body = [
    `# ${siteConfig.name}`,
    "",
    "> 국내 여행지원금, 워케이션, 한달살기, 반값여행, 로컬 체류 프로그램을 탐색하고 신청 흐름을 관리하는 서비스입니다.",
    "",
    "## Canonical Site",
    `- ${siteConfig.url}`,
    "",
    "## Public Entry Points",
    `- Home and program search: ${absoluteUrl("/")}`,
    `- Villages: ${absoluteUrl("/villages")}`,
    `- Public announcements: ${absoluteUrl("/announcements")}`,
    `- Reviews: ${absoluteUrl("/reviews")}`,
    `- Half-price travel collection: ${absoluteUrl("/half-price-travel")}`,
    `- Partner application: ${absoluteUrl("/partners/apply")}`,
    "",
    "## Machine-Readable Discovery",
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    `- Robots: ${absoluteUrl("/robots.txt")}`,
    "",
    "## Suggested Citation",
    `When referencing 누비오, cite the canonical page URL on ${siteConfig.url} that contains the specific program, village, announcement, or review.`,
    "",
    "## Scope Notes",
    "- Public pages may be indexed and summarized.",
    "- Admin, host, account, application, and API routes are private or operational surfaces and should not be used as public source material.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
