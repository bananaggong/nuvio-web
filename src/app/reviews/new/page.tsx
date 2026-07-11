import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewWriter } from "@/components/review-writer";
import { getOptionalAuthenticatedUser } from "@/lib/api-security";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { getMyReviewEligibilityFromDb } from "@/lib/review-eligibility-db";
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
  let programTitle = "";

  try {
    const auth = await getOptionalAuthenticatedUser();
    const eligibility =
      auth && applicationId
        ? await getMyReviewEligibilityFromDb(applicationId, auth)
        : null;
    programTitle = eligibility?.programTitle ?? "";
  } catch {
    // A temporary context lookup failure should not hide the review form.
  }

  return (
    <ReviewWriter
      applicationId={applicationId}
      programTitle={programTitle}
      requestToken={requestToken}
    />
  );
}
