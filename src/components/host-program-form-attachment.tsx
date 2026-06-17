"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import {
  mergeApplicationFormTemplates,
  normalizeApplicationFormTemplateShape,
  type ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import {
  getHostProgramSidebarStatus,
  hostProgramId,
  hostProgramPath,
  hostStandaloneProgramPath,
} from "@/lib/host-projects";
import { HostProgramSidebar } from "@/components/host-program-sidebar";
import type { ProgramStatus } from "@/lib/types";

type HostProgramOption = {
  id: string;
  published?: boolean;
  slug?: string;
  status?: ProgramStatus;
  title: string;
};

const formFigmaScaleStyle = {
  "--form-scale": "clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333)",
  "--form-3": "clamp(3px, 0.208vw, 4px)",
  "--form-4": "clamp(4px, 0.278vw, 5.333px)",
  "--form-5": "clamp(5px, 0.347vw, 6.667px)",
  "--form-6": "clamp(6px, 0.417vw, 8px)",
  "--form-7": "clamp(7px, 0.486vw, 9.333px)",
  "--form-8": "clamp(8px, 0.556vw, 10.667px)",
  "--form-9": "clamp(9px, 0.625vw, 12px)",
  "--form-10": "clamp(10px, 0.694vw, 13.333px)",
  "--form-12": "clamp(12px, 0.833vw, 16px)",
  "--form-16": "clamp(16px, 1.111vw, 21.333px)",
  "--form-17": "clamp(17px, 1.181vw, 22.667px)",
  "--form-18": "clamp(18px, 1.25vw, 24px)",
  "--form-20": "clamp(20px, 1.389vw, 26.667px)",
  "--form-21": "clamp(21px, 1.458vw, 28px)",
  "--form-22": "clamp(22px, 1.528vw, 29.333px)",
  "--form-24": "clamp(24px, 1.667vw, 32px)",
  "--form-28": "clamp(28px, 1.944vw, 37.333px)",
  "--form-29": "clamp(29px, 2.014vw, 38.667px)",
  "--form-32": "clamp(32px, 2.222vw, 42.667px)",
  "--form-34": "clamp(34px, 2.361vw, 45.333px)",
  "--form-40": "clamp(40px, 2.778vw, 53.333px)",
  "--form-42": "clamp(42px, 2.917vw, 56px)",
  "--form-44": "clamp(44px, 3.056vw, 58.667px)",
  "--form-45": "clamp(45px, 3.125vw, 60px)",
  "--form-58": "clamp(58px, 4.028vw, 77.333px)",
  "--form-65": "clamp(65px, 4.514vw, 86.667px)",
  "--form-69": "clamp(69px, 4.792vw, 92px)",
  "--form-77": "clamp(77px, 5.347vw, 102.667px)",
  "--form-79": "clamp(79px, 5.486vw, 105.333px)",
  "--form-88": "clamp(88px, 6.111vw, 117.333px)",
  "--form-92": "clamp(92px, 6.389vw, 122.667px)",
  "--form-99": "clamp(99px, 6.875vw, 132px)",
  "--form-119": "clamp(119px, 8.264vw, 158.667px)",
  "--form-157": "clamp(157px, 10.903vw, 209.333px)",
  "--form-167": "clamp(167px, 11.597vw, 222.667px)",
  "--form-180": "clamp(180px, 12.5vw, 240px)",
  "--form-192": "clamp(192px, 13.333vw, 256px)",
  "--form-216": "clamp(216px, 15vw, 288px)",
  "--form-228": "clamp(228px, 15.833vw, 304px)",
  "--form-296": "clamp(296px, 20.556vw, 394.667px)",
  "--form-327": "clamp(327px, 22.708vw, 436px)",
  "--form-358": "clamp(358px, 24.861vw, 477.333px)",
  "--form-384": "clamp(384px, 26.667vw, 512px)",
  "--form-389": "clamp(389px, 27.014vw, 518.667px)",
  "--form-420": "clamp(420px, 29.167vw, 560px)",
  "--form-438": "clamp(438px, 30.417vw, 584px)",
  "--form-441": "clamp(441px, 30.625vw, 588px)",
  "--form-562": "clamp(562px, 39.028vw, 749.333px)",
} as CSSProperties;

