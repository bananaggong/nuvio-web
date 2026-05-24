import type { Metadata } from "next";
import { MypagePoints } from "@/components/mypage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "포인트",
  noIndex: true,
  path: "/mypage/points",
});

export default function MypagePointsRoute() {
  return <MypagePoints />;
}
