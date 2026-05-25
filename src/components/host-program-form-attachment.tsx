"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  FilePlus2,
  Layers3,
  Link2,
  Loader2,
} from "lucide-react";
import {
  isQuestionBlock,
  mergeApplicationFormTemplates,
  normalizeApplicationFormTemplateShape,
  readApplicationFormTemplates,
  type ApplicationFormBlock,
  type ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import {
  hostProgramId,
  hostProgramPath,
  hostProjectPath,
  hostStandaloneProgramPath,
} from "@/lib/host-projects";

type HostProgramOption = {
  id: string;
  slug?: string;
  title: string;
};

export function HostProgramFormAttachment({
  programId,
  projectId,
}: {
  programId: string;
  projectId?: string;
}) {
  const [templates, setTemplates] = useState<ApplicationFormTemplate[]>(() =>
    readApplicationFormTemplates().map(normalizeApplicationFormTemplateShape),
  );
  const [hostPrograms, setHostPrograms] = useState<HostProgramOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const routeProgram = useMemo(() => {
    return hostPrograms.find((program) => {
      const identifiers = [program.id, program.slug ?? "", hostProgramId(program.title)];
      return identifiers.includes(programId);
    });
  }, [hostPrograms, programId]);
  const resolvedProgramId = routeProgram?.id ?? programId;
  const resolvedProgramTitle = routeProgram?.title ?? "";
  const linkedTemplate = useMemo(
    () =>
      templates.find((template) => template.programId === resolvedProgramId) ??
      templates.find(
        (template) =>
          resolvedProgramTitle &&
          normalizeText(template.programTitle) === normalizeText(resolvedProgramTitle),
      ),
    [resolvedProgramId, resolvedProgramTitle, templates],
  );
  const selectableTemplates = useMemo(
    () =>
      templates.filter((template) => template.id !== linkedTemplate?.id),
    [linkedTemplate?.id, templates],
  );
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ??
    selectableTemplates[0];
  const projectBasePath = projectId ? hostProjectPath(projectId) : undefined;
  const programBasePath =
    projectId && programId
      ? hostProgramPath(projectId, programId)
      : routeProgram
        ? hostStandaloneProgramPath(routeProgram.id)
        : "/host/programs";

  useEffect(() => {
    let isMounted = true;

    async function loadForms() {
      try {
        const response = await fetch("/api/host/forms?kind=application", {
          cache: "no-store",
        });
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
        if (isMounted) setError("신청폼을 불러오지 못했습니다.");
      }
    }

    void loadForms();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPrograms() {
      try {
        const response = await fetch("/api/host/programs", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: Array<Partial<HostProgramOption>>;
        };
        const programs = Array.isArray(payload.data)
          ? payload.data
              .map((item) => ({
                id: String(item.id ?? "").trim(),
                slug: item.slug?.trim() || undefined,
                title: String(item.title ?? "").trim(),
              }))
              .filter((item) => item.id && item.title)
          : [];

        if (isMounted) setHostPrograms(programs);
      } catch {
        if (isMounted) setError("프로그램 정보를 불러오지 못했습니다.");
      }
    }

    void loadPrograms();

    return () => {
      isMounted = false;
    };
  }, []);

  async function attachTemplate() {
    if (!selectedTemplate || isAttaching) return;

    setIsAttaching(true);
    setMessage("");
    setError("");

    try {
      const templateToAttach = normalizeApplicationFormTemplateShape({
        ...selectedTemplate,
        formKind: "application",
        programId: resolvedProgramId,
        programTitle: resolvedProgramTitle || selectedTemplate.programTitle,
      });
      const response = await fetch("/api/host/forms", {
        body: JSON.stringify(templateToAttach),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ApplicationFormTemplate;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "신청폼을 연결하지 못했습니다.");
      }

      const savedTemplate = normalizeApplicationFormTemplateShape(payload.data);
      setTemplates((currentTemplates) =>
        mergeApplicationFormTemplates(
          [savedTemplate],
          currentTemplates.filter((template) => template.id !== savedTemplate.id),
        ),
      );
      setSelectedTemplateId("");
      setMessage("신청폼을 가져왔습니다.");
    } catch (attachError) {
      setError(
        attachError instanceof Error
          ? attachError.message
          : "신청폼을 연결하지 못했습니다.",
      );
    } finally {
      setIsAttaching(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29]"
          href={programBasePath ?? projectBasePath ?? "/host/programs"}
        >
          <ArrowLeft size={16} />
          프로그램 화면
        </Link>
        <Link
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-[#FE701E] px-3 text-sm font-black text-white"
          href="/host/forms"
        >
          <FilePlus2 size={16} />
          양식저장
        </Link>
      </div>

      <section className="rounded-md border border-[#F3E2D5] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black text-[#FE701E]">
              <Link2 size={18} />
              신청폼 작성
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-[#0D0D0C] sm:text-3xl">
              프로그램 신청폼
            </h1>
            <p className="mt-2 text-sm font-bold leading-6 text-[#8B7A6E]">
              양식저장에 만든 신청폼을 가져와 연결합니다.
            </p>
          </div>
          {linkedTemplate ? (
            <Link
              className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29] transition hover:border-[#FE701E] hover:text-[#FE701E]"
              href={`/host/forms/${encodeURIComponent(linkedTemplate.id)}`}
            >
              <Edit3 size={16} />
              신청폼 편집
            </Link>
          ) : null}
        </div>

        <div className="mt-6 rounded-md border border-[#F3E2D5] bg-[#FFF8F2] p-4">
          <label className="grid gap-2">
            <span className="text-sm font-black text-[#5B3A29]">
              신청폼 가져오기
            </span>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                className="h-11 min-w-0 rounded-md border border-[#F3CBB3] bg-white px-3 text-sm font-bold text-[#28211D] outline-none focus:border-[#FE701E]"
                disabled={selectableTemplates.length === 0 || isAttaching}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                value={selectedTemplateId || selectableTemplates[0]?.id || ""}
              >
                {selectableTemplates.length === 0 ? (
                  <option value="">가져올 신청폼이 없습니다</option>
                ) : null}
                {selectableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#FE701E] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedTemplate || isAttaching}
                onClick={() => void attachTemplate()}
                type="button"
              >
                {isAttaching ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                가져오기
              </button>
            </div>
          </label>
          {message || error ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
              {message ? (
                <span className="rounded-md bg-teal-50 px-2 py-1 text-teal-700">
                  {message}
                </span>
              ) : null}
              {error ? (
                <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">
                  {error}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-6">
        {linkedTemplate ? (
          <FormTemplatePreview template={linkedTemplate} />
        ) : (
          <EmptyLinkedFormState />
        )}
      </section>
    </div>
  );
}

function EmptyLinkedFormState() {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-md border border-dashed border-[#F3CBB3] bg-white p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-md bg-[#FFF1E8] text-[#FE701E]">
          <Layers3 size={22} />
        </span>
        <h2 className="mt-4 text-xl font-black text-[#0D0D0C]">
          아직 연결된 신청폼이 없습니다.
        </h2>
        <p className="mt-2 text-sm font-bold text-[#8B7A6E]">
          양식저장에서 만든 신청폼을 가져오면 이곳에 미리보기로 표시됩니다.
        </p>
      </div>
    </div>
  );
}

function FormTemplatePreview({ template }: { template: ApplicationFormTemplate }) {
  return (
    <article className="rounded-md border border-[#F3E2D5] bg-white p-5 shadow-sm sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#FE701E]">가져온 신청폼</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[#0D0D0C]">
              {template.name}
            </h2>
            {template.description ? (
              <p className="mt-2 text-sm font-bold leading-6 text-[#8B7A6E]">
                {template.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black text-[#5B3A29]">
            <span className="rounded-full bg-[#FFF1E8] px-3 py-1">
              {template.blocks.length}개 블록
            </span>
            <span className="rounded-full bg-[#FFF1E8] px-3 py-1">
              {template.fields.length}개 질문
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {template.blocks.length > 0 ? (
            template.blocks.map((block) => (
              <PreviewBlock block={block} key={block.id} />
            ))
          ) : (
            <p className="rounded-md bg-[#F7F5F3] p-4 text-sm font-bold text-[#8B7A6E]">
              아직 구성된 블록이 없습니다.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function PreviewBlock({ block }: { block: ApplicationFormBlock }) {
  if (block.type === "title") {
    return (
      <h3 className="text-xl font-black leading-tight text-[#0D0D0C]">
        {block.label}
      </h3>
    );
  }

  if (block.type === "description") {
    return (
      <p className="rounded-md bg-[#F7F5F3] p-4 text-sm font-bold leading-7 text-[#5B3A29]">
        {block.body || block.label}
      </p>
    );
  }

  if (block.type === "divider") {
    return (
      <div className="flex items-center gap-3 py-2">
        <hr className="min-w-0 flex-1 border-[#E6D6CA]" />
        <span className="text-xs font-black text-[#8B7A6E]">{block.label}</span>
        <hr className="min-w-0 flex-1 border-[#E6D6CA]" />
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div className="grid gap-3">
        <p className="text-sm font-black text-[#28211D]">{block.label}</p>
        {block.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={block.imageAlt || block.label}
            className="rounded-md object-cover"
            src={block.imageUrl}
            style={{ width: `${block.imageWidth ?? 100}%` }}
          />
        ) : (
          <div className="grid min-h-32 place-items-center rounded-md border border-dashed border-[#E6D6CA] bg-[#F7F5F3] text-sm font-bold text-[#8B7A6E]">
            이미지 영역
          </div>
        )}
      </div>
    );
  }

  if (block.type === "pageBreak") {
    return (
      <div className="rounded-md bg-[#FFF8F2] px-4 py-3 text-sm font-black text-[#8B7A6E]">
        {block.label}
      </div>
    );
  }

  if (!isQuestionBlock(block)) return null;

  return (
    <div className="grid gap-2">
      <label className="text-sm font-black text-[#28211D]">
        {block.label}
        {block.required ? <span className="text-[#FE701E]"> *</span> : null}
      </label>
      {block.helper ? (
        <p className="text-xs font-bold leading-5 text-[#8B7A6E]">{block.helper}</p>
      ) : null}
      <QuestionControlPreview block={block} />
    </div>
  );
}

function QuestionControlPreview({ block }: { block: ApplicationFormBlock }) {
  if (block.type === "longText") {
    return <div className="h-28 rounded-md border border-[#E6D6CA] bg-[#F7F5F3]" />;
  }

  if (block.type === "singleSelect" || block.type === "multiSelect") {
    return (
      <div className="flex flex-wrap gap-2">
        {(block.options ?? []).map((option) => (
          <span
            className="rounded-full border border-[#E6D6CA] bg-white px-3 py-2 text-xs font-black text-[#5B3A29]"
            key={option}
          >
            {option}
          </span>
        ))}
      </div>
    );
  }

  if (block.type === "checkbox") {
    return (
      <span className="inline-flex w-fit items-center gap-2 rounded-md border border-[#E6D6CA] bg-white px-3 py-2 text-sm font-bold text-[#5B3A29]">
        <input disabled type="checkbox" />
        동의합니다
      </span>
    );
  }

  if (block.type === "date") {
    return <div className="h-11 rounded-md border border-[#E6D6CA] bg-[#F7F5F3]" />;
  }

  return <div className="h-11 rounded-md border border-[#E6D6CA] bg-[#F7F5F3]" />;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, " ");
}
