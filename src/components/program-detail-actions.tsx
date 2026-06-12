"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";

type ProgramStateMaps = {
  alerts?: Record<string, boolean>;
  bookmarks?: Record<string, boolean>;
  tracks?: Record<string, boolean>;
};

type InquiryFormState = {
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  message: string;
  title: string;
};

const emptyInquiryForm: InquiryFormState = {
  contactEmail: "",
  contactName: "",
  contactPhone: "",
  message: "",
  title: "",
};

export function ProgramDetailActions({
  programId,
  title,
}: {
  programId: number | string;
  title: string;
}) {
  const id = String(programId);
  const [bookmarked, setBookmarked] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryForm, setInquiryForm] = useState<InquiryFormState>({
    ...emptyInquiryForm,
    title: `${title} 문의`,
  });
  const [inquiryStatus, setInquiryStatus] = useState<{
    message: string;
    type: "error" | "success";
  } | null>(null);
  const [inquirySubmitting, setInquirySubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadBookmarkState() {
      try {
        const response = await fetch("/api/me/program-state", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: ProgramStateMaps;
        };
        if (active) setBookmarked(Boolean(payload.data?.bookmarks?.[id]));
      } catch {
        // Signed-out users can still browse and share programs.
      }
    }

    void loadBookmarkState();

    return () => {
      active = false;
    };
  }, [id]);

  async function toggleBookmark() {
    if (pending) return;

    const nextBookmarked = !bookmarked;
    setBookmarked(nextBookmarked);
    setPending(true);
    setStatus(nextBookmarked ? "저장했습니다." : "저장을 취소했습니다.");

    try {
      const response = await fetch("/api/me/program-state", {
        body: JSON.stringify({
          enabled: nextBookmarked,
          kind: "bookmarked",
          programId: id,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(
          window.location.pathname,
        )}`;
        return;
      }

      const payload = (await response.json()) as {
        data?: ProgramStateMaps;
      };

      if (!response.ok || !payload.data) throw new Error("Save failed.");

      setBookmarked(Boolean(payload.data.bookmarks?.[id]));
    } catch {
      setBookmarked(bookmarked);
      setStatus("저장 상태를 변경하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function shareProgram() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setStatus("공유 창을 열었습니다.");
        return;
      }

      await navigator.clipboard.writeText(url);
      setStatus("공유 링크를 복사했습니다.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("공유 링크를 복사하지 못했습니다.");
    }
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInquiryStatus(null);

    const payload = {
      contactEmail: inquiryForm.contactEmail.trim(),
      contactName: inquiryForm.contactName.trim(),
      contactPhone: inquiryForm.contactPhone.trim(),
      message: inquiryForm.message.trim(),
      programId: id,
      programTitle: title,
      source: "program-detail",
      title: inquiryForm.title.trim() || `${title} 문의`,
    };

    if (!payload.contactName || !payload.contactEmail || !payload.message) {
      setInquiryStatus({
        message: "이름, 이메일, 문의 내용을 입력해 주세요.",
        type: "error",
      });
      return;
    }

    setInquirySubmitting(true);
    try {
      const response = await fetch("/api/program-inquiries", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const responsePayload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(responsePayload.error || "문의 접수에 실패했습니다.");
      }

      setInquiryForm({
        ...emptyInquiryForm,
        title: `${title} 문의`,
      });
      setInquiryStatus({
        message: "문의가 접수되었습니다. 프로그램 관리자가 메시지함에서 확인할 수 있습니다.",
        type: "success",
      });
      setStatus("문의가 접수되었습니다.");
    } catch (error) {
      setInquiryStatus({
        message:
          error instanceof Error
            ? error.message
            : "문의 접수에 실패했습니다.",
        type: "error",
      });
    } finally {
      setInquirySubmitting(false);
    }
  }

  return (
    <>
      <div className="flex w-[99px] items-center justify-between text-[#CAC4BC]">
        <button
          aria-label="공유하기"
          className="inline-flex size-[21px] items-center justify-center border-0 bg-transparent p-0"
          onClick={() => void shareProgram()}
          type="button"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="size-5"
            height={21}
            src={nuvioIcons.share}
            width={21}
          />
        </button>
        <button
          aria-label={bookmarked ? "저장 취소" : "저장하기"}
          aria-pressed={bookmarked}
          className="inline-flex size-[21px] items-center justify-center border-0 bg-transparent p-0 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          onClick={() => void toggleBookmark()}
          type="button"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="h-5 w-[17px]"
            height={20}
            src={bookmarked ? nuvioIcons.bookmarkFilled : nuvioIcons.bookmark}
            width={17}
          />
        </button>
        <button
          aria-label="프로그램 관리자에게 메시지 보내기"
          className="inline-flex size-[21px] items-center justify-center border-0 bg-transparent p-0"
          onClick={() => {
            setInquiryOpen(true);
            setInquiryStatus(null);
          }}
          type="button"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="size-5"
            height={21}
            src={nuvioIcons.mail}
            width={21}
          />
        </button>
        <span aria-live="polite" className="sr-only">
          {status}
        </span>
      </div>

      {inquiryOpen ? (
        <div
          aria-labelledby="program-inquiry-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4 py-6"
          role="dialog"
        >
          <button
            aria-label="문의 모달 닫기"
            className="absolute inset-0 cursor-default"
            onClick={() => setInquiryOpen(false)}
            type="button"
          />
          <form
            className="relative grid w-full max-w-[480px] gap-4 rounded-[8px] border border-[#F5E1D3] bg-white p-6 text-[#2B1E17] shadow-[0_24px_80px_rgba(43,30,23,0.2)]"
            onSubmit={(event) => void submitInquiry(event)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#FE701E]">
                  Message
                </p>
                <h2
                  className="text-xl font-semibold leading-[1.35]"
                  id="program-inquiry-title"
                >
                  프로그램 관리자에게 문의
                </h2>
                <p className="break-keep text-sm leading-[1.6] text-[#6D7A8A]">
                  {title} 담당자에게 전달할 메시지를 남겨주세요.
                </p>
              </div>
              <button
                aria-label="닫기"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-[#F5E1D3] text-lg leading-none text-[#6D7A8A]"
                onClick={() => setInquiryOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            {inquiryStatus ? (
              <p
                className={`rounded-[6px] px-3 py-2 text-sm font-semibold ${
                  inquiryStatus.type === "success"
                    ? "bg-[#F2FAF6] text-[#137B54]"
                    : "bg-[#FFF6EC] text-[#C75300]"
                }`}
                role="status"
              >
                {inquiryStatus.message}
              </p>
            ) : null}

            <label className="grid gap-2 text-sm font-semibold">
              이름
              <input
                className="h-11 rounded-[6px] border border-[#E5D7CD] px-3 text-sm font-medium outline-none transition focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/10"
                maxLength={50}
                onChange={(event) =>
                  setInquiryForm((current) => ({
                    ...current,
                    contactName: event.target.value,
                  }))
                }
                placeholder="이름을 입력해 주세요"
                required
                value={inquiryForm.contactName}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                이메일
                <input
                  className="h-11 rounded-[6px] border border-[#E5D7CD] px-3 text-sm font-medium outline-none transition focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/10"
                  maxLength={120}
                  onChange={(event) =>
                    setInquiryForm((current) => ({
                      ...current,
                      contactEmail: event.target.value,
                    }))
                  }
                  placeholder="hello@example.com"
                  required
                  type="email"
                  value={inquiryForm.contactEmail}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                연락처
                <input
                  className="h-11 rounded-[6px] border border-[#E5D7CD] px-3 text-sm font-medium outline-none transition focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/10"
                  inputMode="tel"
                  maxLength={30}
                  onChange={(event) =>
                    setInquiryForm((current) => ({
                      ...current,
                      contactPhone: event.target.value,
                    }))
                  }
                  placeholder="010-0000-0000"
                  value={inquiryForm.contactPhone}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-semibold">
              제목
              <input
                className="h-11 rounded-[6px] border border-[#E5D7CD] px-3 text-sm font-medium outline-none transition focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/10"
                maxLength={120}
                onChange={(event) =>
                  setInquiryForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                value={inquiryForm.title}
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              문의 내용
              <textarea
                className="min-h-[132px] resize-y rounded-[6px] border border-[#E5D7CD] px-3 py-3 text-sm font-medium leading-relaxed outline-none transition focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/10"
                maxLength={2000}
                onChange={(event) =>
                  setInquiryForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                placeholder="궁금한 내용을 적어주세요."
                required
                value={inquiryForm.message}
              />
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                className="h-10 rounded-[6px] border border-[#E5D7CD] px-4 text-sm font-semibold text-[#6D7A8A]"
                onClick={() => setInquiryOpen(false)}
                type="button"
              >
                취소
              </button>
              <button
                className="h-10 rounded-[6px] bg-[#2B1E17] px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                disabled={inquirySubmitting}
                type="submit"
              >
                {inquirySubmitting ? "전송 중" : "메시지 보내기"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
