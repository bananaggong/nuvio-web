"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { programPath } from "@/lib/program-routing";
import type { HomeHeroSlide } from "@/lib/home-hero-db";
import {
  OPEN_LAUNCH_BANNER_PATH,
  OPEN_LAUNCH_DESCRIPTION,
  OPEN_LAUNCH_PATH,
  OPEN_LAUNCH_TITLE,
} from "@/lib/open-launch";
import type { Program } from "@/lib/types";

type ProgramExplorerProps = {
  heroSlides?: HomeHeroSlide[];
  programs: Program[];
};

type ExplorerHeroSlide = HomeHeroSlide & {
  visualMode?: "content-overlay" | "image-only";
};

const boseongTeaFieldImage =
  "upload.wikimedia.org/wikipedia/commons/b/b3/Boseong_Green_Tea_Field.jpg";

const openLaunchSlide: ExplorerHeroSlide = {
  id: "nuvio-open-launch",
  eyebrow: "",
  title: OPEN_LAUNCH_TITLE,
  subtitle: OPEN_LAUNCH_DESCRIPTION,
  imageUrl: OPEN_LAUNCH_BANNER_PATH,
  href: OPEN_LAUNCH_PATH,
  sortOrder: Number.MIN_SAFE_INTEGER,
  published: true,
  visualMode: "image-only",
};

