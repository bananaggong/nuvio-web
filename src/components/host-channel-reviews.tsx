"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ReviewIcon } from "@/components/icons/review-icon";
import {
  ChannelContentSkeleton,
  ChannelEmptyState,
  ChannelProfileHeader,
} from "@/components/host-channel-home";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import {
  filterProgramsForChannel,
  hostChannelProgramsEndpoint,
  selectHostChannel,
} from "@/lib/host-channel-selection";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import type { HostReviewDraft } from "@/lib/review-db";
import type { ReviewStatus } from "@/lib/types";
import { channelPath } from "@/lib/channel-routing";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
};

type HostProgramsPayload = {
  data?: HostProgramDraft[];
};

type HostReviewsPayload = {
  data?: HostReviewDraft[];
  error?: string;
};

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";
type ReviewVisibilityFilter = "all" | "published" | "hidden";
type SortOrder = "latest" | "oldest";

const ratingOptions: Array<{ label: string; value: RatingFilter }> = [
  { label: "전체", value: "all" },
  { label: "5점", value: "5" },
  { label: "4점", value: "4" },
  { label: "3점", value: "3" },
  { label: "2점", value: "2" },
  { label: "1점", value: "1" },
];

const visibilityTabs: Array<{ label: string; value: ReviewVisibilityFilter }> = [
  { label: "전체 후기", value: "all" },
  { label: "공개 후기", value: "published" },
  { label: "숨김처리된 후기", value: "hidden" },
];

