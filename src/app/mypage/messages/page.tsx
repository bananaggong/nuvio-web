import type { Metadata } from "next";
import { MypageMessages } from "@/components/mypage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "메세지",
  noIndex: true,
  path: "/mypage/messages",
});

export default function MypageMessagesRoute() {
  return <MypageMessages />;
}
