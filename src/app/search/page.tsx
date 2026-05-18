import type { Metadata } from "next";
import { SearchPage } from "@/components/search-page";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "검색",
  description: "누비오에서 여행 일정, 인원, 카테고리 조건으로 프로그램을 검색하세요.",
  path: "/search",
});

export default function SearchRoutePage() {
  return <SearchPage />;
}
