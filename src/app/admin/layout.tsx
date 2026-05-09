import { OpsConsoleShell } from "@/components/ops-console-shell";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <OpsConsoleShell area="admin">{children}</OpsConsoleShell>;
}
