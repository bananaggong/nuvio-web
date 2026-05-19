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
      JSON.stringify([
        {
          ...payload,
          submissionType: "operation_inquiry",
          status: "문의 접수",
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]),
    );
    setSubmitted(true);
    event.currentTarget.reset();
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
          <Building2 size={18} />
          운영 문의
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          로컬홈을 만들고 프로그램을 운영하세요.
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          프로그램 등록과 신청자 관리는 같은 계정으로 바로 시작할 수 있습니다.
          로컬홈 구성이나 운영 협업이 필요하면 이 양식으로 문의해주세요.
        </p>
      </div>

      {submitted ? (
        <div className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-bold text-teal-800">
          운영 문의가 접수되었습니다. 누비오 운영자가 확인한 뒤 로컬홈 구성과
          협업 안내를 드립니다.
        </div>
      ) : null}

      <form className="mt-6 grid gap-4 rounded-md border border-slate-200 bg-white p-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="로컬홈/브랜드명" name="villageName" required />
          <Field label="운영 주체" name="organization" placeholder="예: 지자체, 청년마을, 운영사" required />
          <Field label="담당자명" name="manager" required />
          <Field label="이메일" name="email" required type="email" />
          <Field label="연락처" name="phone" required />
          <Field label="지역" name="region" placeholder="예: 강원 강릉시" required />
        </div>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          로컬홈 소개
          <textarea
            className="min-h-32 rounded-md border border-slate-200 p-3 font-semibold leading-6 outline-none focus:ring-2 focus:ring-[var(--primary)]"
            name="description"
            placeholder="어떤 지역/공간/커뮤니티를 운영하는지 알려주세요."
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          운영 예정 프로그램
          <textarea
            className="min-h-28 rounded-md border border-slate-200 p-3 font-semibold leading-6 outline-none focus:ring-2 focus:ring-[var(--primary)]"
            name="plannedPrograms"
            placeholder="예: 워케이션, 한달살기, 로컬 클래스, 체류형 커뮤니티 등"
            required
          />
        </label>
        <Field label="공식 홈페이지/인스타그램" name="url" placeholder="https://" />
        <label className="flex items-start gap-2 text-sm font-bold text-slate-600">
          <input className="mt-1 accent-[var(--primary)]" required type="checkbox" />
          제출한 자료를 누비오 로컬홈 구성과 운영 협업 안내 목적으로 활용하는 데 동의합니다.
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-black text-white"
          type="submit"
        >
          <Send size={18} />
          운영 문의 보내기
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
