import type { Metadata } from "next";
import { MypageSettings } from "@/components/mypage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "설정",
  noIndex: true,
  path: "/mypage/settings",
});

export default function MypageSettingsRoute() {
  return <MypageSettings />;
}
