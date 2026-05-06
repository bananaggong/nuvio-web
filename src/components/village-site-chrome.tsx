import Link from "next/link";
import { ArrowRight, Home, MessageCircle, Sparkles } from "lucide-react";
import { villagePath } from "@/lib/village-routing";
import type { Program } from "@/lib/types";
import type { Village } from "@/lib/village-types";

type VillageSiteHeaderProps = {
  village: Village;
  primaryProgram?: Program;
  variant?: "dark" | "hero" | "light";
};

export function VillageSiteHeader({
  village,
  primaryProgram,
  variant = "hero",
}: VillageSiteHeaderProps) {
  const isHero = variant === "hero";
  const isDark = variant === "dark";
  const homePath = villagePath(village.slug);
  const programHref = primaryProgram
    ? `${homePath}/${primaryProgram.slug}`
    : `${homePath}#programs`;

  if (isDark) {
    return (
      <header className="relative z-30 text-white">
        <div className="bg-[#686864] px-5 py-2 text-center text-xs font-black md:text-sm">
          {village.name} Visit Guide
        </div>
        <div className="bg-[#242421]">
          <div className="mx-auto flex h-24 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
            <Link className="flex min-w-0 items-center gap-4" href={homePath}>
              <VillageMark village={village} />
              <span className="min-w-0">
                <span className="block truncate text-xl font-black md:text-2xl">
                  {village.name}
                </span>
                <span className="block text-xs font-medium text-white/62">
                  Boseong Youth Village
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-14 text-lg font-black md:flex">
              <Link className="hover:text-[#f0b434]" href={`${homePath}#story`}>
                보성 청년마을은
              </Link>
              <Link className="hover:text-[#f0b434]" href={`${homePath}#programs`}>
                프로그램
              </Link>
              <Link className="hover:text-[#f0b434]" href={`${homePath}#notice`}>
                알림마당
              </Link>
            </nav>

            <Link
              className="hidden h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-slate-950 hover:bg-[#f0b434] md:inline-flex"
              href={`${homePath}#guide`}
            >
              참여 및 이용안내
            </Link>

            <Link
              className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-black text-slate-950 md:hidden"
              href={programHref}
            >
              신청
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={
        isHero
          ? "absolute inset-x-0 top-0 z-20 text-white"
          : "sticky top-0 z-30 border-b border-slate-200 bg-white/95 text-slate-950 backdrop-blur"
      }
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        <Link className="flex min-w-0 items-center gap-3" href={homePath}>
          <VillageMark village={village} compact />
          <span className="min-w-0">
            <span className="block truncate text-base font-black">
              {village.name}
            </span>
            <span
              className={
                isHero
                  ? "block text-xs font-bold text-white/70"
                  : "block text-xs font-bold text-slate-500"
              }
            >
              {village.region} {village.city} 공식 홈
            </span>
          </span>
        </Link>

        <nav
          className={
            isHero
              ? "hidden items-center gap-1 rounded-md border border-white/15 bg-white/10 px-1 py-1 text-sm font-black backdrop-blur md:flex"
              : "hidden items-center gap-1 rounded-md bg-slate-100 px-1 py-1 text-sm font-black md:flex"
          }
        >
          <HeaderNavLink href={`${homePath}#story`} isHero={isHero} label="소개" />
          <HeaderNavLink href={`${homePath}#programs`} isHero={isHero} label="프로그램" />
          <HeaderNavLink href={`${homePath}#reviews`} isHero={isHero} label="후기" />
        </nav>

        <div className="flex items-center gap-2">
          {village.kakaoUrl ? (
            <a
              aria-label={`${village.name} 문의하기`}
              className={
                isHero
                  ? "hidden size-10 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20 sm:inline-flex"
                  : "hidden size-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:border-slate-300 sm:inline-flex"
              }
              href={village.kakaoUrl}
              rel="noreferrer"
              target="_blank"
            >
              <MessageCircle size={18} />
            </a>
          ) : null}
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-black text-white shadow-sm hover:opacity-90"
            href={programHref}
            style={{ backgroundColor: village.brandColor }}
          >
            신청
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function VillageMark({
  compact = false,
  village,
}: {
  compact?: boolean;
  village: Village;
}) {
  return (
    <span
      className={
        compact
          ? "flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-black text-white"
          : "flex h-12 w-14 shrink-0 items-end gap-1"
      }
      style={compact ? { backgroundColor: village.brandColor } : undefined}
    >
      {compact ? (
        village.logoText ?? village.name.slice(0, 2)
      ) : (
        <>
          {[16, 24, 32, 40, 48].map((height) => (
            <span
              className="block w-1.5 bg-white"
              key={height}
              style={{ height }}
            />
          ))}
        </>
      )}
    </span>
  );
}

export function VillageSiteFooter({
  village,
  primaryProgram,
}: {
  village: Village;
  primaryProgram?: Program;
}) {
  const homePath = villagePath(village.slug);
  const programHref = primaryProgram
    ? `${homePath}/${primaryProgram.slug}`
    : `${homePath}#programs`;

  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[1fr_auto] md:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 items-center justify-center rounded-md text-sm font-black text-white"
              style={{ backgroundColor: village.brandColor }}
            >
              {village.logoText ?? village.name.slice(0, 2)}
            </span>
            <div>
              <p className="text-lg font-black">{village.name}</p>
              <p className="text-sm font-bold text-white/55">
                {village.region} {village.city} 로컬 체류 공식 홈
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
            {village.summary}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2 md:justify-end">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-slate-950"
            href={programHref}
          >
            <Sparkles size={17} />
            프로그램 보기
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/15 px-4 text-sm font-black text-white/80 hover:bg-white/10"
            href="/villages"
          >
            <Home size={17} />
            로컬 홈 목록
          </Link>
        </div>
      </div>
    </footer>
  );
}

function HeaderNavLink({
  href,
  isHero,
  label,
}: {
  href: string;
  isHero: boolean;
  label: string;
}) {
  return (
    <Link
      className={
        isHero
          ? "rounded-md px-3 py-2 text-white/82 hover:bg-white/12 hover:text-white"
          : "rounded-md px-3 py-2 text-slate-600 hover:bg-white hover:text-slate-950"
      }
      href={href}
    >
      {label}
    </Link>
  );
}
