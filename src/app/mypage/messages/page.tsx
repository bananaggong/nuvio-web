import type { Metadata } from "next";
import { Suspense } from "react";
import { MypageMessages } from "@/components/mypage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "메세지",
  noIndex: true,
  path: "/mypage/messages",
});

export default function MypageMessagesRoute() {
  return (
    <Suspense fallback={null}>
      <MypageMessages />
    </Suspense>
  );
}
