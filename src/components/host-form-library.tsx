"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus2, Layers3, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createEmptyTemplate,
  mergeApplicationFormTemplates,
  normalizeApplicationFormTemplateShape,
  readApplicationFormTemplates,
  writeApplicationFormTemplates,
} from "@/lib/application-form-builder";
import type { ApplicationFormTemplate } from "@/lib/application-form-builder";

export function HostFormLibrary() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ApplicationFormTemplate[]>(() =>
    readApplicationFormTemplates().map(normalizeApplicationFormTemplateShape),
  );

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
          writeApplicationFormTemplates(nextTemplates);
          return nextTemplates;
        });
      } catch {
        // Local fallback keeps the library usable in demo mode.
      }
    }

    void loadDatabaseTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  function createForm() {
    const nextTemplate = createEmptyTemplate();
    const nextTemplates = [nextTemplate, ...templates];
    setTemplates(nextTemplates);
    writeApplicationFormTemplates(nextTemplates);
    router.push(`/host/forms/${encodeURIComponent(nextTemplate.id)}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <FilePlus2 size={18} />
            신청폼 관리
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            신청폼
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {templates.length}개 폼
          </p>
        </div>
        <button
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
          onClick={createForm}
          type="button"
        >
          <Plus size={16} />새 신청폼
        </button>
      </div>

      <section className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
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
                {template.programTitle || "라이브러리"}
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
      </section>
    </div>
  );
}
