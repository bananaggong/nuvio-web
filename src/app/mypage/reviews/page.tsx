import type { Metadata } from "next";
import { MypageReviews } from "@/components/mypage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "후기",
  noIndex: true,
  path: "/mypage/reviews",
});

export default function MypageReviewsRoute() {
  return <MypageReviews />;
}
