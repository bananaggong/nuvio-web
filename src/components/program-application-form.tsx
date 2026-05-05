"use client";

import Link from "next/link";
import { CheckCircle2, FileText, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { appendHostApplication } from "@/lib/host-operations";
import type { HostApplication } from "@/lib/host-operations";
import { appendMyApplication } from "@/lib/my-applications";
import type { Program } from "@/lib/types";

type ProgramApplicationFormProps = {
  program: Program;
};

type ApplicationFormState = {
  applicantName: string;
  email: string;
  phone: string;
  companions: string;
  motivation: string;
  workStyle: string;
  receiptPlan: string;
  agree: boolean;
};

const initialFormState: ApplicationFormState = {
  applicantName: "",
  email: "",
  phone: "",
  companions: "1",
  motivation: "",
  workStyle: "",
  receiptPlan: "",
  agree: false,
};

export function ProgramApplicationForm({ program }: ProgramApplicationFormProps) {
  const [form, setForm] = useState<ApplicationFormState>(initialFormState);
  const [submittedId, setSubmittedId] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  function updateField<Key extends keyof ApplicationFormState>(
    key: Key,
    value: ApplicationFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(undefined);

    const id = `app-${program.id}-${Date.now()}`;
    const fallbackApplication: HostApplication = {
      id,
      programTitle: program.title,
      applicantName: form.applicantName,
      email: form.email,
      phone: form.phone,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      paymentAmount: 0,
      receiptCount: 0,
      signatureCompleted: false,
      reviewSubmitted: false,
      memo: form.motivation.slice(0, 72) || "누비오 신청서 접수",
    };

    try {
      const response = await fetch("/api/program-applications", {
        body: JSON.stringify({
          programId: program.id,
          applicantName: form.applicantName,
          email: form.email,
          phone: form.phone,
          memo: fallbackApplication.memo,
          answers: {
            companions: form.companions,
            motivation: form.motivation,
            workStyle: form.workStyle,
            receiptPlan: form.receiptPlan,
          },
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to persist application.");
      }

      const payload = (await response.json()) as { data?: HostApplication };
      const application = payload.data ?? fallbackApplication;
      appendHostApplication(application);
      appendMyApplication(application);
      setSubmittedId(application.id);
    } catch {
      appendHostApplication(fallbackApplication);
      appendMyApplication(fallbackApplication);
      setSubmitError(
        "DB 저장에 실패해 이 브라우저에 임시 저장했습니다. 운영자가 다시 동기화할 수 있습니다.",
      );
      setSubmittedId(id);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedId) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="rounded-md border border-teal-200 bg-white p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto text-[var(--primary)]" size={42} />
          <h1 className="mt-4 text-2xl font-black text-slate-950">
            신청서가 접수되었습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            호스트 콘솔의 신청자 파이프라인에 바로 반영했습니다. 실제 서비스에서는
            Supabase DB에 저장되고, 호스트에게 알림이 발송됩니다.
          </p>
          {submitError ? (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
              {submitError}
            </p>
          ) : null}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white"
              href="/host"
            >
              호스트 콘솔에서 보기
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700"
              href={`/programs/${program.id}`}
            >
              프로그램으로 돌아가기
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-[1fr_360px]">
      <form
        className="rounded-md border border-slate-200 bg-white p-5"
        onSubmit={submitApplication}
      >
        <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
          <FileText size={17} />
          누비오 신청서
        </p>
        <h1 className="mt-3 text-2xl font-black text-slate-950 md:text-3xl">
          {program.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          참여자 정보와 운영에 필요한 기본 질문을 받습니다. DB 연결 후에는 이
          신청서가 호스트 SaaS의 신청자 DB로 저장됩니다.
        </p>

        <div className="mt-6 grid gap-4">
          <Field label="이름" required>
            <input
              className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
              onChange={(event) => updateField("applicantName", event.target.value)}
              required
              value={form.applicantName}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="이메일" required>
              <input
                className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                onChange={(event) => updateField("email", event.target.value)}
                required
                type="email"
                value={form.email}
              />
            </Field>
            <Field label="연락처" required>
              <input
                className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                onChange={(event) => updateField("phone", event.target.value)}
                required
                value={form.phone}
              />
            </Field>
          </div>
          <Field label="참여 인원">
            <select
              className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
              onChange={(event) => updateField("companions", event.target.value)}
              value={form.companions}
            >
              <option value="1">1명</option>
              <option value="2">2명</option>
              <option value="3">3명</option>
              <option value="4+">4명 이상</option>
            </select>
          </Field>
          <Field label="참여 동기" required>
            <textarea
              className="min-h-32 w-full rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-[var(--primary)]"
              onChange={(event) => updateField("motivation", event.target.value)}
              required
              value={form.motivation}
            />
          </Field>
          <Field label="워케이션/체류 중 필요한 운영 지원">
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-[var(--primary)]"
              onChange={(event) => updateField("workStyle", event.target.value)}
              value={form.workStyle}
            />
          </Field>
          <Field label="영수증·이체내역 제출 예정 방식">
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-[var(--primary)]"
              onChange={(event) => updateField("receiptPlan", event.target.value)}
              value={form.receiptPlan}
            />
          </Field>
          <label className="flex gap-3 rounded-md bg-[var(--surface-muted)] p-3 text-sm font-bold text-slate-600">
            <input
              checked={form.agree}
              className="mt-1"
              onChange={(event) => updateField("agree", event.target.checked)}
              required
              type="checkbox"
            />
            신청 정보가 프로그램 운영자에게 전달되며, 합격 안내와 운영 메시지를
            받을 수 있음에 동의합니다.
          </label>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            <Send size={17} />
            신청서 제출
          </button>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-base font-black text-slate-950">신청 후 흐름</h2>
          <div className="mt-4 grid gap-3">
            {["접수", "호스트 검토", "합격 안내", "결제/서명", "참여/리뷰"].map(
              (step, index) => (
                <div className="flex items-center gap-3" key={step}>
                  <span className="flex size-7 items-center justify-center rounded-md bg-teal-50 text-xs font-black text-[var(--primary)]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-700">{step}</span>
                </div>
              ),
            )}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-5">
          <p className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
            <ShieldCheck size={17} />
            운영자 확인 사항
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            최종 모집 조건, 환급 기준, 개인정보 처리 기준은 각 운영기관의 공식
            공고를 기준으로 확인해야 합니다.
          </p>
        </div>
      </aside>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-[var(--accent)]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
