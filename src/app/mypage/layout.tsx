import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getOptionalAuthenticatedUser } from "@/lib/api-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MypageLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const auth = await getOptionalAuthenticatedUser();

  if (!auth) {
    redirect("/login?next=%2Fmypage");
  }

  return children;
}
