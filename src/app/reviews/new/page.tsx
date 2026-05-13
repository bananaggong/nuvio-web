import type { Metadata } from "next";
import { ReviewWriter } from "@/components/review-writer";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "후기 작성",
  noIndex: true,
  path: "/reviews/new",
});

export default function NewReviewPage() {
  return <ReviewWriter />;
}
