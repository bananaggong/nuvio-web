"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus2, FileQuestion, Layers3, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createEmptyTemplate,
  mergeApplicationFormTemplates,
  normalizeApplicationFormTemplateShape,
} from "@/lib/application-form-builder";
import type { ApplicationFormTemplate } from "@/lib/application-form-builder";
import type { ApplicationFormKind } from "@/lib/application-form-builder";

const formKindMeta: Record<
  ApplicationFormKind,
  { buttonLabel: string; emptyLabel: string; heading: string; title: string }
> = {
  application: {
    buttonLabel: "새 신청폼",
    emptyLabel: "아직 신청폼이 없습니다.",
    heading: "신청폼 관리",
    title: "신청폼",
  },
  inquiry: {
    buttonLabel: "새 문의 양식",
    emptyLabel: "아직 문의 양식이 없습니다.",
    heading: "문의 양식 관리",
    title: "문의 양식",
  },
};

export function HostFormLibrary({
  initialKind = "application",
}: {
  initialKind?: ApplicationFormKind;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<ApplicationFormTemplate[]>([]);
  const [activeKind, setActiveKind] = useState<ApplicationFormKind>(initialKind);
  const [isCreating, setIsCreating] = useState(false);
  const activeTemplates = useMemo(
    () => templates.filter((template) => template.formKind === activeKind),
    [activeKind, templates],
  );
  const activeMeta = formKindMeta[activeKind];

  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseTemplates() {
      try {
        const response = await fetch("/api/host/forms", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: ApplicationFormTemplate[];
        };
        const databaseTemplates = Array.isArray(payload.data)
          ? payload.data.map(normalizeApplicationFormTemplateShape)
          : [];
        if (!isMounted || databaseTemplates.length === 0) return;

        setTemplates((currentTemplates) => {
          const nextTemplates = mergeApplicationFormTemplates(
            databaseTemplates,
            currentTemplates,
          );
          return nextTemplates;
        });
      } catch {
        // Keep the library empty rather than showing seed data in host workflows.
      }
    }

    void loadDatabaseTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  async function createForm(formKind: ApplicationFormKind) {
    const nextTemplate = createEmptyTemplate(formKind);
    setIsCreating(true);

    try {
      const response = await fetch("/api/host/forms", {
        body: JSON.stringify(nextTemplate),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ApplicationFormTemplate;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "신청폼을 만들지 못했습니다.");
      }

      const savedTemplate = normalizeApplicationFormTemplateShape(payload.data);
      const nextTemplates = [savedTemplate, ...templates];
      setTemplates(nextTemplates);
      router.push(`/host/forms/${encodeURIComponent(savedTemplate.id)}`);
    } catch {
      // Keep the current library visible; the save button/API surfaces failures elsewhere.
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            {activeKind === "inquiry" ? <FileQuestion size={18} /> : <FilePlus2 size={18} />}
            {activeMeta.heading}
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            {activeMeta.title}
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {activeTemplates.length}개 폼
          </p>
        </div>
        <button
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
          disabled={isCreating}
          onClick={() => void createForm(activeKind)}
          type="button"
        >
          <Plus size={16} />
          {activeMeta.buttonLabel}
        </button>
      </div>

      <div className="mt-6 inline-flex rounded-md border border-[#F3E2D5] bg-white p-1">
        {(["application", "inquiry"] as ApplicationFormKind[]).map((formKind) => {
          const selected = formKind === activeKind;
          return (
            <button
              className={`h-9 rounded-md px-4 text-sm font-black transition ${
                selected
                  ? "bg-[#FE701E] text-white"
                  : "text-[#8B7A6E] hover:bg-[#FFF1E8] hover:text-[#FE701E]"
              }`}
              key={formKind}
              onClick={() => {
                setActiveKind(formKind);
                router.replace(`/host/forms?kind=${formKind}`, { scroll: false });
              }}
              type="button"
            >
              {formKindMeta[formKind].title}
            </button>
          );
        })}
      </div>

      <section className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {activeTemplates.map((template) => (
          <Link
            className="group block rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md"
            href={`/host/forms/${encodeURIComponent(template.id)}`}
            key={template.id}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-md bg-teal-50 text-[var(--primary)]">
                <Layers3 size={20} />
              </span>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-black text-slate-500">
                {template.programTitle || (template.formKind === "inquiry" ? "문의" : "라이브러리")}
              </span>
            </div>
            <h2 className="mt-5 break-words text-lg font-black leading-6 text-slate-950">
              {template.name}
            </h2>
            <p className="mt-2 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-500">
              {template.description || "설명 없음"}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-black text-slate-600">
              <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1">
                {template.blocks.length}개 블록
              </span>
              <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1">
                {template.fields.length}개 질문
              </span>
            </div>
          </Link>
        ))}
        {activeTemplates.length === 0 ? (
          <div className="grid min-h-56 place-items-center rounded-md border border-dashed border-[#F3CBB3] bg-white p-8 text-center sm:col-span-2 xl:col-span-3">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-md bg-[#FFF1E8] text-[#FE701E]">
                {activeKind === "inquiry" ? <FileQuestion size={22} /> : <FilePlus2 size={22} />}
              </span>
              <p className="mt-4 text-lg font-black text-[#0D0D0C]">
                {activeMeta.emptyLabel}
              </p>
              <button
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#FE701E] px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
                disabled={isCreating}
                onClick={() => void createForm(activeKind)}
                type="button"
              >
                <Plus size={16} />
                {activeMeta.buttonLabel}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
