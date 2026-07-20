import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "호스트 콘솔",
  noIndex: true,
});

export default function HostLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <div className="min-h-screen bg-white text-[#33241C]">
        <SiteHeader />
        <main>{children}</main>
      </div>
    </Suspense>
  );
}
