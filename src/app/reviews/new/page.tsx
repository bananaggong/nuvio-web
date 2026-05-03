import type { Metadata } from "next";
import { ReviewWriter } from "@/components/review-writer";

export const metadata: Metadata = {
  title: "후기 작성",
};

export default function NewReviewPage() {
  return <ReviewWriter />;
}
