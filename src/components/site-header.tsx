"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "프로그램탐색", match: ["/programs", "/half-price-travel"] },
  { href: "/villages", label: "로컬홈", match: ["/villages"] },
];

const accountItems = [
  { href: "/login", label: "로그인", match: ["/login", "/signup"] },
];

const registerItem = {
  href: "/login?intent=host&next=/partners/apply",
  label: "프로그램 등록하기",
  match: ["/partners/apply"],
};

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-5 px-4 md:px-8">
        <Link
          aria-label="누비오 홈"
          className="flex min-w-fit items-center"
          href="/"
          onClick={() => setOpen(false)}
        >
          <Image
            alt="누비오"
            className="h-8 w-auto"
            height={40}
            priority
            src="/brand/nuvio-wordmark.svg"
            width={120}
          />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {navItems.map((item) => (
            <HeaderLink item={item} key={item.href} pathname={pathname} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {accountItems.map((item) => (
            <HeaderLink item={item} key={item.href} pathname={pathname} />
          ))}
          <Link
            aria-current={isActive(registerItem, pathname) ? "page" : undefined}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"
            href={registerItem.href}
          >
            <Plus size={16} />
            {registerItem.label}
          </Link>
        </div>

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
            {[...navItems, ...accountItems].map((item) => (
              <MobileLink
                item={item}
                key={item.href}
                onSelect={() => setOpen(false)}
                pathname={pathname}
              />
            ))}
            <Link
              className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
              href={registerItem.href}
              onClick={() => setOpen(false)}
            >
              <Plus size={16} />
              {registerItem.label}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function HeaderLink({
  item,
  pathname,
}: {
  item: { href: string; label: string; match: string[] };
  pathname: string;
}) {
  const active = isActive(item, pathname);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-4 py-2 text-sm font-black ${
        active
          ? "bg-[var(--surface-muted)] text-[var(--primary-strong)]"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
      href={item.href}
    >
      {item.label}
    </Link>
  );
}

function MobileLink({
  item,
  onSelect,
  pathname,
}: {
  item: { href: string; label: string; match: string[] };
  onSelect: () => void;
  pathname: string;
}) {
  const active = isActive(item, pathname);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 items-center justify-between rounded-md px-3 text-sm font-bold ${
        active
          ? "bg-[var(--surface-muted)] text-[var(--primary-strong)]"
          : "text-slate-700 hover:bg-slate-50"
      }`}
      href={item.href}
      onClick={onSelect}
    >
      {item.label}
    </Link>
  );
}

function isActive(
  item: { href: string; match: string[] },
  pathname: string,
): boolean {
  if (item.href === "/") {
    return pathname === "/" || item.match.some((path) => pathname.startsWith(path));
  }

  return pathname.startsWith(item.href) || item.match.some((path) => pathname.startsWith(path));
}
