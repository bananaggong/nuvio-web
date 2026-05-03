"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { FormEvent, useState } from "react";

export function ReviewWriter() {
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const current = JSON.parse(
      window.localStorage.getItem("nuvio:draft-reviews") ?? "[]",
    ) as unknown[];
    window.localStorage.setItem(
      "nuvio:draft-reviews",
      JSON.stringify([{ ...payload, createdAt: new Date().toISOString() }, ...current]),
    );
    setSubmitted(true);
    event.currentTarget.reset();
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:px-8">
      <h1 className="text-3xl font-black text-slate-950">후기 작성</h1>
      <p className="mt-2 text-sm text-slate-500">
        이 MVP에서는 작성 내용이 브라우저 저장소에 임시 저장됩니다.
      </p>

      {submitted ? (
        <div className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-bold text-teal-800">
          후기가 임시 저장되었습니다. 운영자 검수 후 공개되는 흐름으로 확장됩니다.
        </div>
      ) : null}

      <form className="mt-6 grid gap-4 rounded-md border border-slate-200 bg-white p-5" onSubmit={submit}>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          카테고리
          <select className="h-11 rounded-md border border-slate-200 px-3 font-semibold" name="category">
            <option>프로그램 후기/팁</option>
            <option>선정됐어요</option>
            <option>탈락했어요</option>
            <option>여행후기</option>
            <option>자유수다</option>
            <option>질문답변</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          제목
          <input className="h-11 rounded-md border border-slate-200 px-3 font-semibold" name="title" required />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          내용
          <textarea className="min-h-44 rounded-md border border-slate-200 p-3 font-semibold leading-6" name="body" required />
        </label>
        <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-black text-white" type="submit">
          <Send size={18} />
          임시 저장
        </button>
      </form>
      <Link className="mt-4 inline-block text-sm font-bold text-slate-500 hover:text-[var(--primary)]" href="/reviews">
        후기 목록으로 돌아가기
      </Link>
    </div>
  );
}
