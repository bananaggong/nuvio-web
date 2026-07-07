import Image from "next/image";
import { ChevronDown, ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  ChannelProfileHeader,
  channelGuestScaleRootStyle,
  px,
} from "@/components/channel-guest-gallery";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { villagePath } from "@/lib/village-routing";
import type { Program, Review } from "@/lib/types";
import type { Village } from "@/lib/village-types";

type ChannelGuestReviewsPageProps = {
  programFilter?: string;
  programs: Program[];
  reviews: Review[];
  village: Village;
};

type ReviewCardModel = {
  author: string;
  body: string;
  date: string;
  id: string;
  images: string[];
  programTitle: string;
  rating: number;
};

const reviewPageStyle = {
  maxWidth: `calc(100% - ${px(298)})`,
  width: px(1142),
} as CSSProperties;

export function ChannelGuestReviewsPage({
  programFilter,
  programs,
  reviews,
  village,
}: ChannelGuestReviewsPageProps) {
  const homeHref = villagePath(village.slug);
  const selectedProgram = normalizeFilterValue(programFilter);
  const visibleReviews = filterReviewsByProgram(reviews, programs, selectedProgram);
  const cards = visibleReviews.map((review) => buildReviewCard(review, programs));
  const averageRating = getAverageRating(visibleReviews);

  return (
    <div
      className="min-h-screen overflow-x-clip bg-white font-pretendard text-[#5B3A29]"
      style={channelGuestScaleRootStyle}
    >
      <main className="mx-auto w-full max-w-[1920px]">
        <ChannelProfileHeader activeTab="review" homeHref={homeHref} village={village} />

        <section
          className="mx-auto flex flex-col items-start"
          style={{
            ...reviewPageStyle,
            gap: px(30),
            paddingBottom: px(46),
          }}
        >
          <ReviewToolbar
            averageRating={averageRating}
            programs={programs}
            reviewCount={visibleReviews.length}
            selectedProgram={selectedProgram}
          />

          <div
            className="flex w-full flex-col items-start"
            style={{ paddingLeft: px(32), paddingRight: px(32) }}
          >
            {cards.length > 0 ? (
              cards.map((review) => <ReviewCard key={review.id} review={review} />)
            ) : (
              <div className="w-full border-b border-[#F5E1D3] py-12">
                <NuvioEmptyState
                  className="min-h-[220px] rounded-[6px] bg-white"
                  label="후기"
                  message="아직 공개된 후기가 없습니다."
                />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function ReviewToolbar({
  averageRating,
  programs,
  reviewCount,
  selectedProgram,
}: {
  averageRating: string;
  programs: Program[];
  reviewCount: number;
  selectedProgram: string;
}) {
  return (
    <div
      className="flex w-full flex-col items-start"
      style={{
        gap: px(12),
        paddingLeft: px(18),
        paddingTop: px(24),
      }}
    >
      <div
        className="flex items-center text-[#0D0D0C]"
        style={{
          gap: px(5),
          fontSize: px(14),
          fontWeight: 600,
          lineHeight: 1.253,
        }}
      >
        <span>전체 후기</span>
        <span>{String(reviewCount).padStart(2, "0")}개</span>
        <span>/</span>
        <span>평균</span>
        <Star
          aria-hidden="true"
          className="fill-[#FE701E] text-[#FE701E]"
          style={{ height: px(13), width: px(13) }}
        />
        <span>{averageRating}</span>
      </div>

      <div className="flex w-full flex-col items-start" style={{ gap: px(12) }}>
        <div className="flex items-center" style={{ gap: px(2), width: px(522.434) }}>
          <FilterLabel width={83}>프로그램 선택</FilterLabel>
          <div
            className="flex items-center border-l border-[#6D7A8A]"
            style={{ paddingLeft: px(5), paddingRight: px(5) }}
          >
            <div
              className="flex items-center rounded-[4px] border border-[#6D7A8A]"
              style={{
                gap: px(8),
                height: px(21),
                paddingLeft: px(8),
                paddingRight: px(8),
                width: px(235),
              }}
            >
              <span
                className="min-w-0 flex-1 truncate text-[#6D7A8A]"
                style={{ fontSize: px(14), fontWeight: 500, lineHeight: 1.253 }}
              >
                {getSelectedProgramLabel(programs, selectedProgram)}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="text-[#6D7A8A]"
                style={{ height: px(13), width: px(13) }}
              />
            </div>
          </div>
        </div>

        <FilterLine label="평점">
          <RadioChoice active={selectedProgram === "all"} label="전체" />
          {[5, 4, 3, 2, 1].map((rating) => (
            <RatingChoice active={selectedProgram === "all" && rating >= 4} key={rating} rating={rating} />
          ))}
        </FilterLine>

        <FilterLine label="순서">
          <RadioChoice active label="최신순" />
          <RadioChoice label="오래된순" />
        </FilterLine>
      </div>
    </div>
  );
}

function FilterLine({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex items-center" style={{ gap: px(2) }}>
      <FilterLabel>{label}</FilterLabel>
      <div
        className="flex items-center border-l border-[#6D7A8A]"
        style={{
          gap: px(22),
          paddingLeft: px(5),
          paddingRight: px(5),
        }}
      >
        {children}
      </div>
    </div>
  );
}

function FilterLabel({ children, width = 32 }: { children: ReactNode; width?: number }) {
  return (
    <span
      className="shrink-0 text-[#6D7A8A]"
      style={{
        fontSize: px(14),
        fontWeight: 600,
        lineHeight: 1.253,
        width: px(width),
      }}
    >
      {children}
    </span>
  );
}

function RadioChoice({ active = false, label }: { active?: boolean; label: string }) {
  return (
    <span className="flex items-center justify-center text-[#6D7A8A]" style={{ gap: px(2) }}>
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full"
        style={{
          border: `${px(1)} solid ${active ? "#FE701E" : "#6D7A8A"}`,
          height: px(14),
          width: px(14),
        }}
      >
        {active ? (
          <span className="rounded-full bg-[#FE701E]" style={{ height: px(7), width: px(7) }} />
        ) : null}
      </span>
      <span style={{ fontSize: px(14), fontWeight: 400, lineHeight: 1.253 }}>{label}</span>
    </span>
  );
}

function RatingChoice({ active = false, rating }: { active?: boolean; rating: number }) {
  return (
    <span className="flex items-center justify-center text-[#6D7A8A]" style={{ gap: px(2) }}>
      <RadioChoice active={active} label={`${rating}점`} />
      <span className="flex items-center" style={{ gap: px(2) }}>
        {Array.from({ length: rating }, (_, index) => (
          <Star
            aria-hidden="true"
            className="fill-[#FE701E] text-[#FE701E]"
            key={index}
            style={{ height: px(9), width: px(9) }}
          />
        ))}
      </span>
    </span>
  );
}

function ReviewCard({ review }: { review: ReviewCardModel }) {
  return (
    <article
      className="flex w-full flex-col items-start justify-center border-b border-[#F5E1D3]"
      style={{
        padding: `${px(16)} ${px(32)}`,
      }}
    >
      <div
        className="flex w-full items-start justify-end"
        style={{ gap: px(5), paddingBottom: px(6), paddingRight: px(6) }}
      >
        <span className="shrink-0 rounded-full bg-[#D9D9D9]" style={{ height: px(20), width: px(20) }} />
        <div className="flex min-w-0 flex-1 items-center self-stretch">
          <p
            className="truncate text-[#0D0D0C]"
            style={{ fontSize: px(14), fontWeight: 600, lineHeight: 1.253 }}
          >
            {review.author}
          </p>
        </div>
      </div>

      <div
        className="flex w-full items-center rounded-[3px]"
        style={{ gap: px(12), paddingLeft: px(3), paddingRight: px(3) }}
      >
        <p
          className="shrink-0 truncate text-[#D9D9D9]"
          style={{ fontSize: px(12), fontWeight: 400, lineHeight: 1.6, maxWidth: px(220) }}
        >
          {review.programTitle}
        </p>
        <div className="flex min-w-0 flex-1 items-center" style={{ gap: px(2) }}>
          <Star
            aria-hidden="true"
            className="fill-[#FE701E] text-[#FE701E]"
            style={{ height: px(9), width: px(9) }}
          />
          <p className="text-[#FE701E]" style={{ fontSize: px(12), fontWeight: 400, lineHeight: 1.6 }}>
            {review.rating.toFixed(1)}
          </p>
        </div>
        <time
          className="shrink-0 text-[#D9D9D9]"
          dateTime={review.date}
          style={{ fontSize: px(12), fontWeight: 400, lineHeight: 1.6 }}
        >
          {formatReviewDate(review.date)}
        </time>
      </div>

      <details
        className="group text-[#0D0D0C]"
        style={{
          padding: `${px(8)} ${px(8)} 0`,
          width: px(775),
        }}
      >
        <summary
          className="cursor-pointer list-none [&::-webkit-details-marker]:hidden"
        >
          <p
            className="line-clamp-4 whitespace-pre-wrap group-open:hidden"
            style={{ fontSize: px(12), fontWeight: 400, lineHeight: 1.6, width: px(759) }}
          >
            {review.body}
          </p>
          <span
            className="flex w-full items-center justify-end text-[#6D7A8A]"
            style={{
              gap: px(3),
              paddingBottom: review.images.length > 0 ? px(12) : 0,
            }}
          >
            <span style={{ fontSize: px(12), fontWeight: 400, lineHeight: 1.6 }}>
              펼치기
            </span>
            <ChevronDown
              aria-hidden="true"
              className="transition-transform group-open:rotate-180"
              style={{ height: px(9), width: px(9) }}
            />
          </span>
        </summary>
        <p
          className="whitespace-pre-wrap"
          style={{ fontSize: px(12), fontWeight: 400, lineHeight: 1.6, width: px(759) }}
        >
          {review.body}
        </p>
      </details>

      {review.images.length > 0 ? (
        <div className="relative flex items-center" style={{ gap: px(6), paddingBottom: px(16) }}>
          {review.images.slice(0, 7).map((image, index) => (
            <div
              className="relative block shrink-0 overflow-hidden bg-[#D9D9D9]"
              key={`${image}-${index}`}
              style={{
                borderRadius: px(6),
                height: px(120),
                width: px(120),
              }}
            >
              <Image
                alt={`${review.author} 후기 이미지 ${index + 1}`}
                className="object-cover"
                fill
                sizes="160px"
                src={image}
              />
            </div>
          ))}
          {review.images.length > 4 ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute flex items-center justify-between"
              style={{
                left: px(-11),
                top: px(49.5),
                width: px(899),
              }}
            >
              <ArrowCircle direction="left" />
              <ArrowCircle direction="right" />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ArrowCircle({ direction }: { direction: "left" | "right" }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <span
      className="flex items-center justify-center rounded-full border border-[#F5E1D3] bg-white/80 text-[#F5A66B]"
      style={{ height: px(20.5), width: px(20.5) }}
    >
      <Icon aria-hidden="true" style={{ height: px(14), width: px(14) }} />
    </span>
  );
}

function buildReviewCard(review: Review, programs: Program[]): ReviewCardModel {
  const program = findProgramForReview(review, programs);
  const body = (review.body || review.excerpt || "").trim();

  return {
    author: review.author || "닉네임",
    body: body || "후기 내용이 없습니다.",
    date: review.date,
    id: String(review.id),
    images: review.images.filter(Boolean),
    programTitle: review.programTitle || program?.title || "해당 프로그램 명",
    rating: review.rating ?? 5,
  };
}

function filterReviewsByProgram(reviews: Review[], programs: Program[], selectedProgram: string): Review[] {
  if (selectedProgram === "all") return reviews;

  return reviews.filter((review) => {
    const program = findProgramForReview(review, programs);

    return (
      String(review.programId ?? "") === selectedProgram ||
      review.programSlug === selectedProgram ||
      String(program?.id ?? "") === selectedProgram ||
      program?.slug === selectedProgram
    );
  });
}

function findProgramForReview(review: Review, programs: Program[]): Program | undefined {
  return programs.find((program) => {
    if (review.programId !== undefined && String(program.id) === String(review.programId)) {
      return true;
    }

    return Boolean(review.programSlug && program.slug === review.programSlug);
  });
}

function getAverageRating(reviews: Review[]): string {
  const ratings = reviews
    .map((review) => review.rating)
    .filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating));

  if (ratings.length === 0) return "0.0";

  return (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1);
}

function getSelectedProgramLabel(programs: Program[], selectedProgram: string): string {
  if (selectedProgram === "all") return "프로그램 명";

  const program = programs.find(
    (item) => String(item.id) === selectedProgram || item.slug === selectedProgram,
  );

  return program?.title || "프로그램 명";
}

function normalizeFilterValue(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized || "all";
}

function formatReviewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "2026년 5월 12일";

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}
