"use client";

import Image from "next/image";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  SUPPORT_INQUIRY_TYPES,
  type SupportInquiryType,
} from "@/lib/support-inquiries";

const MESSAGE_MAX_LENGTH = 2000;

const fieldClassName =
  "h-11 w-full rounded-[6px] border border-[#dccfc7] bg-white px-3 text-base font-medium text-[#4B3328] outline-none transition placeholder:text-[#b8aaa2] focus:border-[#fe701e] focus:ring-2 focus:ring-[#fe701e]/10 min-[1100px]:h-[42px] min-[1100px]:text-[13px]";

type SupportContactInitialValues = {
  email: string;
  name: string;
  phone: string;
};

type SupportContactFormProps = {
  initialValues: SupportContactInitialValues;
};

type SupportFormState = {
  email: string;
  inquiryType: SupportInquiryType | "";
  message: string;
  name: string;
  phone: string;
};

type SubmitState =
  | {
      message: string;
      type: "error" | "success";
    }
  | null;

export function SupportContactForm({
  initialValues,
}: SupportContactFormProps) {
  const [form, setForm] = useState<SupportFormState>({
    email: "",
    inquiryType: "",
    message: "",
    name: "",
    phone: "",
  });
  const [touched, setTouched] = useState({
    email: false,
    name: false,
    phone: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>(null);
  const visibleForm = {
    ...form,
    email: touched.email ? form.email : initialValues.email || form.email,
    name: touched.name ? form.name : initialValues.name || form.name,
    phone: touched.phone ? form.phone : initialValues.phone || form.phone,
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState(null);

    const trimmedForm = {
      email: visibleForm.email.trim(),
      inquiryType: form.inquiryType,
      message: form.message.trim(),
      name: visibleForm.name.trim(),
      phone: visibleForm.phone.trim(),
    };

    if (!trimmedForm.inquiryType) {
      setSubmitState({ message: "문의 유형을 선택해 주세요.", type: "error" });
      return;
    }

    if (!trimmedForm.name || !trimmedForm.email || !trimmedForm.message) {
      setSubmitState({
        message: "이름, 이메일, 문의 내용을 모두 입력해 주세요.",
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/support", {
        body: JSON.stringify(trimmedForm),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "문의 접수에 실패했어요.");
      }

      setForm((current) => ({
        ...current,
        inquiryType: "",
        message: "",
      }));
      setSubmitState({
        message: "문의가 접수되었어요. 확인 후 연락드릴게요.",
        type: "success",
      });
    } catch (error) {
      setSubmitState({
        message:
          error instanceof Error
            ? error.message
            : "문의 접수에 실패했어요. 잠시 후 다시 시도해 주세요.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="mt-6 max-w-[720px] rounded-[8px] border border-[#f1ded3] bg-white px-5 py-6 shadow-[0_10px_30px_rgba(75,51,40,0.06)] sm:px-7 sm:py-7"
      onSubmit={handleSubmit}
    >
      {submitState ? (
        <div
          className={`mb-5 flex items-center gap-2 rounded-[6px] border px-3 py-3 text-[13px] font-semibold ${
            submitState.type === "success"
              ? "border-[#d9e6c8] bg-[#f6fbef] text-[#657b46]"
              : "border-[#ffd7c0] bg-[#fff7f1] text-[#d95e16]"
          }`}
          role="status"
        >
          {submitState.type === "success" ? (
            <CheckCircle2 size={16} strokeWidth={2} />
          ) : (
            <AlertCircle size={16} strokeWidth={2} />
          )}
          {submitState.message}
        </div>
      ) : null}

      <div className="grid gap-5">
        <label className="grid gap-2 text-[13px] font-semibold text-[#2f2019]">
          <span>
            문의 유형 <span className="text-[#fe701e]">*</span>
          </span>
          <span className="relative block">
            <select
              className={`${fieldClassName} appearance-none pr-10 text-[#6B5145]`}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  inquiryType: event.target.value as SupportFormState["inquiryType"],
                }))
              }
              required
              value={form.inquiryType}
            >
              <option value="">선택해 주세요</option>
              {SUPPORT_INQUIRY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8F7A6C]"
              size={16}
              strokeWidth={1.8}
            />
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-[13px] font-semibold text-[#2f2019]">
            <span>
              이름 <span className="text-[#fe701e]">*</span>
            </span>
            <input
              className={fieldClassName}
              maxLength={50}
              onChange={(event) => {
                setTouched((current) => ({ ...current, name: true }));
                setForm((current) => ({ ...current, name: event.target.value }));
              }}
              placeholder="이름을 입력해 주세요"
              required
              value={visibleForm.name}
            />
          </label>
          <label className="grid gap-2 text-[13px] font-semibold text-[#2f2019]">
            전화번호
            <input
              className={fieldClassName}
              inputMode="tel"
              maxLength={30}
              onChange={(event) => {
                setTouched((current) => ({ ...current, phone: true }));
                setForm((current) => ({ ...current, phone: event.target.value }));
              }}
              placeholder="010-0000-0000"
              value={visibleForm.phone}
            />
          </label>
        </div>

        <label className="grid gap-2 text-[13px] font-semibold text-[#2f2019]">
          <span>
            이메일 <span className="text-[#fe701e]">*</span>
          </span>
          <input
            className={fieldClassName}
            inputMode="email"
            maxLength={120}
            onChange={(event) => {
              setTouched((current) => ({ ...current, email: true }));
              setForm((current) => ({ ...current, email: event.target.value }));
            }}
            placeholder="hello@nuvio.kr"
            required
            type="email"
            value={visibleForm.email}
          />
        </label>

        <label className="grid gap-2 text-[13px] font-semibold text-[#2f2019]">
          <span>
            문의 내용 <span className="text-[#fe701e]">*</span>
          </span>
          <span className="relative block">
            <textarea
              className="min-h-[116px] w-full resize-y rounded-[6px] border border-[#dccfc7] bg-white px-3 py-3 text-base font-medium leading-relaxed text-[#4B3328] outline-none transition placeholder:text-[#b8aaa2] focus:border-[#fe701e] focus:ring-2 focus:ring-[#fe701e]/10 min-[1100px]:text-[13px]"
              maxLength={MESSAGE_MAX_LENGTH}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              placeholder="문의 내용을 적어주세요."
              required
              value={form.message}
            />
            <span className="absolute bottom-3 right-3 rounded bg-white/90 px-1 text-[11px] font-medium text-[#8F7A6C]">
              {form.message.length}/{MESSAGE_MAX_LENGTH}
            </span>
          </span>
        </label>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-[12px] font-medium leading-[1.65] text-[#8F7A6C]">
          <Image
            alt=""
            aria-hidden="true"
            className="mt-[2px] h-[15px] w-[16px] shrink-0"
            height={15}
            src="/icons/nuvio/mail.svg"
            width={16}
          />
          <div>
            <p>보통 영업일 기준 1~2일 안에 답변드려요.</p>
            <p>문의에 대한 답변은 기입해주신 이메일로 전달드립니다.</p>
          </div>
        </div>
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[5px] bg-[#fe701e] px-5 text-[14px] font-semibold text-white transition hover:bg-[#ef6111] disabled:cursor-not-allowed disabled:bg-[#f7b37f] sm:w-auto"
          disabled={submitting}
          type="submit"
        >
          {submitting ? (
            <Loader2
              aria-hidden="true"
              className="animate-spin"
              size={16}
              strokeWidth={2}
            />
          ) : null}
          문의 보내기
          <ArrowRight size={16} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
