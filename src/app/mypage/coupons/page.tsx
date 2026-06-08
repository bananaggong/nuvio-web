import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MypageCoupons } from "@/components/mypage";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "쿠폰함",
  noIndex: true,
  path: "/mypage/coupons",
});

export default function MypageCouponsRoute() {
  if (!launchFeatureFlags.coupons) notFound();

  return <MypageCoupons />;
}
