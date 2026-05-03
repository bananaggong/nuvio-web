"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  Download,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "여행지원금" },
  { href: "/half-price-travel", label: "반값여행" },
  { href: "/reviews", label: "후기" },
  { href: "/announcements", label: "실시간공지" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-white/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Link className="flex items-center gap-2" href="/" onClick={() => setOpen(false)}>
          <div className="flex size-10 items-center justify-center rounded-md bg-[var(--primary)] font-black text-white shadow-sm">
            N
          </div>
          <div className="leading-tight">
            <div className="text-lg font-black tracking-tight">NUVIO</div>
            <div className="hidden text-[11px] font-medium text-slate-500 sm:block">
              여행지원금 필수 탐색 앱
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-bold ${
                  active
                    ? "bg-[var(--surface-muted)] text-[var(--primary-strong)]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            href="/partners/apply"
          >
            <BriefcaseBusiness size={17} />
            파트너 등록
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-bold text-white hover:bg-slate-800"
            href="/login"
          >
            <UserRound size={17} />
            시작하기
          </Link>
          <button
            aria-label="앱 다운로드"
            className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            type="button"
          >
            <Download size={18} />
          </button>
          <Link
            aria-label="내 알림"
            className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            href="/me"
          >
            <Bell size={18} />
          </Link>
        </div>

        <button
          aria-expanded={open}
          aria-label="메뉴 열기"
          className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            {navItems.map((item) => (
              <Link
                className="flex items-center justify-between rounded-md px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
                <ChevronDown className="-rotate-90" size={16} />
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                className="rounded-md border border-slate-200 px-3 py-3 text-center text-sm font-bold"
                href="/partners/apply"
                onClick={() => setOpen(false)}
              >
                파트너 등록
              </Link>
              <Link
                className="rounded-md bg-slate-950 px-3 py-3 text-center text-sm font-bold text-white"
                href="/login"
                onClick={() => setOpen(false)}
              >
                시작하기
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
