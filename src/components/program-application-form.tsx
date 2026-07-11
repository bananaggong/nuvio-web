"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronDown, FileText, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  ApplicationFormBlock,
  ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import {
  isQuestionBlock,
  normalizeApplicationFormTemplateShape,
} from "@/lib/application-form-builder";
import {
  formatApplicationDisplayCode,
  formatProgramDisplayName,
} from "@/lib/display-code";
import { ProgramQuantityControl } from "@/components/program-quantity-control";
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
  consentMarketing: boolean;
  consentPrivacyCollection: boolean;
  consentTerms: boolean;
  consentThirdParty: boolean;
};

type FileAnswer = {
  fileName: string;
  fileSize: number;
  fileType: string;
};
type DynamicAnswer = string | boolean | string[] | FileAnswer;
type DynamicAnswers = Record<string, DynamicAnswer>;
type LegalConsentField =
  | "consentMarketing"
  | "consentPrivacyCollection"
  | "consentTerms"
  | "consentThirdParty";

const initialFormState: ApplicationFormState = {
  applicantName: "",
  email: "",
  phone: "",
  companions: "",
  motivation: "",
  workStyle: "",
  receiptPlan: "",
  consentMarketing: false,
  consentPrivacyCollection: false,
  consentTerms: false,
  consentThirdParty: false,
};

const applicationInputClassName =
  "h-11 w-full rounded-[4px] border border-[#FF9A3D] bg-white px-[12px] text-base font-normal leading-[1.253] text-[#5B3A29] outline-none placeholder:text-[#CAC4BC] focus:border-[#FE701E] focus:ring-1 focus:ring-[#FE701E] min-[1100px]:h-[34px] min-[1100px]:text-[12px]";

const applicationTextareaClassName =
  "min-h-[104px] w-full resize-none rounded-[4px] border border-[#FF9A3D] bg-white px-[12px] py-[10px] text-base font-normal leading-[1.6] text-[#5B3A29] outline-none placeholder:text-[#CAC4BC] focus:border-[#FE701E] focus:ring-1 focus:ring-[#FE701E] min-[1100px]:min-h-[86px] min-[1100px]:text-[12px]";

