"use client";

import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { FormEvent, useState } from "react";

export function ReviewWriter() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "잠깐 문제가 생겼어요. 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:px-8">
      <h1 className="text-3xl font-black text-slate-950">후기 작성</h1>
      <p className="mt-2 text-sm text-slate-500">
        작성한 후기는 검토 대기 상태로 저장돼요. 운영자가 확인한 뒤 공개할 수 있어요.
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
        <label className="grid gap-2 text-sm font-black text-slate-700">
          작성자명
          <input
            className="h-11 rounded-md border border-slate-200 px-3 font-semibold"
            name="author"
            placeholder="미입력 시 익명"
          />
        </label>
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
