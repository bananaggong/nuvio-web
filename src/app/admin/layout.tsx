import type { Metadata } from "next";
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
  return <OpsConsoleShell area="admin">{children}</OpsConsoleShell>;
}
