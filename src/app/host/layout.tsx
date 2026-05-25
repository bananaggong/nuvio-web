import type { Metadata } from "next";
import { Suspense } from "react";
import { OpsConsoleShell } from "@/components/ops-console-shell";
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
      <OpsConsoleShell area="host">{children}</OpsConsoleShell>
    </Suspense>
  );
}