export function ProgramApplicationForm({
  formTemplate,
  program,
}: ProgramApplicationFormProps) {
  const [form, setForm] = useState<ApplicationFormState>(initialFormState);
  const [dynamicAnswers, setDynamicAnswers] = useState<DynamicAnswers>({});
  const [submittedApplication, setSubmittedApplication] = useState<{
    id: string;
    submittedAt?: string;
  }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const searchParams = useSearchParams();
  const requestedPeople = parseQuantityParam(searchParams.get("people"));
  const companionCount = getCompanionCount(
    form.companions || String(requestedPeople ?? 1),
  );
  const normalizedTemplate = formTemplate
    ? normalizeApplicationFormTemplateShape(formTemplate)
    : undefined;
  const visibleBlocks =
    normalizedTemplate?.blocks && normalizedTemplate.blocks.length > 0
      ? resolveVisibleBlocks(normalizedTemplate.blocks, dynamicAnswers)
      : [];
  const hasTemplate = Boolean(normalizedTemplate && visibleBlocks.length > 0);
  const requiredLegalConsentsAccepted =
    form.consentTerms && form.consentPrivacyCollection && form.consentThirdParty;
  const allLegalConsentsAccepted =
    requiredLegalConsentsAccepted && form.consentMarketing;

  useEffect(() => {
    let active = true;

    async function loadSignedInProfile() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: {
            profile?: {
              contactEmail?: string;
              displayName?: string;
              email?: string;
              phone?: string;
            } | null;
            user?: {
              email?: string;
              userMetadata?: Record<string, unknown>;
            } | null;
          };
        };
        if (!active) return;

        const profile = payload.data?.profile;
        const user = payload.data?.user;
        const metadataName =
          typeof user?.userMetadata?.full_name === "string"
            ? user.userMetadata.full_name
            : typeof user?.userMetadata?.name === "string"
              ? user.userMetadata.name
              : "";
        const nextName = profile?.displayName || metadataName;
        const nextEmail = profile?.contactEmail || profile?.email || user?.email || "";
        const nextPhone = profile?.phone || "";

        setForm((current) => ({
          ...current,
          applicantName: current.applicantName || nextName,
          email: current.email || nextEmail,
          phone: current.phone || nextPhone,
        }));
      } catch {
        // Anonymous users can still fill the form manually.
      }
    }

    void loadSignedInProfile();

    return () => {
      active = false;
    };
  }, []);

  function updateField<Key extends keyof ApplicationFormState>(
    key: Key,
    value: ApplicationFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateDynamicAnswer(fieldId: string, value: DynamicAnswer) {
    setDynamicAnswers((current) => ({ ...current, [fieldId]: value }));
  }

  function updateLegalConsent(field: LegalConsentField, checked: boolean) {
    setForm((current) => ({ ...current, [field]: checked }));
  }

  function updateAllLegalConsents(checked: boolean) {
    setForm((current) => ({
      ...current,
      consentMarketing: checked,
      consentPrivacyCollection: checked,
      consentTerms: checked,
      consentThirdParty: checked,
    }));
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
    const capturedAt = new Date().toISOString();
    const legalConsent = {
      agreed: requiredLegalConsentsAccepted,
      agreedAt: requiredLegalConsentsAccepted ? capturedAt : null,
      documents: [
        {
          agreed: form.consentTerms,
          agreedAt: form.consentTerms ? capturedAt : null,
          href: "/terms",
          key: "terms",
          required: true,
          title: "이용약관",
        },
        {
          agreed: form.consentPrivacyCollection,
          agreedAt: form.consentPrivacyCollection ? capturedAt : null,
          href: "/privacy",
          key: "privacyCollection",
          required: true,
          title: "개인정보 수집 및 이용",
        },
        {
          agreed: form.consentThirdParty,
          agreedAt: form.consentThirdParty ? capturedAt : null,
          href: "/privacy/third-party",
          key: "thirdParty",
          required: true,
          title: "개인정보 제3자 제공 동의",
        },
        {
          agreed: form.consentMarketing,
          agreedAt: form.consentMarketing ? capturedAt : null,
          href: null,
          key: "marketing",
          required: false,
          title: "마케팅 정보 수신 동의",
        },
      ],
      marketingAgreed: form.consentMarketing,
      privacyCollectionAgreed: form.consentPrivacyCollection,
      termsAgreed: form.consentTerms,
      thirdPartyAgreed: form.consentThirdParty,
    };

    if (normalizedTemplate && hasTemplate) {
      return {
        blockAnswers: normalizedTemplate.blocks
          .filter(isQuestionBlock)
          .map((block) => ({
            id: block.id,
            label: block.label,
            type: block.type,
            value:
              dynamicAnswers[block.id] ??
              (block.type === "checkbox" || block.type === "fileAttachment"
                ? false
                : ""),
          })),
        companions: String(companionCount),
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
      companions: String(companionCount),
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

    const memo = buildMemo();

    try {
      const response = await fetch("/api/program-applications", {
        body: JSON.stringify({
          programId: program.id,
          formId: normalizedTemplate?.id,
          applicantName: form.applicantName,
          email: form.email,
          phone: form.phone,
          memo,
          answers: buildAnswers(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "신청서를 저장하지 못했어요.");
      }

      const payload = (await response.json()) as {
        data?: { id: string; submittedAt?: string };
      };
      if (!payload.data) {
        throw new Error("신청서 저장 결과를 확인하지 못했어요.");
      }

      setSubmittedApplication({
        id: payload.data.id,
        submittedAt: payload.data.submittedAt,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "잠깐 문제가 생겼어요. 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedApplication) {
    const displayCode = formatApplicationDisplayCode(
      submittedApplication.id,
      submittedApplication.submittedAt,
    );

    return (
      <section className="mx-auto max-w-[820px] px-4 py-8 md:px-8">
        <div className="rounded-[8px] border border-[#F5E1D3] bg-white px-[24px] py-[34px] text-center shadow-[0_16px_36px_rgba(91,58,41,0.08)]">
          <div className="mx-auto grid size-[44px] place-items-center rounded-full border border-[#FE701E] bg-[#FFF6EC] text-[#FE701E]">
            <CheckCircle2 aria-hidden="true" size={24} strokeWidth={2.4} />
          </div>
          <h1 className="mt-[18px] text-[24px] font-semibold leading-[1.35] text-[#5B3A29]">
            신청서가 접수됐어요
          </h1>
          <p className="mx-auto mt-[12px] max-w-[520px] text-[14px] font-normal leading-[1.65] text-[#6D7A8A]">
            접수번호{" "}
            <span className="font-mono font-semibold text-[#5B3A29]">
              {displayCode}
            </span>
            로 신청이 완료됐습니다. 선정 여부와 안내 메시지는 마이페이지에서
            확인할 수 있어요.
          </p>
          {submitError ? (
            <p className="mx-auto mt-[14px] max-w-[520px] rounded-[4px] border border-[#F5E1D3] bg-[#FFF6EC] px-[12px] py-[10px] text-[13px] font-semibold leading-[1.55] text-[#FE701E]">
              {submitError}
            </p>
          ) : null}
          <div className="mx-auto mt-[26px] grid max-w-[560px] gap-[8px] sm:grid-cols-2">
            <Link
              className="inline-flex h-[44px] items-center justify-center rounded-[4px] bg-[#FE701E] px-[18px] text-[14px] font-semibold text-white"
              href="/mypage"
            >
              내 여행 프로그램 보기
            </Link>
            <Link
              className="inline-flex h-[44px] items-center justify-center rounded-[4px] border border-[#E8E7E2] bg-white px-[18px] text-[14px] font-semibold text-[#5B3A29]"
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
    <section className="mx-auto max-w-[820px] px-4 py-8 md:px-8">
      <form
        className="rounded-[2px] border border-[#6D7A8A] bg-[#F9F9F9] px-[24px] py-[18px]"
        onSubmit={submitApplication}
      >
        <ApplicationDocumentHeader program={program} />

        <h1 className="mt-[24px] text-[16px] font-semibold leading-[1.35] text-[#5B3A29]">
          {normalizedTemplate?.name || `${program.title} 신청서`}
        </h1>
        <p className="mt-[20px] text-[14px] font-normal leading-[1.65] text-[#6D7A8A]">
          {normalizedTemplate?.description ||
            "기본 연락처와 호스트가 설정한 신청 질문을 함께 제출합니다."}
        </p>
        <hr className="mt-[22px] border-[#FE701E]" />

        <div className="flex flex-col">
          <div className="border-b border-dashed border-[#F3D7C4] py-[18px]">
            <h2 className="text-[14px] font-semibold leading-[1.45] text-[#5B3A29]">
              신청자 정보
            </h2>
            <div className="mt-[14px] grid gap-[14px]">
              <Field label="이름" required>
                <input
                  className={applicationInputClassName}
                  onChange={(event) => updateField("applicantName", event.target.value)}
                  required
                  value={form.applicantName}
                />
              </Field>
              <div className="grid gap-[14px] sm:grid-cols-2">
                <Field label="이메일" required>
                  <input
                    className={applicationInputClassName}
                    onChange={(event) => updateField("email", event.target.value)}
                    required
                    type="email"
                    value={form.email}
                  />
                </Field>
                <Field label="연락처" required>
                  <input
                    className={applicationInputClassName}
                    onChange={(event) => updateField("phone", event.target.value)}
                    required
                    value={form.phone}
                  />
                </Field>
              </div>
              <Field label="참여 인원">
                <div className="flex h-[34px] w-full items-center justify-between rounded-[4px] border border-[#FF9A3D] bg-white px-[12px] text-[#5B3A29]">
                  <span className="text-[12px] font-normal leading-[1.253]">
                    {companionCount}명
                  </span>
                  <ProgramQuantityControl
                    max={99}
                    min={1}
                    onChange={(value) => updateField("companions", String(value))}
                    value={companionCount}
                  />
                </div>
              </Field>
            </div>
          </div>

          {hasTemplate && normalizedTemplate ? (
            visibleBlocks.map((block) => (
              <DynamicBlock
                block={block}
                key={block.id}
                onChange={(value) => updateDynamicAnswer(block.id, value)}
                value={dynamicAnswers[block.id]}
              />
            ))
          ) : (
            <>
              <FieldBlock label="참여 동기" required>
                <textarea
                  className={applicationTextareaClassName}
                  onChange={(event) => updateField("motivation", event.target.value)}
                  required
                  value={form.motivation}
                />
              </FieldBlock>
              <FieldBlock label="워케이션/체류 중 필요한 운영 지원">
                <textarea
                  className={applicationTextareaClassName}
                  onChange={(event) => updateField("workStyle", event.target.value)}
                  value={form.workStyle}
                />
              </FieldBlock>
              <FieldBlock label="영수증/체류 내역 제출 예정 방식">
                <textarea
                  className={applicationTextareaClassName}
                  onChange={(event) => updateField("receiptPlan", event.target.value)}
                  value={form.receiptPlan}
                />
              </FieldBlock>
            </>
          )}

          <div className="border-b border-dashed border-[#F3D7C4] py-[18px] text-[13px] font-normal leading-[1.65] text-[#5B3A29]">
            <div className="flex items-start gap-[10px]">
              <input
                checked={allLegalConsentsAccepted}
                className="mt-[4px] size-[14px] accent-[#FE701E]"
                id="application-consent-all"
                onChange={(event) => updateAllLegalConsents(event.target.checked)}
                type="checkbox"
              />
              <label
                className="font-semibold"
                htmlFor="application-consent-all"
              >
                전체 동의
              </label>
            </div>
            <div className="mt-[12px] grid gap-[10px] pl-[24px]">
              <LegalConsentRow
                checked={form.consentTerms}
                href="/terms"
                id="application-consent-terms"
                label="이용약관 동의"
                onChange={(checked) => updateLegalConsent("consentTerms", checked)}
                required
              />
              <LegalConsentRow
                checked={form.consentPrivacyCollection}
                href="/privacy"
                id="application-consent-privacy"
                label="개인정보 수집 및 이용 동의"
                onChange={(checked) =>
                  updateLegalConsent("consentPrivacyCollection", checked)
                }
                required
              />
              <LegalConsentRow
                checked={form.consentThirdParty}
                href="/privacy/third-party"
                id="application-consent-third-party"
                label="개인정보 제3자 제공 동의"
                onChange={(checked) =>
                  updateLegalConsent("consentThirdParty", checked)
                }
                required
              />
              <LegalConsentRow
                checked={form.consentMarketing}
                description="프로그램 추천, 이벤트, 혜택 안내 등 마케팅 정보를 받을 수 있습니다."
                id="application-consent-marketing"
                label="마케팅 정보 수신 동의"
                onChange={(checked) =>
                  updateLegalConsent("consentMarketing", checked)
                }
              />
            </div>
          </div>

          {submitError ? (
            <p className="mt-[18px] rounded-[4px] border border-[#FE701E] bg-white px-[12px] py-[10px] text-[13px] font-semibold leading-[1.55] text-[#FE701E]">
              {submitError}
            </p>
          ) : null}

          <div className="mt-[24px] flex justify-end">
            <button
              className="inline-flex h-[42px] min-w-[132px] items-center justify-center rounded-[4px] bg-[#5B3A29] px-[20px] text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "제출 중" : "신청하기"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function ApplicationDocumentHeader({ program }: { program: Program }) {
  const displayProgramTitle = formatProgramDisplayName(program.title, program.id);

  return (
    <div className="border-b border-[#FE701E] pb-[22px]">
      <div className="grid grid-cols-[118px_minmax(0,1fr)_94px_94px] gap-x-[16px] max-sm:grid-cols-[92px_minmax(0,1fr)] max-sm:gap-y-[14px]">
        <div className="h-[118px] w-[118px] overflow-hidden rounded-[16px] bg-[#D9D9D9] max-sm:h-[92px] max-sm:w-[92px]">
          {program.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              aria-hidden
              className="h-full w-full object-cover"
              src={program.image}
            />
          ) : null}
        </div>
        <div className="pt-[13px]">
          <h2 className="line-clamp-2 text-[20px] font-semibold leading-[1.32] text-[#5B3A29]">
            {displayProgramTitle}
          </h2>
          <p className="mt-[12px] text-[12px] font-normal leading-[1.55] text-[#6D7A8A]">
            {program.region} {program.city}
          </p>
          <p className="mt-[8px] text-[12px] font-normal leading-[1.55] text-[#6D7A8A]">
            {program.sourceName || "호스트명"}
          </p>
        </div>
        <div className="pt-[20px] max-sm:col-start-1 max-sm:pt-0">
          <ApplicationDateSummary label="시작일" value={program.activityStart} />
        </div>
        <div className="pt-[20px] max-sm:pt-0">
          <ApplicationDateSummary label="종료일" value={program.activityEnd} />
        </div>
      </div>
    </div>
  );
}

function ApplicationDateSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      <p className="text-[12px] font-normal leading-[1.45] text-[#6D7A8A]">
        {label}
      </p>
      <p className="whitespace-nowrap text-[12px] font-semibold leading-[1.35] text-[#6D7A8A]">
        {formatApplicationDate(value)}
      </p>
    </div>
  );
}

function DynamicBlock({
  block,
  onChange,
  value,
}: {
  block: ApplicationFormBlock;
  onChange: (value: DynamicAnswer) => void;
  value?: DynamicAnswer;
}) {
  if (block.type === "title") {
    return (
      <div className="border-b border-dashed border-[#F3D7C4] py-[18px]">
        <h3 className="text-[14px] font-semibold leading-[1.45] text-[#5B3A29]">
          {block.label}
        </h3>
      </div>
    );
  }

  if (block.type === "description") {
    return (
      <div className="border-b border-dashed border-[#F3D7C4] py-[18px]">
        <h3 className="text-[14px] font-semibold leading-[1.45] text-[#5B3A29]">
          {block.label}
        </h3>
        <p className="mt-[12px] whitespace-pre-wrap px-[14px] text-[12px] font-normal leading-[1.75] text-[#6D7A8A]">
          {block.body || block.helper || block.label}
        </p>
      </div>
    );
  }

  if (block.type === "divider") {
    return <hr className="my-[18px] border-dashed border-[#F3D7C4]" />;
  }

  if (block.type === "image") {
    if (!block.imageUrl) return null;

    return (
      <figure
        className="border-b border-dashed border-[#F3D7C4] py-[18px]"
        style={{ width: `${block.imageWidth ?? 100}%` }}
      >
        <figcaption className="mb-[14px] text-[14px] font-semibold leading-[1.45] text-[#5B3A29]">
          {block.label}
        </figcaption>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={block.imageAlt || block.label}
          className="max-h-[360px] w-full rounded-[4px] border border-[#F7B267] bg-white object-contain"
          src={block.imageUrl}
        />
        {block.helper ? (
          <p className="mt-[10px] text-[12px] font-normal leading-[1.65] text-[#6D7A8A]">
            {block.helper}
          </p>
        ) : null}
      </figure>
    );
  }

  if (block.type === "fileRequest") {
    const fileAnswer = isFileAnswer(value) ? value : undefined;

    return (
      <FieldBlock label={block.label} required={block.required}>
        {block.body || block.helper ? (
          <p className="px-[14px] text-[12px] font-normal leading-[1.65] text-[#6D7A8A]">
            &lt;{block.body || block.helper}&gt;
          </p>
        ) : null}
        <div className="px-[14px]">
          <span className="inline-flex h-[52px] w-[64px] cursor-pointer flex-col items-center justify-center gap-[4px] rounded-[6px] border border-[#F7B267] bg-white text-[10px] font-medium leading-[1.253] text-[#AEB8C2] transition hover:border-[#FE701E] hover:text-[#FE701E]">
            파일 업로드
            <Upload aria-hidden="true" className="text-[#FF9A3D]" size={18} />
            <input
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                onChange({
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type || "application/octet-stream",
                });
              }}
              required={block.required && !fileAnswer}
              type="file"
            />
          </span>
        </div>
        {fileAnswer ? (
          <div className="mx-[14px] flex min-h-[34px] items-center gap-[8px] rounded-[4px] border border-[#F3D7C4] bg-[#FFF7EF] px-[10px] py-[8px] text-[12px] font-medium leading-[1.4] text-[#5B3A29]">
            <FileText aria-hidden="true" className="shrink-0 text-[#FE701E]" size={16} />
            <span className="min-w-0 flex-1 truncate">{fileAnswer.fileName}</span>
            <span className="shrink-0 text-[#8A94A3]">
              {formatFileSize(fileAnswer.fileSize)}
            </span>
          </div>
        ) : null}
      </FieldBlock>
    );
  }

  if (block.type === "fileAttachment") {
    const checked = Boolean(value);

    return (
      <div className="border-b border-dashed border-[#F3D7C4] py-[18px]">
        <p className="text-[14px] font-semibold leading-[1.45] text-[#5B3A29]">
          {block.label}
          {block.required ? <span className="ml-[8px] text-[12px] text-[#FE701E]">*필수항목</span> : null}
        </p>
        {block.body || block.helper ? (
          <p className="mt-[12px] px-[14px] text-[12px] font-normal leading-[1.65] text-[#6D7A8A]">
            &lt;{block.body || block.helper}&gt;
          </p>
        ) : null}
        <div className="mt-[14px] px-[14px]">
          <ApplicationAttachmentCard block={block} />
        </div>
        <label className="mt-[14px] inline-flex items-center gap-[8px] px-[14px] text-[14px] font-normal leading-[1.35] text-[#5B3A29]">
          <input
            checked={checked}
            className="size-[14px] accent-[#FE701E]"
            onChange={(event) => onChange(event.target.checked)}
            required={block.required}
            type="checkbox"
          />
          확인 완료
        </label>
      </div>
    );
  }

  if (block.type === "pageBreak") {
    return null;
  }

  if (block.type === "checkbox") {
    return (
      <div className="border-b border-dashed border-[#F3D7C4] py-[18px]">
        <p className="text-[14px] font-semibold leading-[1.45] text-[#5B3A29]">
          {block.label}
          {block.required ? <span className="ml-[8px] text-[12px] text-[#FE701E]">*필수항목</span> : null}
        </p>
        <label className="mt-[16px] flex items-start gap-[8px] px-[14px] text-[13px] font-normal leading-[1.65] text-[#5B3A29]">
          <input
            checked={Boolean(value)}
            className="mt-[4px] size-[14px] accent-[#FE701E]"
            onChange={(event) => onChange(event.target.checked)}
            required={block.required}
            type="checkbox"
          />
          <span>
            동의함
          {block.helper ? (
            <span className="mt-[4px] block text-[12px] font-normal leading-[1.6] text-[#6D7A8A]">
              {block.helper}
            </span>
          ) : null}
          </span>
        </label>
      </div>
    );
  }

  return (
    <FieldBlock label={block.label} required={block.required}>
      {block.type === "longText" ? (
        <textarea
          className={applicationTextareaClassName}
          onChange={(event) => onChange(event.target.value)}
          required={block.required}
          value={typeof value === "string" ? value : ""}
        />
      ) : null}
      {block.type === "singleSelect" ? (
        <div className="relative">
          <select
            className={`${applicationInputClassName} appearance-none pr-[36px]`}
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
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 rounded-full bg-[#FF9A3D] text-white"
            size={18}
            strokeWidth={2.2}
          />
        </div>
      ) : null}
      {block.type === "multiSelect" ? (
        <div className="grid max-w-[420px] grid-cols-2 gap-x-[48px] gap-y-[12px] px-[14px]">
          {(block.options ?? []).map((option) => {
            const selectedValues = Array.isArray(value) ? value : [];
            return (
              <label
                className="flex h-[20px] items-center gap-[8px] whitespace-nowrap text-[14px] font-normal leading-[1.35] text-[#5B3A29]"
                key={option}
              >
                <input
                  checked={selectedValues.includes(option)}
                  className="size-[14px] accent-[#FE701E]"
                  onChange={(event) => {
                    const nextValues = event.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((item) => item !== option);
                    onChange(nextValues);
                  }}
                  type="checkbox"
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      ) : null}
      {["shortText", "email", "phone", "date"].includes(block.type) ? (
        <input
          className={applicationInputClassName}
          onChange={(event) => onChange(event.target.value)}
          required={block.required}
          type={block.type === "date" ? "date" : block.type === "email" ? "email" : "text"}
          value={typeof value === "string" ? value : ""}
        />
      ) : null}
      {block.helper ? (
        <span className="text-[12px] font-normal leading-[1.65] text-[#6D7A8A]">
          {block.helper}
        </span>
      ) : null}
    </FieldBlock>
  );
}

function LegalConsentRow({
  checked,
  description,
  href,
  id,
  label,
  onChange,
  required,
}: {
  checked: boolean;
  description?: string;
  href?: string;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
  required?: boolean;
}) {
  return (
    <div className="flex items-start gap-[10px]">
      <input
        checked={checked}
        className="mt-[4px] size-[14px] accent-[#FE701E]"
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        required={required}
        type="checkbox"
      />
      <div className="min-w-0">
        <label className="font-semibold" htmlFor={id}>
          {label}
          <span className="ml-[6px] text-[12px] text-[#FE701E]">
            {required ? "*필수항목" : "선택"}
          </span>
        </label>
        {href ? (
          <Link
            className="ml-[10px] text-[12px] font-semibold text-[#FE701E]"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            보기
          </Link>
        ) : null}
        {description ? (
          <p className="mt-[4px] text-[12px] font-normal leading-[1.6] text-[#6D7A8A]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
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
  answer: DynamicAnswer | undefined,
  branchValue: string,
): boolean {
  if (Array.isArray(answer)) return answer.includes(branchValue);
  if (typeof answer === "boolean") return String(answer) === branchValue;
  if (answer && typeof answer === "object") return false;
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
    <label className="grid gap-[8px]">
      <span className="text-[13px] font-semibold leading-[1.45] text-[#5B3A29]">
        {label}
        {required ? <span className="ml-[6px] text-[12px] text-[#FE701E]">*필수항목</span> : null}
      </span>
      {children}
    </label>
  );
}

function FieldBlock({
  children,
  label,
  required,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="border-b border-dashed border-[#F3D7C4] py-[18px]">
      <label className="grid gap-[14px]">
        <span className="text-[14px] font-semibold leading-[1.45] text-[#5B3A29]">
          {label}
          {required ? <span className="ml-[8px] text-[12px] text-[#FE701E]">*필수항목</span> : null}
        </span>
        {children}
      </label>
    </div>
  );
}

function ApplicationAttachmentCard({
  block,
}: {
  block: ApplicationFormBlock;
}) {
  const fileUrl = block.fileUrl?.trim();
  const fileName = block.fileName?.trim() || block.imageAlt?.trim() || "첨부 파일";
  const isImageAttachment = Boolean(
    fileUrl && /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(fileUrl),
  );

  if (fileUrl && isImageAttachment) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={fileName}
        className="h-[188px] w-[320px] max-w-full rounded-[2px] bg-[#D9D9D9] object-cover"
        src={fileUrl}
      />
    );
  }

  return (
    <div className="flex h-[188px] w-[320px] max-w-full flex-col items-center justify-center gap-[10px] rounded-[2px] bg-[#D9D9D9] px-[18px] text-center text-[12px] font-medium leading-[1.45] text-[#6D7A8A]">
      <FileText aria-hidden="true" size={28} strokeWidth={1.8} />
      <span className="line-clamp-2">{fileName}</span>
      {fileUrl ? <span className="text-[11px] text-[#8A94A3]">다운로드 가능한 파일</span> : null}
    </div>
  );
}

function isFileAnswer(value: unknown): value is FileAnswer {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const answer = value as Partial<FileAnswer>;
  return typeof answer.fileName === "string" && typeof answer.fileSize === "number";
}

function formatFileSize(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024)).toLocaleString("ko-KR")} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatApplicationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0000년 00월 00일";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}년 ${month}월 ${day}일`;
}

function parseQuantityParam(value: string | null): number | null {
  if (!value) return null;

  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return null;

  const nextQuantity = Math.trunc(quantity);
  if (nextQuantity < 1) return null;

  return Math.min(99, nextQuantity);
}

function getCompanionCount(value: string): number {
  const quantity = Number(value.replace(/[^\d]/g, ""));
  if (!Number.isFinite(quantity) || quantity < 1) return 1;
  return Math.min(99, Math.trunc(quantity));
}
