import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewWriter } from "@/components/review-writer";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { createSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = createSeoMetadata({
  title: "후기 작성",
  noIndex: true,
  path: "/reviews/new",
});

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string; requestToken?: string }>;
}) {
  if (!launchFeatureFlags.reviews) notFound();

  const { applicationId, requestToken } = await searchParams;
  return <ReviewWriter applicationId={applicationId} requestToken={requestToken} />;
}
