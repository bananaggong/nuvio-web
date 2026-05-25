"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

type ProgramGalleryCarouselProps = {
  images: string[];
  title: string;
};

export function ProgramGalleryCarousel({
  images,
  title,
}: ProgramGalleryCarouselProps) {
  const normalizedImages = useMemo(
    () => images.map((image) => image.trim()).filter(isDisplayableImage),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const hasImages = normalizedImages.length > 0;
  const activeImage = normalizedImages[activeIndex] ?? "";
  const canMove = normalizedImages.length > 1;

  const move = (direction: 1 | -1) => {
    if (!canMove) return;
    setActiveIndex((current) => {
      const next = current + direction;
      if (next < 0) return normalizedImages.length - 1;
      if (next >= normalizedImages.length) return 0;
      return next;
    });
  };

  return (
    <section
      aria-label="프로그램 대표 이미지"
      className="group relative flex h-[30.278vw] min-h-[300px] w-full items-center justify-between overflow-hidden bg-[#778695] px-[1.806vw] max-md:h-[240px] max-md:min-h-[240px]"
    >
      {hasImages ? (
        <div
          aria-label={`${title} 대표 이미지`}
          className="absolute inset-0 bg-cover bg-center transition-opacity"
          role="img"
          style={{ backgroundImage: `url("${escapeCssUrl(activeImage)}")` }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(135deg,#778695,#B7C0BE)]"
        />
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-black/10" />

      {canMove ? (
        <>
          <CarouselArrow ariaLabel="이전 이미지" onClick={() => move(-1)}>
            <ChevronLeft aria-hidden="true" className="size-10 stroke-[1.5]" />
          </CarouselArrow>
          <CarouselArrow ariaLabel="다음 이미지" onClick={() => move(1)}>
            <ChevronRight aria-hidden="true" className="size-10 stroke-[1.5]" />
          </CarouselArrow>
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
            <span>{activeIndex + 1}</span>
            <span aria-hidden="true" className="opacity-60">
              /
            </span>
            <span>{normalizedImages.length}</span>
          </div>
        </>
      ) : null}
    </section>
  );
}

function CarouselArrow({
  ariaLabel,
  children,
  onClick,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="relative z-10 inline-flex size-12 items-center justify-center border-0 bg-transparent p-0 text-white opacity-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function isDisplayableImage(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)
  );
}

function escapeCssUrl(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
