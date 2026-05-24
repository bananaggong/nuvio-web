import type { Metadata } from "next";
import { Mypage } from "@/components/mypage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "마이페이지",
  noIndex: true,
  path: "/mypage",
});

export default function MypageRoute() {
  return <Mypage />;
}
