import type { Metadata } from "next";
import { Suspense } from "react";
import { OpsConsoleShell } from "@/components/ops-console-shell";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "관리자 콘솔",
  noIndex: true,
});

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <OpsConsoleShell area="admin">{children}</OpsConsoleShell>
    </Suspense>
  );
}