export function ProgramExplorer({
  heroSlides = [],
  programs,
}: ProgramExplorerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const featuredPrograms = useMemo(() => programs.slice(0, 6), [programs]);
  const slides = useMemo(() => {
    const publishedSlides = heroSlides.filter((slide) => slide.published);
    const contentSlides: ExplorerHeroSlide[] =
      publishedSlides.length > 0
        ? publishedSlides
        : featuredPrograms
            .slice(0, 4)
            .map<ExplorerHeroSlide>((program, index) => ({
              id: `program-${program.slug || program.id}`,
              eyebrow: `${program.region} ${program.city}`,
              title: program.title,
              subtitle: program.summary,
              imageUrl: program.image,
              href: programPath(program),
              sortOrder: index,
              published: true,
            }));

    return [openLaunchSlide, ...contentSlides];
  }, [featuredPrograms, heroSlides]);

  const safeActiveIndex =
    slides.length > 0 ? Math.min(activeIndex, slides.length - 1) : 0;
  const activeSlide = slides[safeActiveIndex];
  const hasMultipleSlides = slides.length > 1;

  function showPrevious() {
    if (!hasMultipleSlides) return;
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  }

  function showNext() {
    if (!hasMultipleSlides) return;
    setActiveIndex((current) => (current + 1) % slides.length);
  }

  function showSlide(index: number) {
    setActiveIndex(index);
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null) return;

    const endX = event.changedTouches[0]?.clientX ?? startX;
    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 40) return;

    suppressClickRef.current = true;
    if (deltaX < 0) {
      showNext();
    } else {
      showPrevious();
    }

    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 300);
  }

  function handleHeroClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    suppressClickRef.current = false;
  }

  return (
    <div className="font-pretendard bg-white">
      <section className="mx-auto w-full px-[2.083vw] pb-[5.833vw] pt-[1.736vw]">
        <div
          className="group relative mx-auto aspect-[1074/420] w-[calc(74.583333vw+0.01px)] max-w-[1432px] overflow-hidden rounded-[clamp(8px,1.597vw,30.667px)] bg-white text-white max-md:w-full"
          data-home-hero-carousel="true"
          onTouchEnd={handleTouchEnd}
          onTouchStart={handleTouchStart}
        >
          {activeSlide ? (
            <Image
              alt={activeSlide.title}
              className="object-cover"
              fill
              key={activeSlide.id}
              sizes="(max-width: 768px) 100vw, (max-width: 1920px) 74.583333vw, 1432px"
              src={resolveHeroImageUrl(activeSlide.imageUrl)}
              unoptimized={activeSlide.visualMode === "image-only"}
              {...(safeActiveIndex === 0
                ? { preload: true }
                : { loading: "eager" as const })}
            />
          ) : null}
          {activeSlide?.visualMode === "image-only" ? null : (
            <div className="absolute inset-0 bg-black/40" />
          )}
          {activeSlide?.visualMode === "image-only" ? (
            <h1 className="sr-only">{activeSlide.title}</h1>
          ) : null}
          {activeSlide ? (
            <Link
              aria-label={`${activeSlide.title} 자세히 보기`}
              data-hero-visual-mode={activeSlide.visualMode ?? "content-overlay"}
              data-home-hero-link="true"
              data-open-launch-banner={
                activeSlide.visualMode === "image-only" ? "true" : undefined
              }
              className="absolute inset-0 z-10"
              href={activeSlide.href}
              onClick={handleHeroClick}
            />
          ) : null}
          <button
            aria-label="이전 배너"
            className="pointer-events-none absolute left-[clamp(4px,2.361vw,45.333px)] top-1/2 z-30 inline-flex size-[3.333vw] min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-[#FFB25F] opacity-0 transition-[color,opacity] hover:text-[#FF9A3D] group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 max-md:pointer-events-auto max-md:opacity-100"
            disabled={!hasMultipleSlides}
            onClick={showPrevious}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-[3.75vw] min-h-9 min-w-9" strokeWidth={1.7} />
          </button>

          {activeSlide?.visualMode === "image-only" ? null : (
            <div className="pointer-events-none absolute inset-0 z-20 flex min-w-0 flex-col items-center justify-center px-[8vw] text-center">
              {activeSlide?.eyebrow ? (
                <p className="mb-[1.111vw] text-[0.833vw] font-black leading-none text-[#FFB25F] max-md:mb-1 max-md:text-[10px]">
                  {activeSlide.eyebrow}
                </p>
              ) : null}
              <h1 className="max-w-[42vw] text-[2.083vw] font-bold leading-[1.45] tracking-normal text-white max-md:max-w-[58vw] max-md:text-sm">
                {activeSlide?.title ?? "결이 맞는 로컬 라이프를 찾아보세요"}
              </h1>
              <p className="mt-[1.944vw] max-w-[38vw] text-[0.972vw] font-semibold leading-[1.5] text-white/85 max-md:mt-1 max-md:max-w-[58vw] max-md:text-[10px]">
                {activeSlide?.subtitle ??
                  "가볍게 떠나보고, 나와 맞는 로컬의 시간을 발견해보세요."}
              </p>
            </div>
          )}

          <div className="pointer-events-auto absolute bottom-[clamp(8px,5.278vw,101.333px)] left-1/2 z-30 flex -translate-x-1/2 items-center gap-[0.347vw] max-md:gap-0">
            {slides.map((slide, dot) => (
              <button
                aria-current={dot === safeActiveIndex ? "true" : undefined}
                aria-label={`${dot + 1}번째 배너 보기`}
                className="inline-flex size-11 items-center justify-center rounded-full"
                key={slide.id}
                onClick={() => showSlide(dot)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`size-[0.556vw] min-h-2.5 min-w-2.5 rounded-full transition ${
                    dot === safeActiveIndex ? "bg-[#FFB25F]" : "bg-[#E8E7E2]"
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            aria-label="다음 배너"
            className="pointer-events-none absolute right-[clamp(4px,2.361vw,45.333px)] top-1/2 z-30 inline-flex size-[3.333vw] min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-[#FFB25F] opacity-0 transition-[color,opacity] hover:text-[#FF9A3D] group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 max-md:pointer-events-auto max-md:opacity-100"
            disabled={!hasMultipleSlides}
            onClick={showNext}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-[3.75vw] min-h-9 min-w-9" strokeWidth={1.7} />
          </button>
        </div>

        <section className="mx-auto mt-[3.472vw] w-[74.583vw] max-md:w-full">
          <div>
            <h2 className="text-[1.389vw] font-semibold leading-none text-[#5B3A29] max-md:text-xl">
              지금 인기있는 프로그램
            </h2>
            <p className="mt-[0.833vw] text-[0.764vw] font-medium leading-none text-[#9BA3AE] max-md:mt-2 max-md:text-sm">
              새로운 라이프스타일을 경험할 수 있는 로컬 프로그램
            </p>
          </div>

          <div className="mt-[1.667vw] grid gap-x-[1.528vw] gap-y-[4.028vw] md:grid-cols-3">
            {featuredPrograms.map((program) => (
              <article className="group min-w-0" key={`${program.id}-${program.slug}`}>
                <Link
                  aria-label={`${program.title} 상세 보기`}
                  className="relative block aspect-[343/346] w-full overflow-hidden rounded-[0.833vw] bg-[#D9D9D9] max-md:rounded-xl"
                  href={programPath(program)}
                >
                  <Image
                    alt={program.title}
                    className="object-cover transition duration-300 group-hover:scale-105"
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    src={program.image}
                  />
                </Link>
                <div className="pt-[1.389vw] max-md:pt-4">
                  <p className="text-[0.694vw] font-medium leading-none text-[#9BA3AE] max-md:text-xs">
                    {program.region} {program.city}
                  </p>
                  <Link href={programPath(program)}>
                    <h3 className="mt-[0.972vw] line-clamp-2 text-[1.111vw] font-semibold leading-[1.35] text-[#5B3A29] transition group-hover:text-[#F97316] max-md:mt-2 max-md:text-lg">
                      {program.title}
                    </h3>
                  </Link>
                  <p className="mt-[1.25vw] line-clamp-2 text-[0.764vw] font-medium leading-[1.7] text-[#B4BAC3] max-md:mt-3 max-md:text-sm">
                    {program.summary}
                  </p>
                  <p className="mt-[1.667vw] text-[0.694vw] font-medium leading-none text-[#9BA3AE] max-md:mt-4 max-md:text-xs">
                    {program.sourceName}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {featuredPrograms.length === 0 ? (
            <>
              <NuvioEmptyState
                className="mt-[1.667vw] rounded-[0.833vw] bg-[#FAFAFA]"
                label="프로그램"
              />
            </>
          ) : null}
        </section>

        {/* Temporarily hidden: all programs section.
        <section className="mx-auto mt-[5.556vw] w-[74.583vw] max-md:mt-14 max-md:w-full">
          <div>
            <h2 className="text-[1.389vw] font-semibold leading-none text-[#5B3A29] max-md:text-xl">
              모든 프로그램
            </h2>
            <p className="mt-[0.833vw] text-[0.764vw] font-medium leading-none text-[#9BA3AE] max-md:mt-2 max-md:text-sm">
              누비오 호스트가 등록한 공개 프로그램을 한 번에 확인해보세요
            </p>
          </div>

          <div className="mt-[1.667vw] grid gap-x-[1.528vw] gap-y-[4.028vw] md:grid-cols-3">
            {programs.map((program) => (
              <article className="group min-w-0" key={`all-${program.id}-${program.slug}`}>
                <Link
                  aria-label={`${program.title} 상세 보기`}
                  className="relative block aspect-[343/346] w-full overflow-hidden rounded-[0.833vw] bg-[#D9D9D9] max-md:rounded-xl"
                  href={programPath(program)}
                >
                  <Image
                    alt={program.title}
                    className="object-cover transition duration-300 group-hover:scale-105"
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    src={program.image}
                  />
                </Link>
                <div className="pt-[1.389vw] max-md:pt-4">
                  <p className="text-[0.694vw] font-medium leading-none text-[#9BA3AE] max-md:text-xs">
                    {program.region} {program.city}
                  </p>
                  <Link href={programPath(program)}>
                    <h3 className="mt-[0.972vw] line-clamp-2 text-[1.111vw] font-semibold leading-[1.35] text-[#5B3A29] transition group-hover:text-[#F97316] max-md:mt-2 max-md:text-lg">
                      {program.title}
                    </h3>
                  </Link>
                  <p className="mt-[1.25vw] line-clamp-2 text-[0.764vw] font-medium leading-[1.7] text-[#B4BAC3] max-md:mt-3 max-md:text-sm">
                    {program.summary}
                  </p>
                  <p className="mt-[1.667vw] text-[0.694vw] font-medium leading-none text-[#9BA3AE] max-md:mt-4 max-md:text-xs">
                    {program.sourceName}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {programs.length === 0 ? (
            <NuvioEmptyState
              className="mt-[1.667vw] rounded-[0.833vw] bg-[#FAFAFA]"
              label="프로그램"
            />
          ) : null}
        </section>
        */}
      </section>
    </div>
  );
}

function resolveHeroImageUrl(imageUrl: string): string {
  if (imageUrl.includes(boseongTeaFieldImage)) {
    return "/images/program-boseong-fallback.jpg";
  }

  return imageUrl;
}
