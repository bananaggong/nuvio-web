import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";
import {
  BoseongFigmaAboutPage,
  BoseongFigmaNoticePage,
  BoseongFigmaProgramsPage,
  BoseongFigmaReviewsPage,
} from "@/components/boseong-figma-site";
import { ChannelGuestAboutPage } from "@/components/channel-guest-about";
import { ChannelGuestBoardPage } from "@/components/channel-guest-board";
import { ChannelGuestProgramsPage } from "@/components/channel-guest-programs";
import { ChannelGuestReviewsPage } from "@/components/channel-guest-reviews";
import { VillageSiteFooter, VillageSiteHeader } from "@/components/village-site-chrome";
import { formatDate } from "@/lib/format";
import { villagePath } from "@/lib/village-routing";
import {
  buildChannelBoardNotices,
  buildVillageNotices,
} from "@/lib/village-template";
import type { Program, Review } from "@/lib/types";
import type { PublishedVillagePageSection } from "@/lib/village-page-cms";
import type { Village } from "@/lib/village-types";

export function VillageProgramsIndexPage({
  pageSections,
  programs,
  village,
}: {
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  village: Village;
}) {
  if (village.slug === "boseong") {
    return (
      <BoseongFigmaProgramsPage
        pageSections={pageSections}
        programs={programs}
        village={village}
      />
    );
  }

  return <ChannelGuestProgramsPage programs={programs} village={village} />;
}

export function VillageReviewsIndexPage({
  pageSections,
  programs,
  reviewFilter,
  reviews,
  village,
}: {
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  reviewFilter?: string;
  reviews: Review[];
  village: Village;
}) {
  if (village.slug === "boseong") {
    return (
      <BoseongFigmaReviewsPage
        pageSections={pageSections}
        programs={programs}
        reviewFilter={reviewFilter}
        reviews={reviews}
        village={village}
      />
    );
  }

  return (
    <ChannelGuestReviewsPage
      programFilter={reviewFilter}
      programs={programs}
      reviews={reviews}
      village={village}
    />
  );
}

export function VillageAboutIndexPage({
  pageSections,
  programs,
  village,
}: {
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  village: Village;
}) {
  if (village.slug === "boseong") {
    return (
      <BoseongFigmaAboutPage
        pageSections={pageSections}
        programs={programs}
        village={village}
      />
    );
  }

  return <ChannelGuestAboutPage village={village} />;
}

export function VillageNoticeIndexPage({
  pageSections,
  programs,
  village,
}: {
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  village: Village;
}) {
  const notices =
    village.slug === "boseong"
      ? buildVillageNotices(village, programs)
      : buildChannelBoardNotices(village, programs);

  if (village.slug === "boseong") {
    return (
      <BoseongFigmaNoticePage
        notices={notices}
        pageSections={pageSections}
        programs={programs}
        village={village}
      />
    );
  }

  return <ChannelGuestBoardPage notices={notices} village={village} />;
}

export function VillageReviewDetailPage({
  programs,
  review,
  village,
}: {
  programs: Program[];
  review: Review;
  village: Village;
}) {
  const bodyParagraphs = review.body.split("\n").filter(Boolean);
  const firstParagraph = bodyParagraphs[0] ?? "";
  const showExcerpt =
    review.excerpt.trim().length > 0 &&
    !sameReviewText(review.excerpt, firstParagraph) &&
    !sameReviewText(review.excerpt, review.title);

  return (
    <VillagePageFrame
      primaryProgram={programs[0]}
      title={review.title}
      village={village}
    >
      <article className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border border-[#dfddd5] bg-white px-6 py-7 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-black text-white"
              style={{ backgroundColor: village.brandColor }}
            >
              <Quote size={14} />
              {review.badge ?? "후기"}
            </span>
            <span className="text-sm font-bold text-slate-500">
              {formatDate(review.date)}
            </span>
            <span className="text-sm font-bold text-slate-500">
              {review.author}
            </span>
          </div>
          {showExcerpt ? (
            <p className="mt-6 text-lg font-bold leading-9 text-slate-800">
              {review.excerpt}
            </p>
          ) : null}
          <div
            className={`${showExcerpt ? "mt-8" : "mt-6"} space-y-5 text-base leading-8 text-slate-700`}
          >
            {bodyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {review.images.length > 0 ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {review.images.slice(0, 4).map((src, index) => (
                <div className="relative aspect-[4/3] overflow-hidden bg-[#ece8dd]" key={src}>
                  <Image
                    alt={`${review.title} 이미지 ${index + 1}`}
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    src={src}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <aside className="space-y-3">
          <Link
            className="flex items-center justify-between border border-[#dfddd5] bg-white px-4 py-4 text-sm font-black hover:border-[#0f766e]"
            href={`${villagePath(village.slug)}/reviews`}
          >
            {village.name} 후기 목록
            <ArrowRight size={16} />
          </Link>
          <Link
            className="flex items-center justify-between border border-[#dfddd5] bg-white px-4 py-4 text-sm font-black hover:border-[#0f766e]"
            href={villagePath(village.slug)}
          >
            {village.name} 홈
            <ArrowRight size={16} />
          </Link>
        </aside>
      </article>
    </VillagePageFrame>
  );
}

function sameReviewText(left: string, right: string): boolean {
  const normalize = (value: string) =>
    value.replace(/\s+/g, " ").replace(/[.~…]+$/g, "").trim();

  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);

  return (
    normalizedLeft.length > 0 &&
    (normalizedLeft === normalizedRight ||
      normalizedLeft.startsWith(normalizedRight) ||
      normalizedRight.startsWith(normalizedLeft))
  );
}

function VillagePageFrame({
  children,
  eyebrow,
  primaryProgram,
  title,
  village,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  primaryProgram?: Program;
  title: string;
  village: Village;
}) {
  return (
    <div className="bg-[#f6f4ee] text-[#171717]">
      <VillageSiteHeader
        primaryProgram={primaryProgram}
        variant="dark"
        village={village}
      />
      <section className="border-b border-[#dfddd5] bg-white px-5 py-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          {eyebrow ? (
            <p className="text-sm font-black" style={{ color: village.brandColor }}>
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={`${eyebrow ? "mt-3" : ""} font-serif text-3xl font-black leading-tight md:text-5xl`}
          >
            {title}
          </h1>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        {children}
      </section>
      <VillageSiteFooter primaryProgram={primaryProgram} village={village} />
    </div>
  );
}
