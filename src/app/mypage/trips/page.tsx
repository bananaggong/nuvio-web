import type { Metadata } from "next";
import { MypageTrips } from "@/components/mypage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "내 여행",
  noIndex: true,
  path: "/mypage/trips",
});

export default function MypageTripsRoute() {
  return <MypageTrips />;
}
