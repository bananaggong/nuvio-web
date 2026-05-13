import type { Metadata } from "next";
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
  return <OpsConsoleShell area="host">{children}</OpsConsoleShell>;
}
