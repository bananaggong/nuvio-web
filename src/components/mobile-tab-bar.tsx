"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, Megaphone, MessageSquareText } from "lucide-react";

const tabs = [
  { href: "/", label: "지원금", icon: ClipboardList },
  { href: "/half-price-travel", label: "반값여행", icon: Home },
  { href: "/reviews", label: "후기", icon: MessageSquareText },
  { href: "/announcements", label: "공지", icon: Megaphone },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2 shadow-[0_-6px_20px_rgba(15,24,36,0.08)] backdrop-blur md:hidden">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold ${
                active
                  ? "bg-teal-50 text-[var(--primary)]"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
              href={tab.href}
              key={tab.href}
            >
              <Icon size={20} strokeWidth={2.2} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
