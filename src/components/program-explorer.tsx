"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { programPath } from "@/lib/program-routing";
import type { HomeHeroSlide } from "@/lib/home-hero-db";
import type { Program } from "@/lib/types";

type ProgramExplorerProps = {
  heroSlides?: HomeHeroSlide[];
  programs: Program[];
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
    if (publishedSlides.length > 0) return publishedSlides;

    return featuredPrograms.slice(0, 4).map<HomeHeroSlide>((program, index) => ({
      id: `program-${program.slug || program.id}`,
      eyebrow: `${program.region} ${program.city}`,
      title: program.title,
      subtitle: program.summary,
      imageUrl: program.image,
      href: programPath(program),
      sortOrder: index,
      published: true,
    }));
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
          className="group relative mx-auto flex aspect-[1074/420] w-[74.583vw] min-h-[280px] items-center justify-between overflow-hidden rounded-[1.25vw] bg-[#778696] px-[2.361vw] text-white max-md:aspect-[4/5] max-md:w-full max-md:px-5"
          onTouchEnd={handleTouchEnd}
          onTouchStart={handleTouchStart}
        >
          {activeSlide ? (
            <Image
              alt={activeSlide.title}
              className="object-cover"
              fill
              key={activeSlide.id}
              priority
              sizes="(max-width: 768px) 100vw, 75vw"
              src={activeSlide.imageUrl}
            />
          ) : null}
          <div className="absolute inset-0 bg-black/40" />
          {activeSlide ? (
            <Link
              aria-label={`${activeSlide.title} 자세히 보기`}
              className="absolute inset-0 z-10"
              href={activeSlide.href}
              onClick={handleHeroClick}
            />
          ) : null}
          <button
            aria-label="이전 배너"
            className="pointer-events-none relative z-30 inline-flex size-[3.333vw] min-h-11 min-w-11 items-center justify-center text-[#FFB25F] opacity-0 transition-[color,opacity] hover:text-[#FF9A3D] group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 max-md:pointer-events-auto max-md:opacity-100"
            disabled={!hasMultipleSlides}
            onClick={showPrevious}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-[3.75vw] min-h-9 min-w-9" strokeWidth={1.7} />
          </button>

          <div className="pointer-events-none relative z-20 flex min-w-0 flex-col items-center text-center">
            {activeSlide?.eyebrow ? (
              <p className="mb-[1.111vw] text-[0.833vw] font-black leading-none text-[#FFB25F] max-md:text-xs">
                {activeSlide.eyebrow}
              </p>
            ) : null}
            <h1 className="max-w-[42vw] text-[2.083vw] font-bold leading-[1.45] tracking-normal text-white max-md:max-w-[58vw] max-md:text-3xl">
              {activeSlide?.title ?? "누비오 로컬 체류 프로그램"}
            </h1>
            <p className="mt-[1.944vw] max-w-[38vw] text-[0.972vw] font-semibold leading-[1.5] text-white/85 max-md:max-w-[58vw] max-md:text-sm">
              {activeSlide?.subtitle ??
                "지역에 머무르며 일하고 쉬는 프로그램을 찾아보세요."}
            </p>

            <div className="pointer-events-auto mt-[6.25vw] flex items-center gap-[1.181vw] max-md:mt-12 max-md:gap-3">
              {Array.from({ length: Math.max(slides.length, 1) }).map((_, dot) => (
                <button
                  aria-label={`${dot + 1}번째 배너 보기`}
                  className={`size-[0.556vw] min-h-2.5 min-w-2.5 rounded-full transition ${
                    dot === safeActiveIndex ? "bg-[#FFB25F]" : "bg-[#E8E7E2]"
                  }`}
                  disabled={dot >= slides.length}
                  key={dot}
                  onClick={() => showSlide(dot)}
                  type="button"
                />
              ))}
            </div>
          </div>

          <button
            aria-label="다음 배너"
            className="pointer-events-none relative z-30 inline-flex size-[3.333vw] min-h-11 min-w-11 items-center justify-center text-[#FFB25F] opacity-0 transition-[color,opacity] hover:text-[#FF9A3D] group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 max-md:pointer-events-auto max-md:opacity-100"
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
              추천 프로그램
            </h2>
            <p className="mt-[0.833vw] text-[0.764vw] font-medium leading-none text-[#9BA3AE] max-md:mt-2 max-md:text-sm">
              지금 신청할 수 있는 로컬 체류 프로그램
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
            <div className="mt-[1.667vw] rounded-[0.833vw] border border-[#E8E7E2] px-[1.667vw] py-[2.222vw] text-[0.833vw] font-semibold text-[#9BA3AE]">
              공개된 프로그램이 없습니다.
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}
