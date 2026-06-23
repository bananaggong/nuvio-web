"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, MapPinned, UserRound } from "lucide-react";

const tabs = [
  { href: "/", label: "프로그램탐색", icon: ClipboardList, match: ["/programs"] },
  { href: "/channels", label: "채널", icon: MapPinned, match: ["/channels"] },
  { href: "/login", label: "로그인", icon: UserRound, match: ["/login", "/signup"] },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-6px_20px_rgba(15,24,36,0.08)] backdrop-blur md:hidden">
      <div className="grid grid-cols-3 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            tab.href === "/"
              ? pathname === "/" || tab.match.some((path) => pathname.startsWith(path))
              : pathname.startsWith(tab.href) ||
                tab.match.some((path) => pathname.startsWith(path));

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-semibold ${
                active
                  ? "bg-teal-50 text-[var(--primary)]"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
              href={tab.href}
              key={tab.href}
            >
              <Icon size={19} strokeWidth={2.2} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