export function HostChannelReviews() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const [channel, setChannel] = useState<Village | null>(null);
  const [programs, setPrograms] = useState<HostProgramDraft[]>([]);
  const [reviews, setReviews] = useState<HostReviewDraft[]>([]);
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");
  const [visibilityFilter, setVisibilityFilter] = useState<ReviewVisibilityFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [updatingReviewId, setUpdatingReviewId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setStatusMessage("");

      const channelResponse = await fetch("/api/host/channels", {
        cache: "no-store",
      }).catch(() => null);

      if (!active) return;

      if (!channelResponse?.ok) {
        setChannel(null);
        setPrograms([]);
        setReviews([]);
        setIsLoading(false);
        return;
      }

      const channelPayload = (await channelResponse.json().catch(() => ({}))) as HostChannelPayload;
      const selectedChannel = selectHostChannel(channelPayload.data, requestedChannelSlug);
      setChannel(selectedChannel);

      const [programRows, reviewRows] = await Promise.all([
        loadChannelPrograms(selectedChannel),
        loadHostReviews(),
      ]);

      if (!active) return;

      setPrograms(programRows);
      setReviews(filterReviewsForChannel(reviewRows, selectedChannel));
      setIsLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [requestedChannelSlug]);

  const publicHref = channel?.slug ? channelPath(channel.slug) : "";
  const visibleReviews = useMemo(() => {
    return reviews
      .filter((review) => {
        if (selectedProgram === "all") return true;

        return (
          String(review.programLegacyId ?? "") === selectedProgram ||
          String(review.programUuid ?? "") === selectedProgram ||
          review.programSlug === selectedProgram
        );
      })
      .filter((review) => {
        if (ratingFilter === "all") return true;
        return Math.round(review.rating ?? 0) === Number(ratingFilter);
      })
      .filter((review) => {
        if (visibilityFilter === "all") return true;
        if (visibilityFilter === "hidden") return review.status === "hidden";
        return review.status === "published";
      })
      .sort((left, right) => {
        const leftTime = Date.parse(left.publishedAt || left.submittedAt || left.updatedAt);
        const rightTime = Date.parse(right.publishedAt || right.submittedAt || right.updatedAt);
        const delta = rightTime - leftTime;

        return sortOrder === "latest" ? delta : -delta;
      });
  }, [ratingFilter, reviews, selectedProgram, sortOrder, visibilityFilter]);
  const averageRating = getAverageRating(visibleReviews);

  async function updateReviewVisibility(review: HostReviewDraft) {
    if (updatingReviewId) return;

    const reviewId = String(review.id);
    const nextStatus: ReviewStatus = review.status === "hidden" ? "published" : "hidden";
    setUpdatingReviewId(reviewId);
    setStatusMessage("");

    try {
      const response = await fetch("/api/host/reviews", {
        body: JSON.stringify({
          hiddenReason:
            nextStatus === "hidden" ? "호스트센터 채널 후기 화면에서 숨김 처리" : undefined,
          id: reviewId,
          status: nextStatus,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as HostReviewsPayload & {
        data?: HostReviewDraft;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "후기 상태를 변경하지 못했습니다.");
      }

      setReviews((current) =>
        current.map((item) => (String(item.id) === reviewId ? payload.data! : item)),
      );
      setStatusMessage(nextStatus === "hidden" ? "후기를 숨김 처리했습니다." : "후기를 다시 공개했습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "후기 상태를 변경하지 못했습니다.");
    } finally {
      setUpdatingReviewId(null);
    }
  }

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1806)]">
      <section className="min-w-0 flex-1 overflow-x-clip bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader
            activeLabel="후기"
            channel={channel}
            loading={isLoading}
            publicHref={publicHref}
          />

          <section className="ml-[var(--host-44)] flex w-[var(--host-1142)] flex-col gap-[var(--host-30)] pt-[var(--host-8)] max-[1439px]:ml-0 max-[1439px]:w-full max-[1439px]:px-5 max-lg:gap-5 max-lg:pt-5">
            <ReviewManagerToolbar
              averageRating={averageRating}
              programs={programs}
              ratingFilter={ratingFilter}
              reviewCount={visibleReviews.length}
              selectedProgram={selectedProgram}
              setRatingFilter={setRatingFilter}
              setSelectedProgram={setSelectedProgram}
              setSortOrder={setSortOrder}
              setVisibilityFilter={setVisibilityFilter}
              sortOrder={sortOrder}
              visibilityFilter={visibilityFilter}
            />

            <div className="flex w-full flex-col px-[var(--host-32)] max-lg:px-0">
              {isLoading ? (
                <ChannelContentSkeleton variant="board" />
              ) : visibleReviews.length > 0 ? (
                visibleReviews.map((review) => (
                  <HostReviewCard
                    disabled={updatingReviewId === String(review.id)}
                    key={review.id}
                    onToggleVisibility={() => updateReviewVisibility(review)}
                    review={review}
                  />
                ))
              ) : (
                <ChannelEmptyState
                  description="참여자가 후기를 작성하고 공개되면 이곳에서 관리할 수 있습니다."
                  title="아직 표시할 후기가 없습니다."
                />
              )}
            </div>
          </section>

          <footer className="mt-[var(--host-8)] flex h-[var(--host-69)] items-start border-t border-[#6D7A8A] px-[var(--host-28)] pt-[var(--host-20)] max-lg:items-center max-lg:px-5 max-lg:pt-0">
            <button
              className="inline-flex h-[var(--host-29)] w-[var(--host-58)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] max-lg:min-h-11 max-lg:min-w-20 max-lg:text-sm"
              onClick={() => setStatusMessage("변경사항이 저장되었습니다.")}
              type="button"
            >
              저장
            </button>
            {statusMessage ? (
              <span className="ml-[var(--host-12)] text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A]">
                {statusMessage}
              </span>
            ) : null}
          </footer>
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function ReviewManagerToolbar({
  averageRating,
  programs,
  ratingFilter,
  reviewCount,
  selectedProgram,
  setRatingFilter,
  setSelectedProgram,
  setSortOrder,
  setVisibilityFilter,
  sortOrder,
  visibilityFilter,
}: {
  averageRating: string;
  programs: HostProgramDraft[];
  ratingFilter: RatingFilter;
  reviewCount: number;
  selectedProgram: string;
  setRatingFilter: (value: RatingFilter) => void;
  setSelectedProgram: (value: string) => void;
  setSortOrder: (value: SortOrder) => void;
  setVisibilityFilter: (value: ReviewVisibilityFilter) => void;
  sortOrder: SortOrder;
  visibilityFilter: ReviewVisibilityFilter;
}) {
  return (
    <div className="flex h-[var(--host-179)] w-full flex-col gap-[var(--host-12)] pt-[var(--host-24)] text-[length:var(--host-14)] leading-[1.253] max-lg:h-auto max-lg:pt-0 max-lg:text-sm">
      <div className="flex flex-wrap items-center gap-[var(--host-5)] font-semibold text-[#0D0D0C]">
        <span>전체 후기</span>
        <span>{String(reviewCount).padStart(2, "0")}개</span>
        <span>/</span>
        <span>평균</span>
        <ReviewIcon className="text-[#FE701E]" size="var(--host-13)" />
        <span>{averageRating}</span>
      </div>

      <div className="flex flex-col gap-[var(--host-12)] text-[#6D7A8A]">
        <div className="flex h-[var(--host-21)] items-center gap-[var(--host-2)] max-lg:h-auto max-lg:flex-col max-lg:items-stretch max-lg:gap-2">
          <span className="w-[var(--host-82)] font-semibold max-lg:w-auto">프로그램 선택</span>
          <label className="relative flex h-[var(--host-21)] w-[var(--host-235)] items-center border-l border-[#6D7A8A] pl-[var(--host-5)] max-lg:h-11 max-lg:w-full max-lg:border-l-0 max-lg:pl-0">
            <select
              className="h-full w-full appearance-none rounded-[4px] border border-[#6D7A8A] bg-white pl-[var(--host-8)] pr-[var(--host-28)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A] outline-none max-lg:px-3 max-lg:pr-10 max-lg:text-base"
              onChange={(event) => setSelectedProgram(event.target.value)}
              value={selectedProgram}
            >
              <option value="all">프로그램 명</option>
              {programs.map((program) => (
                <option key={program.id} value={String(program.id)}>
                  {program.title || "제목 미입력"}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-[var(--host-8)] size-[var(--host-13)] text-[#6D7A8A]"
            />
          </label>
        </div>

        <FilterRow label="평점">
          {ratingOptions.map((option) => (
            <button
              className="inline-flex items-center gap-[var(--host-2)]"
              key={option.value}
              onClick={() => setRatingFilter(option.value)}
              type="button"
            >
              <RadioDot active={ratingFilter === option.value} />
              <span>{option.label}</span>
              {option.value !== "all" ? <RatingReviewIcons count={Number(option.value)} /> : null}
            </button>
          ))}
        </FilterRow>

        <FilterRow label="순서">
          <button className="inline-flex items-center gap-[var(--host-2)]" onClick={() => setSortOrder("latest")} type="button">
            <RadioDot active={sortOrder === "latest"} />
            최신순
          </button>
          <button className="inline-flex items-center gap-[var(--host-2)]" onClick={() => setSortOrder("oldest")} type="button">
            <RadioDot active={sortOrder === "oldest"} />
            오래된순
          </button>
        </FilterRow>

        <div className="flex h-[var(--host-30)] items-start gap-[var(--host-16)] border-b border-[#CAC4BC] max-lg:h-11 max-lg:overflow-x-auto">
          {visibilityTabs.map((tab) => (
            <button
              className={`relative h-[var(--host-30)] shrink-0 text-[length:var(--host-14)] font-semibold leading-[1.253] max-lg:min-h-11 ${
                visibilityFilter === tab.value ? "text-[#0D0D0C]" : "text-[#CAC4BC]"
              }`}
              key={tab.value}
              onClick={() => setVisibilityFilter(tab.value)}
              type="button"
            >
              {tab.label}
              {visibilityFilter === tab.value ? (
                <span className="absolute bottom-0 left-0 h-[var(--host-2)] w-full bg-[#FE701E]" />
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HostReviewCard({
  disabled,
  onToggleVisibility,
  review,
}: {
  disabled: boolean;
  onToggleVisibility: () => void;
  review: HostReviewDraft;
}) {
  const hidden = review.status === "hidden";
  const date = review.publishedAt || review.submittedAt || review.updatedAt;
  const images = review.images ?? [];

  return (
    <article
      className={`flex w-full flex-col border-b border-[#F5E1D3] px-[var(--host-32)] py-[var(--host-16)] max-lg:px-0 max-lg:py-4 ${
        hidden ? "bg-[#F3F3F3]" : "bg-white"
      }`}
    >
      <div className="flex w-full items-start gap-[var(--host-5)] pb-[var(--host-6)] pr-[var(--host-6)]">
        <span className="size-[var(--host-20)] shrink-0 rounded-full bg-[#D9D9D9]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#0D0D0C]">
            {review.author || "닉네임"}
          </p>
        </div>
        <button
          className={`h-[var(--host-20)] rounded-full border px-[var(--host-10)] text-[length:var(--host-11)] font-normal leading-[1.253] transition disabled:cursor-wait disabled:opacity-50 max-lg:min-h-11 max-lg:shrink-0 ${
            hidden
              ? "border-[#CAC4BC] bg-[#CAC4BC] text-white"
              : "border-[#6D7A8A] bg-white text-[#6D7A8A] hover:border-[#FE701E] hover:text-[#FE701E]"
          }`}
          disabled={disabled}
          onClick={onToggleVisibility}
          type="button"
        >
          {hidden ? "숨김해제" : "숨김처리"}
        </button>
      </div>

      <div className="flex w-full items-center gap-[var(--host-12)] rounded-[3px] px-[var(--host-3)] max-lg:flex-wrap max-lg:gap-2">
        <p className="max-w-[var(--host-219)] shrink-0 truncate text-[length:var(--host-12)] font-normal leading-[1.6] text-[#D9D9D9] max-lg:max-w-full max-lg:flex-1">
          {review.programTitle || review.title || "해당 프로그램 명"}
        </p>
        <div className="flex min-w-0 flex-1 items-center gap-[var(--host-2)]">
          <ReviewIcon className="text-[#FE701E]" size="var(--host-9)" />
          <p className="text-[length:var(--host-12)] font-normal leading-[1.6] text-[#FE701E]">
            {(review.rating ?? 5).toFixed(1)}
          </p>
        </div>
        <time className="shrink-0 text-[length:var(--host-12)] font-normal leading-[1.6] text-[#D9D9D9] max-lg:w-full" dateTime={date}>
          {formatReviewDate(date)}
        </time>
      </div>

      <p className="line-clamp-4 whitespace-pre-wrap px-[var(--host-8)] pt-[var(--host-8)] text-[length:var(--host-12)] font-normal leading-[1.6] text-[#0D0D0C]">
        {review.body || review.excerpt || "후기 내용이 없습니다."}
      </p>

      <button
        className="ml-auto inline-flex h-[var(--host-31)] items-center gap-[var(--host-3)] pb-[var(--host-12)] text-[length:var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A] max-lg:min-h-11 max-lg:min-w-11 max-lg:pb-0"
        type="button"
      >
        펼치기
        <ChevronDown aria-hidden="true" className="size-[var(--host-9)]" />
      </button>

      {images.length > 0 ? (
        <div className="flex items-center gap-[var(--host-6)] overflow-x-auto pb-[var(--host-16)]">
          {images.slice(0, 7).map((image, index) => (
            <div
              className="relative size-[var(--host-119)] shrink-0 overflow-hidden rounded-[6px] bg-[#D9D9D9]"
              key={`${image}-${index}`}
            >
              <Image
                alt={`${review.author || "후기"} 이미지 ${index + 1}`}
                className="object-cover"
                fill
                sizes="160px"
                src={image}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-end border-t border-[#6D7A8A] pt-[var(--host-10)]">
        <button
          className="inline-flex items-center gap-[var(--host-3)] text-[length:var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A] max-lg:min-h-11 max-lg:min-w-11"
          type="button"
        >
          편집기
          <ChevronDown aria-hidden="true" className="size-[var(--host-9)]" />
        </button>
      </div>
    </article>
  );
}

function FilterRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex h-[var(--host-18)] items-center gap-[var(--host-2)] max-lg:h-auto max-lg:flex-col max-lg:items-stretch max-lg:gap-1">
      <span className="w-[var(--host-32)] shrink-0 font-semibold max-lg:w-auto">{label}</span>
      <div className="flex items-center gap-[var(--host-22)] border-l border-[#6D7A8A] px-[var(--host-5)] max-lg:flex-wrap max-lg:border-l-0 max-lg:px-0 max-lg:[&>button]:min-h-11 max-lg:[&>button]:min-w-11">
        {children}
      </div>
    </div>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex size-[var(--host-14)] shrink-0 items-center justify-center rounded-full border ${
        active ? "border-[#FE701E]" : "border-[#6D7A8A]"
      }`}
    >
      {active ? <span className="size-[var(--host-7)] rounded-full bg-[#FE701E]" /> : null}
    </span>
  );
}

function RatingReviewIcons({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-[var(--host-2)]">
      {Array.from({ length: count }, (_, index) => (
        <ReviewIcon className="text-[#FE701E]" key={index} size="var(--host-9)" />
      ))}
    </span>
  );
}

async function loadChannelPrograms(channel: Village | null): Promise<HostProgramDraft[]> {
  const endpoint = hostChannelProgramsEndpoint(channel);
  if (!endpoint) return [];

  const response = await fetch(endpoint, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return [];

  const payload = (await response.json().catch(() => ({}))) as HostProgramsPayload;
  return filterProgramsForChannel(payload.data, channel);
}

async function loadHostReviews(): Promise<HostReviewDraft[]> {
  const response = await fetch("/api/host/reviews", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return [];

  const payload = (await response.json().catch(() => ({}))) as HostReviewsPayload;
  return payload.data ?? [];
}

function filterReviewsForChannel(reviews: HostReviewDraft[], channel: Village | null) {
  if (!channel?.slug) return reviews;

  return reviews.filter((review) => review.villageSlug === channel.slug);
}

function getAverageRating(reviews: HostReviewDraft[]): string {
  const ratings = reviews
    .map((review) => review.rating)
    .filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating));

  if (ratings.length === 0) return "0.0";

  return (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1);
}

function formatReviewDate(value?: string): string {
  if (!value) return "2026년 5월 12일";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}
