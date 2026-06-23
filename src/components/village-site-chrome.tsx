import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Home,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import {
  BoseongFigmaFooter,
  BoseongFigmaHeader,
} from "@/components/boseong-figma-site";
import { villagePath } from "@/lib/village-routing";
import { greentmosireLogoImage } from "@/lib/village-media-seeds";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
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
}: VillageSiteHeaderProps) {
  if (village.slug === "boseong") {
    return <BoseongFigmaHeader primaryProgram={primaryProgram} village={village} />;
  }

  const homePath = villagePath(village.slug);
  const operatorLabel =
    village.slug === "boseong"
      ? "그린티모시레"
      : `${village.region} ${village.city}`;
  const programHref = primaryProgram
    ? `${homePath}/${primaryProgram.slug}`
    : `${homePath}/programs`;

  return (
    <header className="relative z-30 border-b border-[#d9d6c9] bg-[#11130f] text-white">
      <div className="border-b border-white/10 bg-[#4E7C3A] px-4 py-2 text-center text-xs font-black md:text-sm">
        {village.region} {village.city} 청년마을 · {village.name}
      </div>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 md:h-24 md:px-8">
        <Link className="flex min-w-0 items-center gap-4" href={homePath}>
          <VillageMark village={village} />
          <span className="min-w-0">
            <span className="block truncate text-xl font-black md:text-2xl">
              {village.name}
            </span>
            <span className="mt-1 block truncate text-xs font-bold text-white/58">
              {operatorLabel}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-black lg:flex">
          <HeaderNavLink href={`${homePath}/about`} label="소개" />
          <HeaderNavLink href={`${homePath}/programs`} label="체험활동" />
          <HeaderNavLink href={`${homePath}/media`} label="미디어" />
          {launchFeatureFlags.reviews ? (
            <HeaderNavLink href={`${homePath}/reviews`} label="참여후기" />
          ) : null}
          <HeaderNavLink href={`${homePath}/notice`} label="공지" />
        </nav>

        <div className="flex items-center gap-2">
          {village.instagramUrl ? (
            <a
              aria-label={`${village.name} 인스타그램`}
              className="hidden size-10 items-center justify-center border border-white/15 text-white/80 hover:border-white/40 hover:text-white sm:inline-flex"
              href={village.instagramUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Camera size={18} />
            </a>
          ) : null}
          {village.kakaoUrl ? (
            <a
              aria-label={`${village.name} 문의하기`}
              className="hidden size-10 items-center justify-center border border-white/15 text-white/80 hover:border-white/40 hover:text-white sm:inline-flex"
              href={village.kakaoUrl}
              rel="noreferrer"
              target="_blank"
            >
              <MessageCircle size={18} />
            </a>
          ) : null}
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 bg-white px-4 text-sm font-black text-[#11130f] hover:bg-[#6BAA50] hover:text-white"
            href={programHref}
          >
            신청
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function VillageMark({ village }: { village: Village }) {
  if (village.slug === "boseong") {
    return (
      <span className="relative block h-10 w-28 shrink-0 overflow-hidden bg-black md:h-12 md:w-36">
        <Image
          alt="그린티모시레"
          className="object-contain"
          fill
          sizes="144px"
          src={greentmosireLogoImage}
        />
      </span>
    );
  }

  return (
    <span
      className="flex size-11 shrink-0 items-center justify-center text-sm font-black text-white"
      style={{ backgroundColor: village.brandColor }}
    >
      {village.logoText ?? village.name.slice(0, 2)}
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
  if (village.slug === "boseong") {
    return <BoseongFigmaFooter primaryProgram={primaryProgram} village={village} />;
  }

  const homePath = villagePath(village.slug);
  const programHref = primaryProgram
    ? `${homePath}/${primaryProgram.slug}`
    : `${homePath}/programs`;

  return (
    <footer className="border-t border-[#23261f] bg-[#11130f] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[1fr_auto] md:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 items-center justify-center text-sm font-black text-white"
              style={{ backgroundColor: village.brandColor }}
            >
              {village.logoText ?? village.name.slice(0, 2)}
            </span>
            <div>
              <p className="text-lg font-black">{village.name}</p>
              <p className="text-sm font-bold text-white/55">
                {village.region} {village.city} 로컬 체류 공식 공간
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
            {village.summary}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white/45">
            <MapPin size={14} />
            {village.address ?? `${village.region} ${village.city}`}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-white/45">
            <Link className="hover:text-white" href={`${homePath}/terms`}>
              이용약관
            </Link>
            <Link className="hover:text-white" href={`${homePath}/privacy`}>
              개인정보 수집 및 이용
            </Link>
            <Link
              className="hover:text-white"
              href={`${homePath}/privacy/third-party`}
            >
              개인정보 제3자 제공 동의
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2 md:justify-end">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 bg-white px-4 text-sm font-black text-[#11130f]"
            href={programHref}
          >
            <Sparkles size={17} />
            체험활동 보기
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 border border-white/15 px-4 text-sm font-black text-white/80 hover:bg-white/10"
            href="/channels"
          >
            <Home size={17} />
            로컬 목록
          </Link>
        </div>
      </div>
    </footer>
  );
}

function HeaderNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="text-white/78 hover:text-[#A3FF5E]" href={href}>
      {label}
    </Link>
  );
}
