import type { Metadata } from "next";
import { MyPage } from "@/components/my-page";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "마이페이지",
  noIndex: true,
  path: "/me",
});

export default function MePage() {
  return <MyPage />;
}
