"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SiteHeader } from "@/components/site-header";
import { isVillageMicrositePath } from "@/lib/village-routing";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isVillageMicrosite = isVillageMicrositePath(pathname);

  return (
    <>
      {isVillageMicrosite ? null : <SiteHeader />}
      <main className={isVillageMicrosite ? "flex-1" : "flex-1 pb-20 md:pb-0"}>
        {children}
      </main>
      {isVillageMicrosite ? null : <Footer />}
      {isVillageMicrosite ? null : <MobileTabBar />}
    </>
  );
}
