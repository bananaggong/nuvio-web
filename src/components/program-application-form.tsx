"use client";

import Link from "next/link";
import { CheckCircle2, FileText, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type {
  ApplicationFormBlock,
  ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import {
  isQuestionBlock,
  normalizeApplicationFormTemplateShape,
} from "@/lib/application-form-builder";
import { appendHostApplication } from "@/lib/host-operations";
import type { HostApplication } from "@/lib/host-operations";
import { appendMyApplication } from "@/lib/my-applications";
import { programPath } from "@/lib/program-routing";
import type { Program } from "@/lib/types";

type ProgramApplicationFormProps = {
  program: Program;
  formTemplate?: ApplicationFormTemplate;
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

type DynamicAnswers = Record<string, string | boolean | string[]>;

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

export function ProgramApplicationForm({
  formTemplate,
  program,
}: ProgramApplicationFormProps) {
  const [form, setForm] = useState<ApplicationFormState>(initialFormState);
  const [dynamicAnswers, setDynamicAnswers] = useState<DynamicAnswers>({});
  const [submittedId, setSubmittedId] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const normalizedTemplate = formTemplate
    ? normalizeApplicationFormTemplateShape(formTemplate)
    : undefined;
  const visibleBlocks =
    normalizedTemplate?.blocks && normalizedTemplate.blocks.length > 0
      ? resolveVisibleBlocks(normalizedTemplate.blocks, dynamicAnswers)
      : [];
  const hasTemplate = Boolean(normalizedTemplate && visibleBlocks.length > 0);

  function updateField<Key extends keyof ApplicationFormState>(
    key: Key,
    value: ApplicationFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateDynamicAnswer(fieldId: string, value: string | boolean | string[]) {
    setDynamicAnswers((current) => ({ ...current, [fieldId]: value }));
  }

  function buildMemo(): string {
    if (form.motivation.trim()) return form.motivation.slice(0, 72);

    const firstTextAnswer = Object.values(dynamicAnswers).find(
      (value) => typeof value === "string" && value.trim(),
    );

    return typeof firstTextAnswer === "string"
      ? firstTextAnswer.slice(0, 72)
      : "누비오 신청서 접수";
  }

  function buildAnswers(): Record<string, unknown> {
    const legalConsent = {
      agreed: form.agree,
      agreedAt: new Date().toISOString(),
      documents: [
        { title: "이용약관", href: "/terms" },
        { title: "개인정보 수집 및 이용", href: "/privacy" },
        { title: "개인정보 제3자 제공 동의", href: "/privacy/third-party" },
      ],
    };

    if (normalizedTemplate && hasTemplate) {
      return {
        blockAnswers: normalizedTemplate.blocks
          .filter(isQuestionBlock)
          .map((block) => ({
            id: block.id,
            label: block.label,
            type: block.type,
            value: dynamicAnswers[block.id] ?? (block.type === "checkbox" ? false : ""),
          })),
        companions: form.companions,
        legalConsent,
        memo: buildMemo(),
        templateId: normalizedTemplate.id,
        templateName: normalizedTemplate.name,
        templateAnswers: normalizedTemplate.fields.map((field) => ({
          id: field.id,
          label: field.label,
          type: field.type,
          value: dynamicAnswers[field.id] ?? (field.type === "checkbox" ? false : ""),
        })),
      };
    }

    return {
      companions: form.companions,
      legalConsent,
      motivation: form.motivation,
      workStyle: form.workStyle,
      receiptPlan: form.receiptPlan,
    };
  }

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(undefined);

    const id = createApplicationLocalId(program.id);
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
      memo: buildMemo(),
    };

    try {
      const response = await fetch("/api/program-applications", {
        body: JSON.stringify({
          programId: program.id,
          formId: normalizedTemplate?.id,
          applicantName: form.applicantName,
          email: form.email,
          phone: form.phone,
          memo: fallbackApplication.memo,
          answers: buildAnswers(),
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
        "DB 저장에 실패해 브라우저에 임시 저장했습니다. 운영자가 다시 동기화할 수 있습니다.",
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
            신청서가 접수되었습니다
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            신청 내용은 호스트 콘솔의 신청자 파이프라인에 반영됩니다. 접수번호는{" "}
            <span className="font-mono font-black text-slate-900">{submittedId}</span>
            입니다.
          </p>
          {submitError ? (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
              {submitError}
            </p>
          ) : null}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white"
              href="/me"
            >
              내 신청 내역 보기
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700"
              href={programPath(program)}
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
          기본 연락처와 호스트가 설정한 신청 질문을 함께 제출합니다. 제출된 내용은
          Supabase DB에 저장되고 호스트 운영 화면에서 확인할 수 있습니다.
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

          {hasTemplate && normalizedTemplate ? (
            <section className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-4">
              <h2 className="text-base font-black text-slate-950">
                {normalizedTemplate.name}
              </h2>
              {normalizedTemplate.description ? (
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {normalizedTemplate.description}
                </p>
              ) : null}
              <div className="mt-4 grid gap-4">
                {visibleBlocks.map((block) => (
                  <DynamicBlock
                    block={block}
                    key={block.id}
                    onChange={(value) => updateDynamicAnswer(block.id, value)}
                    value={dynamicAnswers[block.id]}
                  />
                ))}
              </div>
            </section>
          ) : (
            <>
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
              <Field label="영수증/체류 내역 제출 예정 방식">
                <textarea
                  className="min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateField("receiptPlan", event.target.value)}
                  value={form.receiptPlan}
                />
              </Field>
            </>
          )}

          <label className="flex gap-3 rounded-md border border-slate-200 bg-[var(--surface-muted)] p-3 text-sm font-bold text-slate-700">
            <input
              checked={form.agree}
              className="mt-1"
              onChange={(event) => updateField("agree", event.target.checked)}
              required
              type="checkbox"
            />
            <span>
              <span className="block">
                이용약관, 개인정보 수집 및 이용, 개인정보 제3자 제공 동의에 모두
                동의합니다.
              </span>
              <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-black text-[var(--primary)]">
                <Link href="/terms" target="_blank">
                  이용약관
                </Link>
                <Link href="/privacy" target="_blank">
                  개인정보 수집 및 이용
                </Link>
                <Link href="/privacy/third-party" target="_blank">
                  개인정보 제3자 제공 동의
                </Link>
              </span>
            </span>
          </label>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            <Send size={17} />
            {isSubmitting ? "제출 중" : "신청서 제출"}
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
            최종 모집 조건, 환급 기준, 개인정보 처리 기준은 각 운영기관의 공식 공고를
            기준으로 다시 확인해야 합니다.
          </p>
        </div>
      </aside>
    </section>
  );
}

function DynamicBlock({
  block,
  onChange,
  value,
}: {
  block: ApplicationFormBlock;
  onChange: (value: string | boolean | string[]) => void;
  value?: string | boolean | string[];
}) {
  if (block.type === "title") {
    return <h3 className="text-xl font-black text-slate-950">{block.label}</h3>;
  }

  if (block.type === "description") {
    return (
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {block.body || block.label}
      </p>
    );
  }

  if (block.type === "divider") {
    return <hr className="border-slate-200" />;
  }

  if (block.type === "image") {
    if (!block.imageUrl) return null;

    return (
      <figure
        className="mx-auto"
        style={{ width: `${block.imageWidth ?? 100}%` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={block.imageAlt || block.label}
          className="w-full rounded-md object-cover"
          src={block.imageUrl}
        />
        {block.label ? (
          <figcaption className="mt-2 text-center text-xs font-bold text-slate-500">
            {block.label}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.type === "pageBreak") {
    return (
      <div className="rounded-md bg-white px-3 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-200">
        다음 페이지: {block.label}
      </div>
    );
  }

  if (block.type === "checkbox") {
    return (
      <label className="flex gap-3 rounded-md bg-white p-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
        <input
          checked={Boolean(value)}
          className="mt-1"
          onChange={(event) => onChange(event.target.checked)}
          required={block.required}
          type="checkbox"
        />
        <span>
          {block.label}
          {block.required ? <span className="text-[var(--accent)]"> *</span> : null}
          {block.helper ? (
            <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
              {block.helper}
            </span>
          ) : null}
        </span>
      </label>
    );
  }

  return (
    <Field label={block.label} required={block.required}>
      {block.type === "longText" ? (
        <textarea
          className="min-h-28 w-full rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 outline-none focus:border-[var(--primary)]"
          onChange={(event) => onChange(event.target.value)}
          required={block.required}
          value={typeof value === "string" ? value : ""}
        />
      ) : null}
      {block.type === "singleSelect" ? (
        <select
          className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
          onChange={(event) => onChange(event.target.value)}
          required={block.required}
          value={typeof value === "string" ? value : ""}
        >
          <option disabled value="">
            선택하세요
          </option>
          {(block.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : null}
      {block.type === "multiSelect" ? (
        <select
          className="min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          multiple
          onChange={(event) =>
            onChange(
              Array.from(event.currentTarget.selectedOptions).map(
                (option) => option.value,
              ),
            )
          }
          value={Array.isArray(value) ? value : []}
        >
          {(block.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : null}
      {["shortText", "email", "phone", "date"].includes(block.type) ? (
        <input
          className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
          onChange={(event) => onChange(event.target.value)}
          required={block.required}
          type={block.type === "date" ? "date" : block.type === "email" ? "email" : "text"}
          value={typeof value === "string" ? value : ""}
        />
      ) : null}
      {block.helper ? (
        <span className="text-xs font-semibold leading-5 text-slate-500">
          {block.helper}
        </span>
      ) : null}
    </Field>
  );
}

function resolveVisibleBlocks(
  blocks: ApplicationFormBlock[],
  answers: DynamicAnswers,
): ApplicationFormBlock[] {
  const visibleBlocks: ApplicationFormBlock[] = [];
  const visitedIndexes = new Set<number>();
  let index = 0;

  while (index < blocks.length && !visitedIndexes.has(index)) {
    visitedIndexes.add(index);
    const block = blocks[index];
    visibleBlocks.push(block);

    const matchedBranch = (block.branches ?? []).find((branch) =>
      isBranchMatched(answers[block.id], branch.value),
    );
    const targetIndex = matchedBranch
      ? blocks.findIndex((item) => item.id === matchedBranch.targetBlockId)
      : -1;

    index = targetIndex > index ? targetIndex : index + 1;
  }

  return visibleBlocks;
}

function isBranchMatched(
  answer: string | boolean | string[] | undefined,
  branchValue: string,
): boolean {
  if (Array.isArray(answer)) return answer.includes(branchValue);
  if (typeof answer === "boolean") return String(answer) === branchValue;
  return answer === branchValue;
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

function createApplicationLocalId(programId: number | string): string {
  return `app-${programId}-${Date.now()}`;
}
