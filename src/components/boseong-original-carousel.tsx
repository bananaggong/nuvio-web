"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type BoseongOriginalSlide = {
  body: string;
  hashtags: string;
  href: string;
  title: string;
};

export function BoseongOriginalCarousel({
  logoSrc,
  slides,
}: {
  logoSrc: string;
  slides: BoseongOriginalSlide[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mediaQuery.matches) {
      return;
    }

    const interval = window.setInterval(() => {
      setIsVisible(false);

      timeoutRef.current = window.setTimeout(() => {
        setActiveIndex((current) => (current + 1) % slides.length);
        setIsVisible(true);
      }, 360);
    }, 5200);

    return () => {
      window.clearInterval(interval);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [slides.length]);

  const activeSlide = slides[activeIndex] ?? slides[0];

  if (!activeSlide) {
    return null;
  }

  return (
    <div className="relative grid items-center gap-10 md:absolute md:left-[76px] md:top-[213px] md:grid-cols-[600px_586px] md:gap-[90px]">
      <div className="relative aspect-square overflow-hidden bg-white">
        <div
          className={`absolute inset-0 transition duration-500 ease-out ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-[8%] border border-[#e2e2d8] bg-[#f8f8f2]" />
          <div className="absolute bottom-[10%] left-[10%] h-[2px] w-[54%] bg-[#315c1f]" />
          <div className="absolute bottom-[14%] left-[10%] h-[2px] w-[32%] bg-[#315c1f]" />
        </div>
      </div>

      <div className="relative min-h-[380px] pb-10 md:min-h-[446px] md:pb-0">
        <div
          className={`absolute inset-x-0 top-0 transition duration-500 ease-out ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <div className="relative h-[58px] w-[68px]">
            <Image
              alt="전체차LAB"
              className="object-contain"
              fill
              sizes="68px"
              src={logoSrc}
            />
          </div>
          <h2 className="mt-10 whitespace-pre-line text-4xl font-black leading-tight tracking-[-0.04em] md:text-[58px]">
            {activeSlide.title}
          </h2>
          <p className="mt-7 max-w-[520px] whitespace-pre-line text-base font-extrabold leading-7 text-[#315c1f] md:text-[21px] md:leading-8">
            {activeSlide.body}
          </p>
          <p className="mt-5 text-lg font-extrabold text-[#315c1f] md:text-[24px]">
            {activeSlide.hashtags}
          </p>
          <Link
            className="mt-8 inline-flex h-12 items-center justify-center rounded border border-[#315c1f] bg-white px-7 text-xl font-extrabold text-[#23651e] hover:bg-[#315c1f] hover:text-white"
            href={activeSlide.href}
          >
            신청하기
          </Link>
        </div>

        <div
          aria-hidden
          className="absolute bottom-0 left-0 flex items-center gap-2 md:bottom-[12px]"
        >
          {slides.map((slide, index) => (
            <span
              className={`h-[3px] w-9 transition-colors duration-500 ${
                index === activeIndex ? "bg-[#315c1f]" : "bg-[#315c1f]/25"
              }`}
              key={slide.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
