"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "프로그램", match: ["/programs", "/half-price-travel"] },
  { href: "/villages", label: "로컬 홈", match: ["/villages"] },
  { href: "/me", label: "내 누비오", match: ["/me", "/login"] },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Link
          aria-label="NUVIO 홈"
          className="flex min-w-fit items-center"
          href="/"
          onClick={() => setOpen(false)}
        >
          <Image
            alt="NUVIO"
            className="h-8 w-auto"
            height={40}
            priority
            src="/brand/nuvio-wordmark.svg"
            width={120}
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/" || item.match.some((path) => pathname.startsWith(path))
                : pathname.startsWith(item.href) ||
                  item.match.some((path) => pathname.startsWith(path));

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-4 py-2 text-sm font-black ${
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

        <div className="hidden min-w-[120px] md:block" aria-hidden="true" />

        <button
          aria-expanded={open}
          aria-label="메뉴 열기"
          className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 md:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
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
          </div>
        </div>
      ) : null}
    </header>
  );
}
