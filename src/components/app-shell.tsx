"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SiteHeader } from "@/components/site-header";
import { isChannelMicrositePath } from "@/lib/channel-routing";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChannelMicrosite = isChannelMicrositePath(pathname);
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/onboarding" ||
    pathname === "/account-recovery";
  const isOpsConsole =
    pathname === "/host" ||
    pathname.startsWith("/host/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");
  const hideChrome = isChannelMicrosite || isAuthPage || isOpsConsole;

  if (isOpsConsole) {
    return <>{children}</>;
  }

  return (
    <>
      {isAuthPage ? null : <SiteHeader />}
      <main className={hideChrome ? "flex-1" : "flex-1 pb-20 md:pb-0"}>
        {children}
      </main>
      {hideChrome ? null : <Footer />}
      {hideChrome ? null : <MobileTabBar />}
    </>
  );
}
