"use client";

import Link from "next/link";
import { Loader2, Send, Star } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

export function ReviewWriter({
  applicationId = "",
  requestToken = "",
}: {
  applicationId?: string;
  requestToken?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [rating, setRating] = useState<number | "">("");

  useEffect(() => {
    const id = applicationId.trim();
    if (!isUuid(id)) return;

    const token = requestToken.trim();
    const controller = new AbortController();
    void fetch(token ? "/api/reviews/requests/open" : "/api/me/reviews/requests", {
      body: JSON.stringify(
        token ? { applicationId: id, requestToken: token } : { applicationId: id },
      ),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal,
    }).catch(() => {
      // Opening telemetry should not block review writing.
    });

    return () => controller.abort();
  }, [applicationId, requestToken]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());

    setSubmitted(false);
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "후기를 저장하지 못했어요.");
      }

      setSubmitted(true);
      formElement.reset();
      setRating("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "알 수 없는 문제가 생겼어요. 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:px-8">
      <h1 className="text-3xl font-black text-slate-950">후기 작성</h1>
      <p className="mt-2 text-sm text-slate-500">
        참여하신 프로그램 경험을 남겨주세요. 제출된 후기는 검토 후 공개될 수 있어요.
      </p>

      {submitted ? (
        <div className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-bold text-teal-800">
          후기가 접수됐어요. 검토 후 공개 여부가 결정돼요.
        </div>
      ) : null}
      {errorMessage ? (
        <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <form
        className="mt-6 grid gap-4 rounded-md border border-slate-200 bg-white p-5"
        onSubmit={submit}
      >
        <input name="applicationId" type="hidden" value={applicationId} />
        {requestToken ? <input name="requestToken" type="hidden" value={requestToken} /> : null}
        <label className="grid gap-2 text-sm font-black text-slate-700">
          카테고리
          <select
            className="h-11 rounded-md border border-slate-200 px-3 font-semibold"
            name="category"
          >
            <option value="trip">참여 후기</option>
            <option value="programTip">프로그램 팁</option>
            <option value="selected">선정 후기</option>
            <option value="rejected">미선정 후기</option>
            <option value="free">자유 후기</option>
            <option value="question">질문</option>
          </select>
        </label>
        <div className="grid gap-2 text-sm font-black text-slate-700">
          <input name="rating" type="hidden" value={rating} />
          <span>평점</span>
          <div aria-label="후기 평점" className="flex items-center gap-1" role="radiogroup">
            {[1, 2, 3, 4, 5].map((value) => {
              const selected = rating !== "" && rating >= value;
              return (
                <button
                  aria-checked={rating === value}
                  aria-label={`${value}점`}
                  className="inline-flex size-9 items-center justify-center rounded-md text-slate-300 transition hover:bg-orange-50 hover:text-[var(--primary)]"
                  key={value}
                  onClick={() => setRating(value)}
                  role="radio"
                  type="button"
                >
                  <Star
                    className={selected ? "fill-[var(--primary)] text-[var(--primary)]" : undefined}
                    size={22}
                  />
                </button>
              );
            })}
            {rating ? (
              <button
                className="ml-2 h-8 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-500 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                onClick={() => setRating("")}
                type="button"
              >
                선택 해제
              </button>
            ) : null}
          </div>
        </div>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          제목
          <input
            className="h-11 rounded-md border border-slate-200 px-3 font-semibold"
            name="title"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          내용
          <textarea
            className="min-h-44 rounded-md border border-slate-200 p-3 font-semibold leading-6"
            name="body"
            required
          />
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          후기 접수하기
        </button>
      </form>
      <Link
        className="mt-4 inline-block text-sm font-bold text-slate-500 hover:text-[var(--primary)]"
        href="/reviews"
      >
        후기 목록으로 돌아가기
      </Link>
    </div>
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/iu.test(
    value,
  );
}
