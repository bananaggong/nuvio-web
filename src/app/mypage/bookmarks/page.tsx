import type { Metadata } from "next";
import { MypageBookmarks } from "@/components/mypage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "북마크",
  noIndex: true,
  path: "/mypage/bookmarks",
});

export default function MypageBookmarksRoute() {
  return <MypageBookmarks />;
}
