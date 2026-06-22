"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ChannelProfileHeader,
  fallbackChannel,
  fallbackPrograms,
} from "@/components/host-channel-home";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import type { HostReviewDraft } from "@/lib/review-db";
import { villagePath } from "@/lib/village-routing";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
};

type HostProgramsPayload = {
  data?: HostProgramDraft[];
};

type HostReviewsPayload = {
  data?: HostReviewDraft[];
};

type ChannelReviewItem = HostReviewDraft & {
  imageCount?: number;
  rating?: number;
};

const reviewTabs = ["전체 후기", "답글 미작성 후기", "숨김처리된 후기"] as const;

const fallbackReviews: ChannelReviewItem[] = [
  {
    author: "닉네임",
    badge: "예약 프로그램 명",
    body:
      "숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요.",
    category: "trip",
    excerpt: "",
    id: "channel-review-1",
    imageCount: 7,
    published: true,
    rating: 5,
    title: "참여 후기",
    updatedAt: "2026-05-12T00:00:00.000Z",
    villageSlug: "boseong",
  },
  {
    author: "닉네임",
    badge: "예약 프로그램 명",
    body:
      "숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요.",
    category: "trip",
    excerpt: "",
    id: "channel-review-2",
    imageCount: 0,
    published: true,
    rating: 5,
    title: "참여 후기",
    updatedAt: "2026-05-12T00:00:00.000Z",
    villageSlug: "boseong",
  },
  {
    author: "닉네임",
    badge: "예약 프로그램 명",
    body:
      "숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요.",
    category: "trip",
    excerpt: "",
    id: "channel-review-3",
    imageCount: 0,
    published: false,
    rating: 5,
    title: "참여 후기",
    updatedAt: "2026-05-12T00:00:00.000Z",
    villageSlug: "boseong",
  },
  {
    author: "닉네임",
    badge: "예약 프로그램 명",
    body:
      "숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요 숙소에 대한 후기를 작성해주세요.",
    category: "trip",
    excerpt:
      "다음 호스트의 인사하는 내용 :)\n좋은 순간 후기에 대한 답변과 함께 소개 문구를 적어둔 내용입니다.\n다음 앞으로 다양한 프로그램을 준비해볼테니 기대해 달라는 내용 또 만나고 싶다는 내용 ^^",
    id: "channel-review-4",
    imageCount: 4,
    published: true,
    rating: 5,
    title: "참여 후기",
    updatedAt: "2026-05-12T00:00:00.000Z",
    villageSlug: "boseong",
  },
];

