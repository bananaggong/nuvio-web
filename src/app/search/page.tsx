import type { Metadata } from "next";
import { SearchPage } from "@/components/search-page";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "검색",
  description: "누비오에서 테마와 지역을 기준으로 새로운 여행 프로그램을 찾아보세요.",
  path: "/search",
});

export default function SearchRoutePage() {
  return <SearchPage />;
}
