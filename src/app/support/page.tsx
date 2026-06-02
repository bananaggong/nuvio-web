import type { Metadata } from "next";
import { MypageSupport } from "@/components/mypage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "고객센터",
  description: "누비오 이용 중 궁금한 점을 문의할 수 있는 고객센터입니다.",
  noIndex: true,
  path: "/support",
});

export default function SupportPage() {
  return <MypageSupport />;
}
