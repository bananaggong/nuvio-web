"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Search, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { getProgramById, reviewCategories } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import type { Review, ReviewCategory } from "@/lib/types";

export function ReviewFeed({ reviews, showWriteButton = false }: { reviews: Review[]; showWriteButton?: boolean }) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<"all" | ReviewCategory>("all");

  const filteredReviews = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return reviews.filter((review) => {
      const program = review.programId ? getProgramById(review.programId) : undefined;
      const matchesCategory = category === "all" || review.category === category;
      const matchesKeyword =
        !normalized ||
        [review.title, review.excerpt, review.body, review.author, program?.title ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesCategory && matchesKeyword;
    });
  }, [category, keyword, reviews]);

  return (
    <div>
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
          <p className="text-sm font-black text-[var(--primary)]">지원금 후기/팁</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
            선정, 탈락, 여행 중 배운 것을 함께 나눠요.
          </h1>
          <label className="relative mt-6 block">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              className="h-12 w-full rounded-md border border-slate-200 bg-[var(--surface-muted)] pl-12 pr-4 text-base font-semibold outline-none ring-[var(--primary)] placeholder:text-slate-400 focus:ring-2"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="후기 검색"
              type="search"
              value={keyword}
            />
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-5 md:px-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {reviewCategories.map((item) => (
            <button
              className={`min-w-fit rounded-md border px-3 py-2 text-sm font-black ${
                category === item.key
                  ? "border-[var(--primary)] bg-teal-50 text-[var(--primary)]"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
              key={item.key}
              onClick={() => setCategory(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4">
          {filteredReviews.map((review) => {
            const program = review.programId ? getProgramById(review.programId) : undefined;
            const categoryLabel =
              reviewCategories.find((item) => item.key === review.category)?.label ?? "후기";
            return (
              <article
                className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                key={review.id}
              >
                <Link href={`/reviews/${review.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[var(--primary)]">
                        {categoryLabel}
                      </p>
                      <h2 className="mt-1 text-xl font-black leading-7 text-slate-950">
                        {review.title}
                      </h2>
                    </div>
                    {review.badge ? (
                      <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-black text-orange-700">
                        {review.badge}
                      </span>
                    ) : null}
                  </div>
                  {program ? (
                    <p className="mt-2 text-sm font-bold text-slate-500">
                      연결 프로그램: {program.title}
                    </p>
                  ) : null}
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {review.excerpt}
                  </p>
                </Link>

                {review.images.length > 0 ? (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {review.images.slice(0, 3).map((src, index) => (
                      <div
                        className="relative aspect-square overflow-hidden rounded-md bg-slate-100"
                        key={src}
                      >
                        <Image
                          alt={`${review.title} 이미지 ${index + 1}`}
                          className="object-cover"
                          fill
                          sizes="180px"
                          src={src}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-xs font-black text-slate-500">
                      {review.author.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{review.author}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(review.date)}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-sm font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Heart size={16} /> {review.likes}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle size={16} /> {review.comments}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Share2 size={16} />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
          {filteredReviews.length === 0 ? (
            <NuvioEmptyState
              className="rounded-[6px] bg-[#FAFAFA]"
              label={keyword.trim() ? "검색 결과" : "후기"}
            />
          ) : null}
        </div>
        {showWriteButton ? (
          <Link
            aria-label="review write"
            className="fixed bottom-24 right-5 z-30 inline-flex size-14 items-center justify-center rounded-md bg-[var(--primary)] text-white shadow-lg hover:bg-[var(--primary-strong)] md:bottom-8"
            href="/reviews/new"
          >
            <span className="text-2xl leading-none">+</span>
          </Link>
        ) : null}
      </section>
    </div>
  );
}
