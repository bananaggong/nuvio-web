import type { Metadata } from "next";
import { ReviewFeed } from "@/components/review-feed";

export const metadata: Metadata = {
  title: "지원금 후기",
  description: "여행지원금 선정, 탈락, 여행 후기와 신청 팁을 확인하세요.",
};

export default function ReviewsPage() {
  return <ReviewFeed />;
}
