"use client";

import { FormEvent, useState } from "react";
import { Building2, Send } from "lucide-react";

export function PartnerForm() {
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const current = JSON.parse(
      window.localStorage.getItem("nuvio:partner-submissions") ?? "[]",
    ) as unknown[];
    window.localStorage.setItem(
      "nuvio:partner-submissions",
      JSON.stringify([{ ...payload, status: "접수", createdAt: new Date().toISOString() }, ...current]),
    );
    setSubmitted(true);
    event.currentTarget.reset();
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
          <Building2 size={18} />
          파트너 무료 등록
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          프로그램을 제보하거나 등록하세요.
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          지자체, 운영사, 숙소, 로컬 파트너가 모집 정보를 제출하면 운영자가
          검수한 뒤 프로그램 카드로 전환합니다.
        </p>
      </div>

      {submitted ? (
        <div className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-bold text-teal-800">
          접수되었습니다. 관리자 화면에서 임시 제출 내역을 확인할 수 있습니다.
        </div>
      ) : null}

      <form className="mt-6 grid gap-4 rounded-md border border-slate-200 bg-white p-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="기관/업체명" name="organization" required />
          <Field label="담당자명" name="manager" required />
          <Field label="이메일" name="email" required type="email" />
          <Field label="연락처" name="phone" required />
          <Field label="지역" name="region" placeholder="예: 강원 강릉시" required />
          <Field label="프로그램명" name="programTitle" required />
        </div>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          모집/지원 내용
          <textarea
            className="min-h-32 rounded-md border border-slate-200 p-3 font-semibold leading-6 outline-none focus:ring-2 focus:ring-[var(--primary)]"
            name="description"
            required
          />
        </label>
        <Field label="공식 공고/신청 링크" name="url" placeholder="https://" required />
        <label className="flex items-start gap-2 text-sm font-bold text-slate-600">
          <input className="mt-1 accent-[var(--primary)]" required type="checkbox" />
          제출한 자료를 NUVIO 서비스 내 검수/게시 목적으로 활용하는 데 동의합니다.
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-black text-white"
          type="submit"
        >
          <Send size={18} />
          제출하기
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}
