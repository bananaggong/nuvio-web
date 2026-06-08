import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MypageReviews } from "@/components/mypage";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "후기",
  noIndex: true,
  path: "/mypage/reviews",
});

export default function MypageReviewsRoute() {
  if (!launchFeatureFlags.reviews) notFound();

  return <MypageReviews />;
}