export function HostProgramFormAttachment({
  programId,
  projectId,
}: {
  programId: string;
  projectId?: string;
}) {
  const [templates, setTemplates] = useState<ApplicationFormTemplate[]>([]);
  const [hostPrograms, setHostPrograms] = useState<HostProgramOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
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
  const linkedTemplates = useMemo(
    () =>
      templates.filter((template) =>
        isTemplateLinkedToProgram(
          template,
          resolvedProgramId,
          resolvedProgramTitle,
        ),
      ),
    [resolvedProgramId, resolvedProgramTitle, templates],
  );
  const linkedTemplate = linkedTemplates[0];
  const selectableTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          !linkedTemplates.some((linkedItem) => linkedItem.id === template.id),
      ),
    [linkedTemplates, templates],
  );
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ??
    selectableTemplates[0];
  const isBusy = isAttaching || isSaving;
  const programBasePath =
    projectId && programId
      ? hostProgramPath(projectId, programId)
      : routeProgram
        ? hostStandaloneProgramPath(routeProgram.id)
        : hostStandaloneProgramPath(programId);
  const applicationsHref = `${programBasePath}/applications`;
  const messagesHref = `${programBasePath}/messages`;
  const formsLibraryHref = "/host/forms?kind=application";
  const sidebarStatus = getHostProgramSidebarStatus(
    routeProgram ? { status: routeProgram.status } : undefined,
    routeProgram,
  );

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

        setTemplates(databaseTemplates);
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
                published:
                  typeof item.published === "boolean"
                    ? item.published
                    : undefined,
                slug: item.slug?.trim() || undefined,
                status: item.status,
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
    if (!selectedTemplate || isBusy) return false;

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
      setMessage("신청폼 연결을 저장했습니다.");
      return true;
    } catch (attachError) {
      setError(
        attachError instanceof Error
          ? attachError.message
          : "신청폼을 연결하지 못했습니다.",
      );
      return false;
    } finally {
      setIsAttaching(false);
    }
  }

  async function confirmTemplateConnection() {
    const didAttach = await attachTemplate();
    if (didAttach) {
      setIsConnectionDialogOpen(false);
    }
  }

  async function detachTemplate() {
    if (linkedTemplates.length === 0 || isBusy) return;

    setIsAttaching(true);
    setMessage("");
    setError("");

    try {
      const savedTemplates: ApplicationFormTemplate[] = [];

      for (const template of linkedTemplates) {
        const detachedTemplate = normalizeApplicationFormTemplateShape({
          ...template,
          programId: "",
          programTitle: "",
        });
        const response = await fetch("/api/host/forms", {
          body: JSON.stringify(detachedTemplate),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json()) as {
          data?: ApplicationFormTemplate;
          error?: string;
        };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "신청폼 연결을 해제하지 못했습니다.");
        }

        savedTemplates.push(normalizeApplicationFormTemplateShape(payload.data));
      }

      setTemplates((currentTemplates) =>
        mergeApplicationFormTemplates(
          savedTemplates,
          currentTemplates.filter(
            (template) =>
              !savedTemplates.some((savedTemplate) => savedTemplate.id === template.id),
          ),
        ),
      );
      setSelectedTemplateId(savedTemplates[0]?.id ?? "");
      setMessage("신청폼 연결을 해제했습니다.");
    } catch (detachError) {
      setError(
        detachError instanceof Error
          ? detachError.message
          : "신청폼 연결을 해제하지 못했습니다.",
      );
    } finally {
      setIsAttaching(false);
    }
  }

  async function saveConnection() {
    if (isBusy) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      if (!linkedTemplate) {
        setMessage("연결된 신청폼 없이 저장했습니다.");
        return;
      }

      const templateToSave = normalizeApplicationFormTemplateShape({
        ...linkedTemplate,
        formKind: "application",
        programId: resolvedProgramId,
        programTitle: resolvedProgramTitle || linkedTemplate.programTitle,
      });
      const response = await fetch("/api/host/forms", {
        body: JSON.stringify(templateToSave),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ApplicationFormTemplate;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "신청폼 연결을 저장하지 못했습니다.");
      }

      const savedTemplate = normalizeApplicationFormTemplateShape(payload.data);
      setTemplates((currentTemplates) =>
        mergeApplicationFormTemplates(
          [savedTemplate],
          currentTemplates.filter((template) => template.id !== savedTemplate.id),
        ),
      );
      setMessage("저장했습니다.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "신청폼 연결을 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="font-pretendard min-h-[calc(100vh-4.861vw)] bg-white text-[#5B3A29]"
      style={formFigmaScaleStyle}
    >
      <div className="flex min-h-[calc(100vh-4.861vw)] max-md:flex-col">
        <HostProgramSidebar
          activeItem="forms"
          applicationsHref={applicationsHref}
          formsHref={`${programBasePath}/forms`}
          messagesHref={messagesHref}
          programId={resolvedProgramId}
          programPath={programBasePath}
          status={sidebarStatus}
          title={resolvedProgramTitle || "프로그램 제목"}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <main className="min-h-[calc(100vh-4.861vw-var(--form-69))] flex-1 bg-white">
            <div className="w-[var(--form-562)] pl-[var(--form-40)] pt-[var(--form-44)]">
              {linkedTemplate ? (
                <FormConnectionBlock
                  helper="연결된 신청폼으로 게스트가 신청할 수 있어요"
                  title="신청폼 연결"
                >
                  <div className="relative h-[var(--form-34)]">
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-[13px] size-[8px] rounded-full bg-[#7A8B52]"
                    />
                    <div className="absolute left-[var(--form-22)] top-0 flex h-[var(--form-34)] w-[var(--form-441)] items-center rounded-[3px] border border-[#6D7A8A] bg-white px-[var(--form-16)] text-[14px] font-semibold leading-[1.253] text-[#33241C]">
                      <span className="min-w-0 flex-1 truncate">
                        {linkedTemplate.name || "신청서 제목"}
                      </span>
                      <span className="shrink-0">
                        작성일 {formatFormDate(linkedTemplate.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-[var(--form-24)] flex h-[var(--form-29)] items-center gap-[var(--form-24)] pl-[var(--form-28)]">
                    <button
                      className="inline-flex h-[var(--form-29)] w-[var(--form-58)] items-center justify-center rounded-[4px] border border-[#FE701E] bg-white text-[12px] font-normal leading-[1.253] text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isBusy}
                      onClick={() => setIsConnectionDialogOpen(true)}
                      type="button"
                    >
                      변경
                    </button>
                    <button
                      className="inline-flex h-[var(--form-29)] w-[var(--form-79)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white text-[12px] font-normal leading-[1.253] text-[#6D7A8A] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isBusy}
                      onClick={() => void detachTemplate()}
                      type="button"
                    >
                      {isAttaching ? (
                        <Loader2 aria-hidden="true" className="mr-1 size-3 animate-spin" />
                      ) : null}
                      연결해제
                    </button>
                  </div>
                </FormConnectionBlock>
              ) : (
                <FormConnectionBlock
                  action={
                    <button
                      className="inline-flex h-[var(--form-29)] w-[var(--form-92)] items-center justify-center rounded-[4px] border border-[#FE701E] bg-white text-[12px] font-normal leading-[1.253] text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-40"
                      data-host-form-connect-open
                      disabled={isBusy}
                      onClick={() => setIsConnectionDialogOpen(true)}
                      type="button"
                    >
                      폼 연결하기
                    </button>
                  }
                  helper="신청폼이 연결되지 않으면 게스트가 신청할 수 없어요"
                  title="신청폼 연결"
                />
              )}

              <select
                aria-label="연결할 신청폼 선택"
                className="sr-only"
                disabled={selectableTemplates.length === 0 || isBusy}
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
              <p aria-live="polite" className="sr-only">
                {message || error}
              </p>
            </div>
          </main>

          <div className="flex h-[var(--form-69)] shrink-0 items-start border-t border-[#6D7A8A] bg-white pl-[var(--form-28)] pt-[var(--form-20)]">
            <button
              className="inline-flex h-[var(--form-29)] w-[var(--form-79)] items-center justify-center rounded-[4px] bg-[#FE701E] text-[12px] font-medium leading-[1.253] text-[#FFF6EC] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBusy}
              onClick={() => void saveConnection()}
              type="button"
            >
              {isSaving ? (
                <Loader2 aria-hidden="true" className="mr-1 size-3 animate-spin" />
              ) : null}
              저장하기
            </button>
            {message || error ? (
              <p
                className={`ml-[var(--form-16)] mt-[7px] text-[12px] font-normal leading-[1.253] ${
                  error ? "text-[#FE701E]" : "text-[#6D7A8A]"
                }`}
              >
                {error || message}
              </p>
            ) : null}
          </div>
        </section>
      </div>
      {isConnectionDialogOpen ? (
        <FormConnectionDialog
          formsLibraryHref={formsLibraryHref}
          isAttaching={isBusy}
          onClose={() => setIsConnectionDialogOpen(false)}
          onConnect={() => void confirmTemplateConnection()}
          onSelect={setSelectedTemplateId}
          selectedTemplateId={selectedTemplate?.id ?? ""}
          templates={selectableTemplates}
        />
      ) : null}
    </div>
  );
}

function FormConnectionBlock({
  action,
  children,
  className = "",
  helper,
  title,
}: {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  helper: string;
  title: string;
}) {
  return (
    <section className={`w-[var(--form-562)] ${className}`}>
      <div className="h-[46px]">
        <h1 className="text-[16px] font-bold leading-[1.253] text-[#0D0D0C]">
          {title}
        </h1>
        <p className="mt-[8px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
          {helper}
        </p>
      </div>
      <div className="mt-[24px]">{children ?? action}</div>
    </section>
  );
}

function FormConnectionDialog({
  formsLibraryHref,
  isAttaching,
  onClose,
  onConnect,
  onSelect,
  selectedTemplateId,
  templates,
}: {
  formsLibraryHref: string;
  isAttaching: boolean;
  onClose: () => void;
  onConnect: () => void;
  onSelect: (templateId: string) => void;
  selectedTemplateId: string;
  templates: ApplicationFormTemplate[];
}) {
  return (
    <div
      aria-labelledby="form-connection-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent"
      data-host-form-connection-dialog
      role="dialog"
    >
      <div className="w-[var(--form-384)] rounded-[8px] border border-[#D9D9D9] bg-white px-[var(--form-17)] pb-[var(--form-18)] pt-[var(--form-16)] shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-start">
          <h2
            className="text-[length:var(--form-12)] font-semibold leading-[1.253] text-[#0D0D0C]"
            id="form-connection-dialog-title"
          >
            신청폼 연결하기
          </h2>
          <button
            aria-label="닫기"
            className="ml-auto grid size-[var(--form-18)] place-items-center text-[length:var(--form-20)] font-normal leading-none text-[#0D0D0C]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <p className="mt-[var(--form-10)] text-[length:var(--form-10)] font-normal leading-[1.253] text-[#6D7A8A]">
          미리 작성된 신청폼 목록 중 선택해 주세요.
        </p>

        <div className="mt-[var(--form-6)] flex flex-col gap-[var(--form-5)]">
          {templates.length > 0 ? (
            templates.slice(0, 4).map((template) => {
              const checked = selectedTemplateId === template.id;

              return (
                <label
                  className="flex h-[var(--form-21)] cursor-pointer items-center gap-[var(--form-6)]"
                  key={template.id}
                >
                  <input
                    checked={checked}
                    className="peer sr-only"
                    name="form-template-connection"
                    onChange={() => onSelect(template.id)}
                    type="radio"
                    value={template.id}
                  />
                  <span
                    aria-hidden="true"
                    className={`grid size-[var(--form-10)] shrink-0 place-items-center rounded-full border ${
                      checked ? "border-[#FE701E]" : "border-[#AEB8C2]"
                    }`}
                  >
                    <span
                      className={`size-[var(--form-5)] rounded-full ${
                        checked ? "bg-[#FE701E]" : "bg-transparent"
                      }`}
                    />
                  </span>
                  <span className="flex h-full min-w-0 flex-1 items-center rounded-[3px] border border-[#AEB8C2] px-[var(--form-8)] text-[length:var(--form-9)] font-normal leading-[1.253] text-[#6D7A8A]">
                    <span className="min-w-0 flex-1 truncate">
                      {template.name || "신청서 제목"}
                    </span>
                    <span className="ml-[var(--form-8)] shrink-0">
                      작성일 {formatFormDateDots(template.updatedAt)}
                    </span>
                  </span>
                </label>
              );
            })
          ) : (
            <div className="flex h-[var(--form-45)] items-center justify-center rounded-[3px] border border-[#AEB8C2] text-[length:var(--form-10)] text-[#6D7A8A]">
              작성된 신청폼이 없습니다.
            </div>
          )}
        </div>

        <div className="mt-[var(--form-7)] flex items-center">
          <Link
            className="inline-flex items-center gap-[var(--form-4)] text-[length:var(--form-10)] font-normal leading-[1.253] text-[#FE701E]"
            href={formsLibraryHref}
          >
            <span
              aria-hidden="true"
              className="grid size-[var(--form-8)] place-items-center rounded-full bg-[#FE701E] text-[length:var(--form-8)] leading-none text-white"
            >
              +
            </span>
            새 신청폼 만들기
          </Link>
          <button
            className="ml-auto inline-flex h-[var(--form-24)] w-[var(--form-42)] items-center justify-center rounded-[3px] bg-[#FE701E] text-[length:var(--form-10)] font-semibold leading-[1.253] text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={templates.length === 0 || isAttaching}
            onClick={onConnect}
            type="button"
          >
            {isAttaching ? (
              <Loader2 aria-hidden="true" className="size-[var(--form-12)] animate-spin" />
            ) : (
              "연결"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatFormDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0000/00/00";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function formatFormDateDots(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0000. 00. 00";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

function isTemplateLinkedToProgram(
  template: ApplicationFormTemplate,
  programId: string,
  programTitle: string,
): boolean {
  if (template.programId === programId) return true;

  return Boolean(
    programTitle &&
      template.programTitle &&
      normalizeText(template.programTitle) === normalizeText(programTitle),
  );
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, " ");
}
