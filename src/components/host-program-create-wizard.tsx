"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  MapPin,
  MessageSquareText,
  Phone,
  Save,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  cloneApplicationFormTemplate,
  createEmptyTemplate,
  normalizeApplicationFormTemplateShape,
  readApplicationFormTemplates,
} from "@/lib/application-form-builder";
import type { ApplicationFormTemplate } from "@/lib/application-form-builder";
import {
  findHostProjectOverview,
  hostProgramPath,
  hostProjectPath,
  hostStandaloneProgramPath,
} from "@/lib/host-projects";
import {
  createHostProgramDraft,
  mergeHostProgramDrafts,
} from "@/lib/host-program-studio";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import {
  mergeReportProjects,
} from "@/lib/report-automation";
import type { ReportProject } from "@/lib/report-automation";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

export function HostProgramCreateWizard({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [recruitStart, setRecruitStart] = useState("");
  const [recruitEnd, setRecruitEnd] = useState("");
  const [activityStart, setActivityStart] = useState("");
  const [activityEnd, setActivityEnd] = useState("");
  const [target, setTarget] = useState("");
  const [capacity, setCapacity] = useState("");
  const [subsidyLabel, setSubsidyLabel] = useState("");
  const [subsidyAmount, setSubsidyAmount] = useState("");
  const [fee, setFee] = useState("");
  const [phone, setPhone] = useState("");
  const [hashtagsText, setHashtagsText] = useState("");
  const [formName, setFormName] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [messageName, setMessageName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formTemplates, setFormTemplates] = useState<ApplicationFormTemplate[]>(
    readApplicationFormTemplates,
  );
  const { applications, programs: hostPrograms, reportProjects, setPrograms, setReportProjects } =
    useHostOperationsData();
  const reusableFormTemplates = formTemplates.filter(
    (template) => !template.programTitle,
  );
  const project = projectId
    ? findHostProjectOverview(projectId, applications, reportProjects, hostPrograms)
    : undefined;
  const projectPath = projectId ? hostProjectPath(projectId) : "/host/programs";
  const canFinish = Boolean(title.trim() && summary.trim());
  const parsedHashtags = useMemo(
    () => parseHashtags(hashtagsText),
    [hashtagsText],
  );
  const previewImage =
    thumbnailUrl.trim() || project?.imageUrl || "/brand/nuvio-logo-combined.svg";
  const previewLocation = joinLocation(
    region.trim() || project?.villageName || "",
    city.trim(),
  );
  const previewSchedule = formatRange(activityStart, activityEnd) || "운영 일정 미정";
  const previewRecruit = formatRange(recruitStart, recruitEnd) || "모집 일정 미정";
  const checklist = [
    {
      done: Boolean(title.trim()),
      label: "프로그램명",
    },
    {
      done: Boolean(summary.trim()),
      label: "카드 요약",
    },
    {
      done: Boolean(activityStart && activityEnd),
      label: "운영 일정",
    },
    {
      done: Boolean(formName.trim() || selectedFormId),
      label: "신청폼",
    },
  ];

  useEffect(() => {
    let active = true;

    async function loadForms() {
      try {
        const response = await fetch("/api/host/forms", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          data?: ApplicationFormTemplate[];
        };
        if (active) {
          setFormTemplates(
            (payload.data ?? []).map(normalizeApplicationFormTemplateShape),
          );
        }
      } catch {
        // Form selection is optional in this wizard.
      }
    }

    void loadForms();

    return () => {
      active = false;
    };
  }, []);

  async function finish() {
    if (!canFinish || (projectId && !project)) return;

    const programTitle = title.trim();
    const sourceProject =
      project?.reportProject ??
      (projectId ? reportProjects.find((item) => item.id === projectId) : undefined);
    const selectedFormTemplate = formTemplates.find(
      (template) => template.id === selectedFormId,
    );

    setIsSaving(true);
    setErrorMessage("");

    try {
      const programDraft = buildProgramDraftForProject({
        activityEnd,
        activityStart,
        capacity,
        city,
        description,
        fee,
        hashtagsText,
        phone,
        programTitle,
        project: sourceProject,
        recruitEnd,
        recruitStart,
        region,
        subsidyAmount,
        subsidyLabel,
        summary,
        target,
        thumbnailUrl,
      });
      const programResponse = await fetch("/api/host/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(programDraft),
      });
      const programPayload = (await programResponse.json()) as {
        data?: HostProgramDraft;
        error?: string;
      };

      if (!programResponse.ok || !programPayload.data) {
        throw new Error(programPayload.error ?? "프로그램 생성에 실패했습니다.");
      }

      const savedProgram = programPayload.data;
      if (sourceProject && projectId) {
        const nextProject = {
          ...sourceProject,
          programId: sourceProject.programId || savedProgram.id,
          connectedProgramIds: Array.from(
            new Set([...sourceProject.connectedProgramIds, savedProgram.id]),
          ),
          connectedProgramTitles: Array.from(
            new Set([...sourceProject.connectedProgramTitles, savedProgram.title]),
          ),
          updatedAt: new Date().toISOString(),
        } satisfies ReportProject;
        const nextProjects = reportProjects.map((item) => {
          if (item.id !== projectId) return item;
          return nextProject;
        });

        const response = await fetch("/api/host/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextProject),
        });
        const payload = (await response.json()) as {
          data?: ReportProject;
          error?: string;
        };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "프로그램 연결에 실패했습니다.");
        }

        setReportProjects(mergeReportProjects([payload.data], nextProjects));
      }

      setPrograms((current) =>
        mergeHostProgramDrafts([savedProgram], current),
      );

      {
        const programFormTemplate = cloneApplicationFormTemplate(
          selectedFormTemplate ?? createDefaultProgramFormTemplate(savedProgram.title),
          {
            name: formName.trim() || `${savedProgram.title} 신청폼`,
            programId: savedProgram.id,
            programTitle: savedProgram.title,
          },
        );
        const formResponse = await fetch("/api/host/forms", {
          body: JSON.stringify(programFormTemplate),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const formPayload = (await formResponse.json()) as {
          data?: unknown;
          error?: string;
        };
        if (!formResponse.ok || !formPayload.data) {
          throw new Error(formPayload.error ?? "신청폼 연결에 실패했습니다.");
        }

        setFormTemplates((current) => [programFormTemplate, ...current]);
      }

      router.push(
        projectId
          ? hostProgramPath(projectId, savedProgram.id)
          : hostStandaloneProgramPath(savedProgram.id),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "프로그램 연결에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (projectId && !project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          <ArrowLeft size={16} />
          폴더 목록
        </Link>
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-black text-slate-950">
            폴더를 찾을 수 없습니다.
          </h1>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29]"
          href={projectPath}
        >
          <ArrowLeft size={16} />
          {projectId ? "폴더" : "프로그램 목록"}
        </Link>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#FE701E] px-4 text-sm font-black text-white transition hover:bg-[#E85F13] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canFinish || isSaving}
          onClick={() => void finish()}
          type="button"
        >
          <Save size={16} />
          {isSaving ? "저장 중" : "프로그램 만들기"}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-4">
          <header className="rounded-md border border-[#F3E2D5] bg-white p-5">
            <p className="inline-flex items-center gap-2 text-sm font-black text-[#FE701E]">
              <Sparkles size={17} />
              {project ? `${project.title} 폴더에 추가` : "독립 프로그램 생성"}
            </p>
            <h1 className="mt-3 text-2xl font-black text-[#0D0D0C] sm:text-3xl">
              새 프로그램 만들기
            </h1>
            <p className="mt-2 text-sm font-bold leading-6 text-[#8B7A6E]">
              공개 상세 페이지와 신청 흐름에 필요한 정보만 먼저 채우고, 세부 편집은
              생성 후 프로그램 화면에서 이어갈 수 있습니다.
            </p>
          </header>

          <FormSection
            icon={<ClipboardList size={18} />}
            title="기본 정보"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="프로그램명"
                onChange={setTitle}
                placeholder="예: 나를 담는 차 실험실"
                required
                value={title}
              />
              <TextInput
                label="대표 이미지 URL"
                onChange={setThumbnailUrl}
                placeholder="/boseong/home-tea-time.png"
                value={thumbnailUrl}
              />
              <TextInput
                label="지역"
                onChange={setRegion}
                placeholder={project?.villageName || "예: 전남"}
                value={region}
              />
              <TextInput
                label="도시/장소"
                onChange={setCity}
                placeholder="예: 보성군"
                value={city}
              />
            </div>
            <TextArea
              label="카드 요약"
              onChange={setSummary}
              placeholder="프로그램 카드와 상세 상단에 보일 한두 문장"
              required
              value={summary}
            />
            <TextArea
              label="상세 소개"
              onChange={setDescription}
              placeholder="운영 목적, 체류 방식, 주요 활동, 참여자가 얻게 될 경험을 적어주세요."
              rows={7}
              value={description}
            />
          </FormSection>

          <FormSection icon={<CalendarDays size={18} />} title="일정과 모집">
            <div className="grid gap-4 md:grid-cols-2">
              <DateInput label="모집 시작일" onChange={setRecruitStart} value={recruitStart} />
              <DateInput label="모집 종료일" onChange={setRecruitEnd} value={recruitEnd} />
              <DateInput label="운영 시작일" onChange={setActivityStart} value={activityStart} />
              <DateInput label="운영 종료일" onChange={setActivityEnd} value={activityEnd} />
              <TextInput
                label="모집 인원"
                onChange={setCapacity}
                placeholder="예: 12명"
                value={capacity}
              />
              <TextInput
                label="참여 대상"
                onChange={setTarget}
                placeholder="예: 로컬 체류에 관심 있는 청년"
                value={target}
              />
            </div>
          </FormSection>

          <FormSection icon={<WalletCards size={18} />} title="혜택과 비용">
            <div className="grid gap-4 md:grid-cols-3">
              <TextInput
                label="지원 혜택"
                onChange={setSubsidyLabel}
                placeholder="예: 숙박 1박 및 차문화 체험"
                value={subsidyLabel}
              />
              <TextInput
                inputMode="numeric"
                label="지원금"
                onChange={setSubsidyAmount}
                placeholder="예: 200000"
                value={subsidyAmount}
              />
              <TextInput
                label="참가비"
                onChange={setFee}
                placeholder="예: 무료"
                value={fee}
              />
            </div>
            <TextInput
              label="키워드"
              onChange={setHashtagsText}
              placeholder="예: 지역체류, 차문화, 워케이션"
              value={hashtagsText}
            />
          </FormSection>

          <FormSection icon={<MessageSquareText size={18} />} title="신청과 안내">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="신청폼 이름"
                onChange={setFormName}
                placeholder={`${title || "프로그램"} 신청폼`}
                value={formName}
              />
              <label className="grid gap-2">
                <span className="text-sm font-black text-[#5B3A29]">
                  라이브러리 신청폼
                </span>
                <select
                  className="h-11 rounded-md border border-[#E6D6CA] bg-white px-3 text-sm font-bold text-[#0D0D0C] outline-none focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
                  onChange={(event) => {
                    const nextFormId = event.target.value;
                    const nextTemplate = formTemplates.find(
                      (template) => template.id === nextFormId,
                    );
                    setSelectedFormId(nextFormId);
                    if (nextTemplate && !formName.trim()) {
                      setFormName(`${title || "프로그램"} 신청폼`);
                    }
                  }}
                  value={selectedFormId}
                >
                  <option value="">새 기본 신청폼으로 시작</option>
                  {reusableFormTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <TextInput
                label="안내 캠페인"
                onChange={setMessageName}
                placeholder="신청 완료 안내"
                value={messageName}
              />
              <TextInput
                label="문의 연락처"
                onChange={setPhone}
                placeholder="예: 010-0000-0000"
                value={phone}
              />
            </div>
          </FormSection>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="overflow-hidden rounded-md border border-[#F3E2D5] bg-white">
            <div className="relative aspect-[4/3] bg-[#FFF6EC]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="size-full object-cover"
                src={previewImage}
              />
            </div>
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-xs font-black text-[#FE701E]">
                <Eye size={14} />
                공개 카드 미리보기
              </p>
              <h2 className="mt-3 line-clamp-2 text-xl font-black text-[#0D0D0C]">
                {title || "프로그램 제목"}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm font-bold leading-6 text-[#6F625A]">
                {summary || "프로그램 카드와 상세 상단에 보일 요약이 표시됩니다."}
              </p>
              <dl className="mt-4 grid gap-2 text-sm font-bold text-[#6F625A]">
                <PreviewRow icon={<MapPin size={15} />} label="위치" value={previewLocation || "미정"} />
                <PreviewRow icon={<CalendarDays size={15} />} label="운영" value={previewSchedule} />
                <PreviewRow icon={<CalendarDays size={15} />} label="모집" value={previewRecruit} />
                <PreviewRow icon={<Users size={15} />} label="인원" value={capacity || "미정"} />
                <PreviewRow icon={<WalletCards size={15} />} label="혜택" value={subsidyLabel || "미정"} />
                <PreviewRow icon={<Phone size={15} />} label="문의" value={phone || "미정"} />
              </dl>
              {parsedHashtags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {parsedHashtags.map((tag) => (
                    <span
                      className="rounded bg-[#FFF6EC] px-2 py-1 text-xs font-black text-[#FE701E]"
                      key={tag}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-md border border-[#F3E2D5] bg-white p-4">
            <h2 className="flex items-center gap-2 text-base font-black text-[#0D0D0C]">
              <CheckCircle2 size={18} className="text-[#FE701E]" />
              생성 전 확인
            </h2>
            <div className="mt-3 space-y-2">
              {checklist.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 text-sm font-bold"
                  key={item.label}
                >
                  <span className={item.done ? "text-[#0D0D0C]" : "text-[#A59A92]"}>
                    {item.label}
                  </span>
                  <span
                    className={
                      item.done
                        ? "text-[#FE701E]"
                        : "text-[#C7B6AA]"
                    }
                  >
                    {item.done ? "완료" : "필요"}
                  </span>
                </div>
              ))}
            </div>
            {errorMessage ? (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {errorMessage}
              </p>
            ) : null}
            <button
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#FE701E] px-4 text-sm font-black text-white transition hover:bg-[#E85F13] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canFinish || isSaving}
              onClick={() => void finish()}
              type="button"
            >
              <Save size={16} />
              {isSaving ? "저장 중" : "프로그램 만들기"}
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}

function createDefaultProgramFormTemplate(programTitle: string): ApplicationFormTemplate {
  return normalizeApplicationFormTemplateShape({
    ...createEmptyTemplate(),
    name: `${programTitle} 기본 신청폼`,
    blocks: [
      {
        id: "motivation",
        type: "longText",
        label: "참여 동기",
        required: true,
        helper: "이 프로그램에 신청하는 이유를 적어주세요.",
      },
      {
        id: "availability",
        type: "shortText",
        label: "참여 가능 일정",
        required: true,
        helper: "참여 가능한 날짜나 시간대를 적어주세요.",
      },
      {
        id: "expectation",
        type: "longText",
        label: "기대하는 경험",
        required: false,
        helper: "프로그램에서 기대하는 경험이나 필요한 지원을 적어주세요.",
      },
    ],
  });
}

function buildProgramDraftForProject({
  activityEnd,
  activityStart,
  capacity,
  city,
  description,
  fee,
  hashtagsText,
  phone,
  programTitle,
  project,
  recruitEnd,
  recruitStart,
  region,
  subsidyAmount,
  subsidyLabel,
  summary,
  target,
  thumbnailUrl,
}: {
  activityEnd: string;
  activityStart: string;
  capacity: string;
  city: string;
  description: string;
  fee: string;
  hashtagsText: string;
  phone: string;
  programTitle: string;
  project?: ReportProject;
  recruitEnd: string;
  recruitStart: string;
  region: string;
  subsidyAmount: string;
  subsidyLabel: string;
  summary: string;
  target: string;
  thumbnailUrl: string;
}): HostProgramDraft {
  const baseDraft = createHostProgramDraft();
  const trimmedSummary = summary.trim();
  const trimmedDescription = description.trim();
  const villageName = project?.villageName.trim() ?? "";
  const parsedSubsidyAmount = parseAmount(subsidyAmount);
  const hashtags = parseHashtags(hashtagsText);

  return {
    ...baseDraft,
    id: `draft-${Date.now()}`,
    villageId: project?.villageId ?? "",
    title: programTitle,
    region: region.trim() || villageName || baseDraft.region,
    city: city.trim() || villageName || baseDraft.city,
    summary: trimmedSummary || programTitle,
    description: trimmedDescription || trimmedSummary || programTitle,
    recruitStart: recruitStart || baseDraft.recruitStart,
    recruitEnd: recruitEnd || baseDraft.recruitEnd,
    activityStart: activityStart || baseDraft.activityStart,
    activityEnd: activityEnd || baseDraft.activityEnd,
    target: target.trim() || baseDraft.target,
    capacity: capacity.trim() || baseDraft.capacity,
    subsidyLabel: subsidyLabel.trim() || baseDraft.subsidyLabel,
    subsidyAmount: parsedSubsidyAmount,
    fee: fee.trim() || baseDraft.fee,
    sourceName: project?.agencyName.trim() || villageName || baseDraft.sourceName,
    sourceUrl: project?.villageSlug
      ? `https://nuvio.kr/${project.villageSlug}`
      : baseDraft.sourceUrl,
    applyUrl: "https://nuvio.kr/apply",
    phone: phone.trim() || baseDraft.phone,
    hashtags: hashtags.length > 0 ? hashtags : baseDraft.hashtags,
    image: thumbnailUrl.trim() || project?.imageUrl || baseDraft.image,
    published: false,
    updatedAt: new Date().toISOString(),
  };
}

function FormSection({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md border border-[#F3E2D5] bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-black text-[#0D0D0C]">
        <span className="text-[#FE701E]">{icon}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function TextInput({
  inputMode,
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[#5B3A29]">
        {label}
        {required ? <span className="text-[#FE701E]"> *</span> : null}
      </span>
      <input
        className="h-11 rounded-md border border-[#E6D6CA] bg-white px-3 text-sm font-bold text-[#0D0D0C] outline-none transition placeholder:text-[#B7A89D] focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function DateInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <TextInput
      label={label}
      onChange={onChange}
      type="date"
      value={value}
    />
  );
}

function TextArea({
  label,
  onChange,
  placeholder,
  required = false,
  rows = 4,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[#5B3A29]">
        {label}
        {required ? <span className="text-[#FE701E]"> *</span> : null}
      </span>
      <textarea
        className="w-full rounded-md border border-[#E6D6CA] bg-white p-3 text-sm font-bold leading-6 text-[#0D0D0C] outline-none transition placeholder:text-[#B7A89D] focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function PreviewRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[#FE701E]">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-black text-[#A59A92]">{label}</dt>
        <dd className="truncate text-sm font-black text-[#5B3A29]">{value}</dd>
      </div>
    </div>
  );
}

function parseHashtags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim().replace(/^#/u, ""))
    .filter(Boolean)
    .slice(0, 6);
}

function parseAmount(value: string): number {
  const normalized = value.replace(/[^\d]/gu, "");
  return normalized ? Number(normalized) : 0;
}

function formatRange(start: string, end: string): string {
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start}부터`;
  if (end) return `${end}까지`;
  return "";
}

function joinLocation(region: string, city: string): string {
  return [region, city].filter(Boolean).join(" ");
}