function normalizeReview(item: HostReviewDraft): ChannelReviewItem {
  return {
    ...item,
    imageCount: 0,
    rating: 5,
  };
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "2026년 5월 12일";
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function HostChannelReviews() {
  const [activeTab, setActiveTab] = useState<(typeof reviewTabs)[number]>("전체 후기");
  const [channel, setChannel] = useState<Village>(fallbackChannel);
  const [programs, setPrograms] = useState<HostProgramDraft[]>(fallbackPrograms);
  const [reviews, setReviews] = useState<ChannelReviewItem[]>(fallbackReviews);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      const reviewRequest = launchFeatureFlags.reviews
        ? fetch("/api/host/reviews", { cache: "no-store" })
        : Promise.resolve(undefined);
      const [channelResponse, programsResponse, reviewsResponse] = await Promise.allSettled([
        fetch("/api/host/villages", { cache: "no-store" }),
        fetch("/api/host/programs", { cache: "no-store" }),
        reviewRequest,
      ]);

      if (!active) return;

      if (channelResponse.status === "fulfilled" && channelResponse.value.ok) {
        const payload = (await channelResponse.value.json().catch(() => ({}))) as HostChannelPayload;
        const firstChannel = Array.isArray(payload.data) ? payload.data[0] : undefined;
        if (firstChannel) setChannel(firstChannel);
      }

      if (programsResponse.status === "fulfilled" && programsResponse.value.ok) {
        const payload = (await programsResponse.value.json().catch(() => ({}))) as HostProgramsPayload;
        if (Array.isArray(payload.data) && payload.data.length > 0) {
          setPrograms(payload.data);
        }
      }

      if (
        reviewsResponse.status === "fulfilled" &&
        reviewsResponse.value &&
        reviewsResponse.value.ok
      ) {
        const payload = (await reviewsResponse.value.json().catch(() => ({}))) as HostReviewsPayload;
        if (Array.isArray(payload.data) && payload.data.length > 0) {
          setReviews(payload.data.map(normalizeReview));
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const publicHref = useMemo(() => villagePath(channel.slug), [channel.slug]);
  const averageRating = reviews.length > 0 ? "4.6" : "0.0";
  const filteredReviews = useMemo(() => {
    if (activeTab === "답글 미작성 후기") {
      return reviews.filter((review) => !review.excerpt);
    }
    if (activeTab === "숨김처리된 후기") {
      return reviews.filter((review) => review.published === false);
    }
    return reviews;
  }, [activeTab, reviews]);

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1864)]">
      <section className="min-w-0 flex-1 overflow-x-hidden bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader activeLabel="후기" channel={channel} publicHref={publicHref} />

          <section className="px-[var(--host-58)] pt-[var(--host-28)]">
            <h1 className="text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#0D0D0C]">
              전체 후기 {String(reviews.length).padStart(2, "0")}개 / 평균 ★ {averageRating}
            </h1>

            <div className="mt-[var(--host-16)] grid gap-[var(--host-10)] text-[length:var(--host-13)] font-normal leading-[1.253] text-[#6D7A8A]">
              <label className="flex items-center gap-[var(--host-9)]">
                <span className="shrink-0 text-[#6D7A8A]">프로그램 선택</span>
                <select className="h-[var(--host-22)] w-[var(--host-222)] rounded-[3px] border border-[#6D7A8A] bg-white px-[var(--host-8)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A] outline-none">
                  <option>프로그램 명</option>
                  {programs.map((program) => (
                    <option key={program.id}>{program.title}</option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap items-center gap-[var(--host-13)]">
                <span>평점</span>
                {["전체", "5점 ★★★★★", "4점 ★★★★", "3점 ★★★", "2점 ★★", "1점 ★"].map((label, index) => (
                  <label className="inline-flex items-center gap-[var(--host-4)]" key={label}>
                    <input
                      className="size-[var(--host-11)] accent-[#FE701E]"
                      defaultChecked={index === 0 || index === 1 || index === 2}
                      type="checkbox"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-[var(--host-18)]">
                <span>순서</span>
                <label className="inline-flex items-center gap-[var(--host-4)]">
                  <input
                    className="size-[var(--host-11)] accent-[#FE701E]"
                    defaultChecked
                    name="channel-review-order"
                    type="radio"
                  />
                  최신순
                </label>
                <label className="inline-flex items-center gap-[var(--host-4)]">
                  <input
                    className="size-[var(--host-11)] accent-[#FE701E]"
                    name="channel-review-order"
                    type="radio"
                  />
                  오래된순
                </label>
              </div>
            </div>

            <nav className="mt-[var(--host-17)] flex items-center gap-[var(--host-24)] border-b border-[#D9D9D9] text-[length:var(--host-14)] font-semibold leading-[1.253]">
              {reviewTabs.map((tab) => (
                <button
                  className={`relative pb-[var(--host-10)] ${
                    activeTab === tab ? "text-[#0D0D0C]" : "text-[#CAC4BC]"
                  }`}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab}
                  {activeTab === tab ? (
                    <span className="absolute bottom-[-1px] left-0 h-[var(--host-2)] w-full bg-[#FE701E]" />
                  ) : null}
                </button>
              ))}
            </nav>

            <div className="pb-[var(--host-46)] pt-[var(--host-24)]">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((review, index) => (
                  <ReviewThreadCard
                    draft={replyDrafts[review.id] ?? ""}
                    index={index}
                    key={review.id}
                    onDraftChange={(value) =>
                      setReplyDrafts((current) => ({ ...current, [review.id]: value }))
                    }
                    review={review}
                  />
                ))
              ) : (
                <div className="grid h-[var(--host-150)] place-items-center border-b border-[#D9D9D9] text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#6D7A8A]">
                  표시할 후기가 없습니다.
                </div>
              )}
            </div>
          </section>

          <div className="flex h-[var(--host-69)] items-start border-t border-[#6D7A8A] px-[var(--host-28)] pt-[var(--host-18)]">
            <button
              className="inline-flex h-[var(--host-29)] w-[var(--host-58)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E]"
              type="button"
            >
              저장
            </button>
          </div>
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function ReviewThreadCard({
  draft,
  index,
  onDraftChange,
  review,
}: {
  draft: string;
  index: number;
  onDraftChange: (value: string) => void;
  review: ChannelReviewItem;
}) {
  const hidden = review.published === false;
  const imageCount = review.imageCount ?? 0;

  return (
    <article
      className={`border-b border-[#D9D9D9] px-[var(--host-28)] py-[var(--host-24)] ${
        hidden ? "bg-[#F8F6F4]" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-[var(--host-20)]">
        <div className="flex min-w-0 items-start gap-[var(--host-10)]">
          <div className="mt-[var(--host-3)] size-[var(--host-18)] shrink-0 rounded-full bg-[#D9D9D9]" />
          <div className="min-w-0">
            <h2 className="text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#0D0D0C]">
              {review.author || "닉네임"}
            </h2>
            <p className="mt-[var(--host-7)] text-[length:var(--host-12)] font-normal leading-[1.253] text-[#CAC4BC]">
              {review.badge || review.title}{" "}
              <span className="ml-[var(--host-8)] text-[#FE701E]">
                ★ {(review.rating ?? 5).toFixed(1)}
              </span>
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <button
            className="h-[var(--host-21)] rounded-full border border-[#6D7A8A] px-[var(--host-10)] text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A]"
            type="button"
          >
            {hidden ? "숨김해제" : "숨김처리"}
          </button>
          <p className="mt-[var(--host-8)] text-[length:var(--host-11)] font-normal leading-[1.253] text-[#CAC4BC]">
            {formatReviewDate(review.updatedAt)}
          </p>
        </div>
      </div>

      <p className="ml-[var(--host-28)] mt-[var(--host-14)] max-w-[var(--host-782)] text-[length:var(--host-11)] font-normal leading-[1.55] text-[#0D0D0C]">
        {review.body}
      </p>

      {imageCount > 0 ? (
        <div className="ml-[var(--host-28)] mt-[var(--host-18)] flex items-center gap-[var(--host-6)]">
          {index === 0 ? (
            <button
              aria-label="이전 이미지"
              className="mr-[var(--host-2)] grid size-[var(--host-17)] place-items-center rounded-full border border-[#F5E1D3] text-[length:var(--host-14)] leading-none text-[#F5E1D3]"
              type="button"
            >
              <span className="block size-[var(--host-6)] rotate-45 border-b border-l border-current" />
            </button>
          ) : null}
          {Array.from({ length: imageCount }).map((_, imageIndex) => (
            <div
              className="h-[var(--host-82)] w-[var(--host-93)] shrink-0 rounded-[4px] bg-[#D9D9D9]"
              key={`${review.id}-image-${imageIndex}`}
            />
          ))}
          {index === 0 ? (
            <button
              aria-label="다음 이미지"
              className="ml-[var(--host-2)] grid size-[var(--host-17)] place-items-center rounded-full border border-[#F5E1D3] text-[length:var(--host-14)] leading-none text-[#F5E1D3]"
              type="button"
            >
              <span className="block size-[var(--host-6)] rotate-45 border-r border-t border-current" />
            </button>
          ) : null}
        </div>
      ) : null}

      {review.excerpt ? (
        <div className="ml-[var(--host-28)] mt-[var(--host-18)] rounded-[4px] border border-[#AEB8C2] bg-white px-[var(--host-16)] py-[var(--host-12)] text-[length:var(--host-11)] font-normal leading-[1.55] text-[#6D7A8A]">
          <div className="flex items-start justify-between">
            <p className="font-semibold text-[#6D7A8A]">호스트 댓글</p>
            <div className="flex items-center gap-[var(--host-8)]">
              <button aria-label="댓글 수정" type="button">
                <Image alt="" height={14} src={nuvioIcons.formItemCopy} width={14} />
              </button>
              <button aria-label="댓글 삭제" type="button">
                <Image alt="" height={14} src={nuvioIcons.formItemTrash} width={14} />
              </button>
            </div>
          </div>
          <p className="mt-[var(--host-5)] whitespace-pre-line">{review.excerpt}</p>
        </div>
      ) : null}

      <div className="ml-[var(--host-28)] mt-[var(--host-14)] flex items-center gap-[var(--host-6)] border-t border-[#D9D9D9] pt-[var(--host-13)]">
        <input
          className="h-[var(--host-31)] flex-1 rounded-[4px] border border-[#AEB8C2] bg-white px-[var(--host-12)] text-[length:var(--host-11)] font-normal leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#CAC4BC]"
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="댓글을 입력해 주세요"
          value={draft}
        />
        <button
          className="h-[var(--host-31)] w-[var(--host-52)] rounded-[4px] border border-[#6D7A8A] bg-white text-[length:var(--host-11)] font-normal leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E]"
          type="button"
        >
          등록
        </button>
      </div>
    </article>
  );
}
