"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/magazine", label: "매거진", match: ["/magazine"] },
  { href: "/villages", label: "채널", match: ["/villages"] },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="font-pretendard sticky top-0 z-50 h-[4.861vw] min-h-[56px] border-b border-[#f1e7df] bg-white">
      <div className="mx-auto flex h-full w-full items-center px-[2.083vw] min-[1440px]:px-[2.083vw]">
        <Link
          aria-label="누비오 홈"
          className="flex min-w-fit items-center"
          href="/"
          onClick={() => setOpen(false)}
        >
          <Image
            alt="누비오"
            className="h-[1.875vw] min-h-[22px] w-[5.594vw] min-w-[66px]"
            height={27}
            priority
            src="/brand/nuvio-wordmark.svg"
            width={81}
          />
        </Link>

        <div className="ml-auto hidden items-center gap-[1.458vw] md:flex">
          <Link
            className="inline-flex h-[2.292vw] min-h-[29px] w-[16.111vw] min-w-[196px] items-center gap-[0.486vw] rounded-full border border-[#FF9A3D] bg-white px-[0.694vw] text-[0.833vw] font-semibold leading-none text-[#6D7A8A] transition-colors hover:bg-[#fff8f1]"
            href="/"
          >
            <Search
              aria-hidden="true"
              className="size-[0.903vw] min-h-[11px] min-w-[11px] text-[#FF9A3D]"
              strokeWidth={2}
            />
            어디로 떠날까요?
          </Link>

          <nav className="flex items-center gap-[1.181vw]">
            {navItems.map((item) => (
              <HeaderLink item={item} key={item.href} pathname={pathname} />
            ))}
          </nav>

          <Link
            aria-label="로그인"
            className="inline-flex h-[2.5vw] min-h-[30px] w-[2.153vw] min-w-[26px] items-center justify-center"
            href="/login"
          >
            <Image
              alt=""
              aria-hidden="true"
              className="h-full w-full"
              height={36}
              src="/icons/header-action-frame.png"
              width={31}
            />
          </Link>
        </div>

        <button
          aria-expanded={open}
          aria-label="메뉴 열기"
          className="ml-auto inline-flex size-10 items-center justify-center rounded-[8px] border border-[#FF9A3D] text-[#FF9A3D] md:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#f1e7df] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(91,58,41,0.08)] md:hidden">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-2">
            <Link
              className="mb-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#FF9A3D] px-3 text-[12px] font-semibold text-[#6D7A8A]"
              href="/"
              onClick={() => setOpen(false)}
            >
              <Search
                aria-hidden="true"
                className="size-[13px] text-[#FF9A3D]"
                strokeWidth={2}
              />
              어디로 떠날까요?
            </Link>
            {navItems.map((item) => (
              <MobileLink
                item={item}
                key={item.href}
                onSelect={() => setOpen(false)}
                pathname={pathname}
              />
            ))}
            <Link
              className="inline-flex min-h-12 items-center justify-between rounded-[8px] px-3 text-sm font-semibold text-[#5B3A29] hover:bg-[#fff8f1]"
              href="/login"
              onClick={() => setOpen(false)}
            >
              로그인
              <Image
                alt=""
                aria-hidden="true"
                className="h-[36px] w-[31px]"
                height={36}
                src="/icons/header-action-frame.png"
                width={31}
              />
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
      className={`text-[1.111vw] font-semibold leading-none transition-colors hover:text-[#FF9A3D] ${
        active ? "text-[#FF9A3D]" : "text-[#5B3A29]"
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
      className={`flex min-h-12 items-center justify-between rounded-[8px] px-3 text-sm font-semibold hover:bg-[#fff8f1] ${
        active ? "text-[#FF9A3D]" : "text-[#5B3A29]"
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
