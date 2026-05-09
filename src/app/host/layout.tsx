import { OpsConsoleShell } from "@/components/ops-console-shell";

export default function HostLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <OpsConsoleShell area="host">{children}</OpsConsoleShell>;
}
