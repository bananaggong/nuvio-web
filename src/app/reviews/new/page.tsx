import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewWriter } from "@/components/review-writer";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "후기 작성",
  noIndex: true,
  path: "/reviews/new",
});

export default function NewReviewPage() {
  if (!launchFeatureFlags.reviews) notFound();

  return <ReviewWriter />;
}
