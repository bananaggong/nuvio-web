import type { Metadata } from "next";
import { ReviewFeed } from "@/components/review-feed";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "지원금 후기",
  description: "여행지원금 선정, 탈락, 여행 후기와 신청 팁을 확인하세요.",
  path: "/reviews",
  keywords: ["여행지원금 후기", "지원금 선정 후기", "여행 신청 팁"],
});

export default function ReviewsPage() {
  return <ReviewFeed />;
}
