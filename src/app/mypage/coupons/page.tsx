import type { Metadata } from "next";
import { MypageCoupons } from "@/components/mypage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "쿠폰함",
  noIndex: true,
  path: "/mypage/coupons",
});

export default function MypageCouponsRoute() {
  return <MypageCoupons />;
}
