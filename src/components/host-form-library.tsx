"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  cloneApplicationFormTemplate,
  createEmptyTemplate,
  mergeApplicationFormTemplates,
  normalizeApplicationFormTemplateShape,
} from "@/lib/application-form-builder";
import type {
  ApplicationFormKind,
  ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import {
  HostSmallButton,
  HostWorkspaceContent,
  HostWorkspaceLayout,
} from "@/components/host-workspace-ui";

export function HostFormLibrary({
  initialKind = "application",
}: {
  initialKind?: ApplicationFormKind;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<ApplicationFormTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const applicationForms = useMemo(
    () => templates.filter((template) => template.formKind === "application"),
    [templates],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseTemplates() {
      try {
        const response = await fetch(
          `/api/host/forms?kind=${encodeURIComponent(initialKind)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: ApplicationFormTemplate[];
        };
        const databaseTemplates = Array.isArray(payload.data)
          ? payload.data.map(normalizeApplicationFormTemplateShape)
          : [];

        if (!isMounted) return;
        setTemplates((currentTemplates) =>
          mergeApplicationFormTemplates(databaseTemplates, currentTemplates),
        );
      } catch {
        if (isMounted) setTemplates([]);
      }
    }

    void loadDatabaseTemplates();

    return () => {
      isMounted = false;
    };
  }, [initialKind]);

  async function createForm() {
    if (isCreating) return;

    setIsCreating(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/host/forms", {
        body: JSON.stringify({
          ...createEmptyTemplate("application"),
          name: "새 신청서",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ApplicationFormTemplate;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "신청서 양식을 만들지 못했습니다.");
      }

      const savedTemplate = normalizeApplicationFormTemplateShape(payload.data);
      setTemplates((currentTemplates) =>
        mergeApplicationFormTemplates([savedTemplate], currentTemplates),
      );
      router.push(`/host/forms/${encodeURIComponent(savedTemplate.id)}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function duplicateForm(template: ApplicationFormTemplate) {
    setPendingId(template.id);
    setFeedback(null);

    try {
      const copiedTemplate = cloneApplicationFormTemplate(template, {
        formKind: "application",
        name: `${template.name || "새 신청서"} 복사본`,
      });
      const response = await fetch("/api/host/forms", {
        body: JSON.stringify(copiedTemplate),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ApplicationFormTemplate;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "신청서 양식을 복제하지 못했습니다.");
      }

      const savedTemplate = normalizeApplicationFormTemplateShape(payload.data);
      setTemplates((currentTemplates) =>
        mergeApplicationFormTemplates([savedTemplate], currentTemplates),
      );
    } finally {
      setPendingId(null);
    }
  }

  async function deleteForm(template: ApplicationFormTemplate) {
    const linkedProgramName =
      template.programTitle.trim() || (template.programId ? "연결된 프로그램" : "");

    if (linkedProgramName) {
      setFeedback({
        message:
          "프로그램에 연결된 신청폼은 삭제할 수 없어요. 먼저 프로그램의 신청폼 연결을 해제하거나 다른 신청폼으로 교체해 주세요.",
        tone: "error",
      });
      return;
    }

    if (
      !window.confirm(
        "신청폼을 삭제할까요?\n삭제한 폼은 복구할 수 없고, 접수 이력이 있는 폼은 삭제되지 않습니다.",
      )
    ) {
      return;
    }

    setPendingId(template.id);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/host/forms/${encodeURIComponent(template.id)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "신청서 양식을 삭제하지 못했습니다.");
      }

      setTemplates((currentTemplates) =>
        currentTemplates.filter(
          (currentTemplate) => currentTemplate.id !== template.id,
        ),
      );
      setFeedback({
        message: "신청폼을 삭제했습니다.",
        tone: "success",
      });
    } catch (deleteError) {
      setFeedback({
        message:
          deleteError instanceof Error
            ? deleteError.message
            : "신청서 양식을 삭제하지 못했습니다.",
        tone: "error",
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <HostWorkspaceLayout>
      <HostWorkspaceContent insideFolder>
        <div className="pt-[var(--host-24)] max-md:pt-5">
          <div className="flex w-full flex-col items-start gap-[var(--host-46)] pr-[var(--host-52)] max-md:pr-0">
            <div className="flex h-[var(--host-29)] items-center gap-[14px]">
              <Link
                aria-label="뒤로"
                className="inline-flex h-[18px] w-[12px] items-center justify-center text-[#6D7A8A] hover:text-[#FE701E]"
                href="/host"
              >
                <ChevronLeft size={20} strokeWidth={1.8} />
              </Link>
              <h1 className="whitespace-nowrap text-[var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
                신청서 양식 관리 ({String(applicationForms.length).padStart(2, "0")})
              </h1>
              <HostSmallButton onClick={() => void createForm()}>
                {isCreating ? "생성중" : "새양식 +"}
              </HostSmallButton>
            </div>

            {feedback ? (
              <div
                className={`w-[var(--host-959)] max-w-full rounded-[4px] border px-[var(--host-16)] py-[var(--host-10)] text-[var(--host-13)] font-medium leading-[1.55] ${
                  feedback.tone === "error"
                    ? "border-[#FE701E] bg-[#FFF6EC] text-[#5B3A29]"
                    : "border-[#7A8B52] bg-[#F1F7ED] text-[#3E552C]"
                }`}
                role="status"
              >
                {feedback.message}
              </div>
            ) : null}

            <section className="flex w-[var(--host-959)] max-w-full flex-col gap-[var(--host-18)]">
              {applicationForms.length > 0 ? (
                applicationForms.map((template) => (
                  <FormRow
                    disabled={pendingId === template.id}
                    key={template.id}
                    onDelete={() => void deleteForm(template)}
                    onDuplicate={() => void duplicateForm(template)}
                    template={template}
                  />
                ))
              ) : (
                <div className="flex h-[var(--host-38)] w-full items-center rounded-[4px] border border-dashed border-[#6D7A8A] px-[var(--host-16)] text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
                  저장된 신청서 양식이 없습니다. 새양식 + 를 눌러 만들어 주세요.
                </div>
              )}
            </section>
          </div>
        </div>
      </HostWorkspaceContent>
    </HostWorkspaceLayout>
  );
}

function FormRow({
  disabled,
  onDelete,
  onDuplicate,
  template,
}: {
  disabled: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  template: ApplicationFormTemplate;
}) {
  const linkedProgramName =
    template.programTitle.trim() || (template.programId ? "연결된 프로그램" : "");

  return (
    <div className="flex h-[var(--host-38)] w-full items-center gap-[12px] rounded-[4px] border border-[#6D7A8A] px-[var(--host-16)] py-[var(--host-8)]">
      <Link
        className="min-w-0 flex-1 truncate text-[var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]"
        href={`/host/forms/${encodeURIComponent(template.id)}`}
      >
        {template.name || "신청서 제목"}
      </Link>
      <p className="shrink-0 whitespace-nowrap text-[var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]">
        (최근 수정일) {formatFormUpdatedAt(template.updatedAt)}
      </p>
      {linkedProgramName ? (
        <span className="shrink-0 rounded-full bg-[#FFF6EC] px-[8px] py-[3px] text-[var(--host-11)] font-semibold leading-[1.253] text-[#FE701E]">
          프로그램 연결됨
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-[8px]">
        <button
          aria-label={`${template.name} 복제`}
          className="inline-flex size-[22px] items-center justify-center text-[#FE701E] transition hover:text-[#D85F14] disabled:opacity-40"
          disabled={disabled}
          onClick={onDuplicate}
          type="button"
        >
          <Copy size={18} strokeWidth={1.9} />
        </button>
      </div>
      <button
        aria-label={`${template.name} 삭제`}
        className="inline-flex size-[22px] items-center justify-center text-[#FE701E] transition hover:text-[#D85F14] disabled:opacity-40"
        disabled={disabled}
        onClick={onDelete}
        type="button"
      >
        <Trash2 size={18} strokeWidth={1.9} />
      </button>
    </div>
  );
}

function formatFormUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0000/00/00";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("/");
}
