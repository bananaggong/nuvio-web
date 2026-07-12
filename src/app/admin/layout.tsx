import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OpsConsoleShell } from "@/components/ops-console-shell";
import { isApiAuthError, requireAdminRole } from "@/lib/api-security";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "관리자 콘솔",
  noIndex: true,
});

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) {
    redirect(
      auth.response.status === 401 ? "/login?next=/admin/magazine" : "/",
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <OpsConsoleShell area="admin">{children}</OpsConsoleShell>
    </Suspense>
  );
}
