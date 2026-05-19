"use client";

import { FormEvent, useState } from "react";
import { Building2, Loader2, Send } from "lucide-react";

export function PartnerForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());

    setIsSubmitting(true);
    setErrorMessage("");
    setSubmitted(false);

    try {
      const response = await fetch("/api/partner-submissions", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "운영 문의를 저장하지 못했습니다.");
      }

      setSubmitted(true);
      formElement.reset();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "운영 문의 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
          <Building2 size={18} />
          운영 문의
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          로컬홈을 만들고 프로그램을 운영하세요
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          로컬홈 구성이나 운영 작업이 필요하면 아래 양식으로 문의해 주세요.
          접수 내용은 운영 DB에 저장되고 관리자 검토 대상으로 들어갑니다.
        </p>
      </div>

      {submitted ? (
        <div className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-bold text-teal-800">
          운영 문의가 접수되었습니다. 누비오 운영팀이 확인한 뒤 연락드릴게요.
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
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="로컬홈 브랜드명" name="villageName" required />
          <Field
            label="운영 주체"
            name="organization"
            placeholder="예: 지자체, 청년마을, 운영팀"
            required
          />
          <Field label="담당자명" name="manager" required />
          <Field label="이메일" name="email" required type="email" />
          <Field label="연락처" name="phone" required />
          <Field label="지역" name="region" placeholder="예: 전남 보성군" required />
        </div>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          로컬홈 소개
          <textarea
            className="min-h-32 rounded-md border border-slate-200 p-3 font-semibold leading-6 outline-none focus:ring-2 focus:ring-[var(--primary)]"
            name="description"
            placeholder="어떤 지역, 공간, 커뮤니티를 운영하는지 알려주세요."
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          운영 예정 프로그램
          <textarea
            className="min-h-28 rounded-md border border-slate-200 p-3 font-semibold leading-6 outline-none focus:ring-2 focus:ring-[var(--primary)]"
            name="plannedPrograms"
            placeholder="예: 워케이션, 한달살기, 로컬 클래스, 체류형 커뮤니티"
            required
          />
        </label>
        <Field
          label="공식 홈페이지/인스타그램"
          name="url"
          placeholder="https://"
        />
        <label className="flex items-start gap-2 text-sm font-bold text-slate-600">
          <input className="mt-1 accent-[var(--primary)]" required type="checkbox" />
          제출한 자료를 누비오 로컬홈 구성과 운영 작업 안내 목적으로 사용하는 데
          동의합니다.
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
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
