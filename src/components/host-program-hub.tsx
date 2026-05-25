"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  FilePlus2,
  ImageIcon,
  MapPin,
  MessageSquareText,
  Save,
  Settings,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import {
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  findHostProgramOverview,
  findHostProjectOverview,
  findStandaloneHostProgramOverview,
  hostProgramId,
  hostProgramPath,
  hostProjectPath,
  hostStandaloneProgramPath,
  type HostProgramOverview,
} from "@/lib/host-projects";
import {
  mergeHostProgramDrafts,
  type HostProgramDraft,
} from "@/lib/host-program-studio";
import type { PeriodKey, ProgramStatus, ThemeKey } from "@/lib/types";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

type ProgramPanel =
  | "dashboard"
  | "basic"
  | "detail"
  | "place"
  | "guide"
  | "management"
  | "delete";

const panelLabels: Record<ProgramPanel, string> = {
  basic: "기본정보",
  dashboard: "대시보드",
  delete: "취소 및 삭제",
  detail: "상세 정보",
  guide: "안내사항",
  management: "프로그램 관리",
  place: "장소 정보",
};

const statusOptions: Array<{ label: string; value: ProgramStatus }> = [
  { label: "모집예정", value: "upcoming" },
  { label: "모집중", value: "open" },
  { label: "마감", value: "closed" },
  { label: "조기마감", value: "earlyClosed" },
];

const themeOptions: Array<{ label: string; value: ThemeKey }> = [
  { label: "워케이션", value: "workation" },
  { label: "로컬 미션", value: "local" },
  { label: "짧은 여행", value: "short" },
  { label: "한 달 살기", value: "month" },
  { label: "귀농귀촌", value: "returnFarm" },
  { label: "공모/이벤트", value: "event" },
  { label: "반려동물", value: "pet" },
  { label: "반값여행", value: "half" },
  { label: "일상 지원금", value: "daily" },
  { label: "가족 여행", value: "family" },
  { label: "간편 신청", value: "easy" },
  { label: "전용 혜택", value: "benefit" },
  { label: "전용 이벤트", value: "exclusive" },
];

const periodOptions: Array<{ label: string; value: PeriodKey }> = [
  { label: "4박 이하", value: "under4" },
  { label: "1주 내외", value: "week" },
  { label: "2주 내외", value: "twoWeeks" },
  { label: "3주 내외", value: "threeWeeks" },
  { label: "한 달 이상", value: "month" },
];

export function HostProgramHub({
  programId,
  projectId,
}: {
  programId: string;
  projectId?: string;
}) {
  const searchParams = useSearchParams();
  const { applications, isLoading, programs: hostPrograms, reportProjects, setPrograms } =
    useHostOperationsData();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const activePanel = normalizePanel(searchParams.get("panel"));
  const project = useMemo(
    () =>
      projectId
        ? findHostProjectOverview(projectId, applications, reportProjects, hostPrograms)
        : undefined,
    [applications, hostPrograms, projectId, reportProjects],
  );
  const program = useMemo(
    () =>
      projectId
        ? findHostProgramOverview(
            projectId,
            programId,
            applications,
            reportProjects,
            hostPrograms,
          )
        : findStandaloneHostProgramOverview(
            programId,
            applications,
            reportProjects,
            hostPrograms,
          ),
    [applications, hostPrograms, programId, projectId, reportProjects],
  );
  const draft = useMemo(
    () => findProgramDraft(hostPrograms, programId, program),
    [hostPrograms, program, programId],
  );
  const projectPath = projectId ? hostProjectPath(projectId) : "/host/programs";
  const programPath =
    projectId && program
      ? hostProgramPath(projectId, program.id)
      : hostStandaloneProgramPath(program?.id ?? programId);
  const applicationsHref = `${programPath}/applications`;
  const formsHref = `${programPath}/forms`;
  const messagesHref = `${programPath}/messages`;

  if (isLoading && !program) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div className="rounded-md border border-[#F3E2D5] bg-white p-6 text-sm font-black text-[#8B7A6E]">
          프로그램을 불러오는 중입니다.
        </div>
      </div>
    );
  }

  if ((projectId && !project) || !program) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29]"
          href={projectPath}
        >
          <ArrowLeft size={16} />
          {projectId ? "폴더" : "프로그램 목록"}
        </Link>
        <div className="mt-5 rounded-md border border-[#F3E2D5] bg-white p-6">
          <h1 className="text-2xl font-black text-[#0D0D0C]">
            프로그램을 찾을 수 없습니다.
          </h1>
        </div>
      </div>
    );
  }

  function updateDraft(patch: Partial<HostProgramDraft>) {
    if (!draft) return;

    const nextDraft = {
      ...draft,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    setSaveMessage("");
    setSaveError("");
    setPrograms((current) =>
      mergeHostProgramDrafts(
        [nextDraft],
        current.filter((item) => item.id !== draft.id),
      ),
    );
  }

  async function saveDraft() {
    if (!draft || isSaving || !draft.title.trim()) return;

    setIsSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const response = await fetch("/api/host/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as {
        data?: HostProgramDraft;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "프로그램 저장에 실패했습니다.");
      }

      setPrograms((current) =>
        mergeHostProgramDrafts(
          [payload.data as HostProgramDraft],
          current.filter((item) => item.id !== draft.id),
        ),
      );
      setSaveMessage("저장되었습니다.");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "프로그램 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29]"
          href={projectPath}
        >
          <ArrowLeft size={16} />
          {projectId ? "폴더" : "프로그램 목록"}
        </Link>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#FE701E] px-4 text-sm font-black text-white transition hover:bg-[#E85F13] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!draft || !draft.title.trim() || isSaving}
          onClick={() => void saveDraft()}
          type="button"
        >
          <Save size={16} />
          {isSaving ? "저장 중" : "저장하기"}
        </button>
      </div>

      <section className="grid overflow-hidden rounded-md border border-[#F3E2D5] bg-white lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="relative min-h-64 bg-[#FFF6EC]">
          <Image
            alt={program.title}
            className="object-cover"
            fill
            sizes="(max-width: 1024px) 100vw, 360px"
            src={draft?.image?.trim() || program.imageUrl || "/brand/nuvio-logo-combined.svg"}
          />
        </div>
        <div className="p-5 sm:p-6">
          <p className="inline-flex items-center gap-2 text-sm font-black text-[#FE701E]">
            <ClipboardList size={18} />
            프로그램 제작 화면
          </p>
          <h1 className="mt-4 max-w-3xl text-2xl font-black leading-tight text-[#0D0D0C] sm:text-3xl">
            {draft?.title || program.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#8B7A6E]">
            프로그램은 먼저 이름만으로 만들고, 이 화면에서 공개 정보와 운영 설정을
            채워갑니다.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Metric label="신청" value={`${program.applicationCount}명`} />
            <Metric label="검토 대기" value={`${program.pendingCount}명`} />
            <Metric label="상태" value={statusLabel(draft?.status ?? program.status)} />
          </div>
          <div className="mt-4 min-h-6">
            {saveMessage ? (
              <p className="text-sm font-black text-[#FE701E]">{saveMessage}</p>
            ) : null}
            {saveError ? (
              <p className="text-sm font-black text-red-600">{saveError}</p>
            ) : null}
            {!draft ? (
              <p className="text-sm font-bold text-red-600">
                이 프로그램은 아직 편집 가능한 초안 데이터가 없습니다.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-6">
        {activePanel === "dashboard" ? (
          <DashboardPanel
            applicationsHref={applicationsHref}
            formsHref={formsHref}
            messagesHref={messagesHref}
            programPath={programPath}
          />
        ) : null}
        {draft && activePanel === "basic" ? (
          <BasicPanel draft={draft} updateDraft={updateDraft} />
        ) : null}
        {draft && activePanel === "detail" ? (
          <DetailPanel draft={draft} updateDraft={updateDraft} />
        ) : null}
        {draft && activePanel === "place" ? (
          <PlacePanel draft={draft} updateDraft={updateDraft} />
        ) : null}
        {draft && activePanel === "guide" ? (
          <GuidePanel draft={draft} updateDraft={updateDraft} />
        ) : null}
        {draft && activePanel === "management" ? (
          <ManagementPanel draft={draft} updateDraft={updateDraft} />
        ) : null}
        {draft && activePanel === "delete" ? (
          <DeletePanel draft={draft} />
        ) : null}
      </section>
    </div>
  );
}

function DashboardPanel({
  applicationsHref,
  formsHref,
  messagesHref,
  programPath,
}: {
  applicationsHref: string;
  formsHref: string;
  messagesHref: string;
  programPath: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <ToolCard
        description="프로그램 제목, 모집 상태, 일정, 인원을 정리합니다."
        href={`${programPath}?panel=basic`}
        icon={<Settings size={20} />}
        title="프로그램 설정"
      />
      <ToolCard
        description="참여자가 제출할 질문과 안내 문구를 구성합니다."
        href={formsHref}
        icon={<FilePlus2 size={20} />}
        title="신청 폼"
      />
      <ToolCard
        description="신청자 목록과 검토 상태를 확인합니다."
        href={applicationsHref}
        icon={<Users size={20} />}
        title="신청자 관리"
      />
      <ToolCard
        description="공지, 문의, 알림 메시지를 준비합니다."
        href={messagesHref}
        icon={<MessageSquareText size={20} />}
        title="공지/문의/알림"
      />
    </div>
  );
}

function BasicPanel({
  draft,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  return (
    <PanelCard icon={<ClipboardList size={19} />} title={panelLabels.basic}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="프로그램명"
          onChange={(title) => updateDraft({ title })}
          value={draft.title}
        />
        <SelectInput
          label="모집 상태"
          onChange={(status) => updateDraft({ status: status as ProgramStatus })}
          options={statusOptions}
          value={draft.status}
        />
        <DateInput
          label="모집 시작일"
          onChange={(recruitStart) => updateDraft({ recruitStart })}
          value={draft.recruitStart}
        />
        <DateInput
          label="모집 종료일"
          onChange={(recruitEnd) => updateDraft({ recruitEnd })}
          value={draft.recruitEnd}
        />
        <DateInput
          label="운영 시작일"
          onChange={(activityStart) => updateDraft({ activityStart })}
          value={draft.activityStart}
        />
        <DateInput
          label="운영 종료일"
          onChange={(activityEnd) => updateDraft({ activityEnd })}
          value={draft.activityEnd}
        />
        <TextInput
          label="모집 인원"
          onChange={(capacity) => updateDraft({ capacity })}
          placeholder="예: 12명"
          value={draft.capacity}
        />
        <TextInput
          label="참여 대상"
          onChange={(target) => updateDraft({ target })}
          placeholder="예: 로컬 체류에 관심 있는 청년"
          value={draft.target}
        />
      </div>
      <TextArea
        label="카드 요약"
        onChange={(summary) => updateDraft({ summary })}
        placeholder="프로그램 카드와 상세 상단에 보일 짧은 소개"
        value={draft.summary}
      />
    </PanelCard>
  );
}

function DetailPanel({
  draft,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  return (
    <PanelCard icon={<ImageIcon size={19} />} title={panelLabels.detail}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="대표 이미지 URL"
          onChange={(image) => updateDraft({ image })}
          placeholder="/boseong/home-tea-time.png"
          value={draft.image}
        />
        <SelectInput
          label="프로그램 유형"
          onChange={(theme) => updateDraft({ theme: theme as ThemeKey })}
          options={themeOptions}
          value={draft.theme}
        />
        <SelectInput
          label="체류 기간"
          onChange={(periodKey) => updateDraft({ periodKey: periodKey as PeriodKey })}
          options={periodOptions}
          value={draft.periodKey}
        />
        <TextInput
          label="키워드"
          onChange={(value) => updateDraft({ hashtags: parseHashtags(value) })}
          placeholder="예: 지역체류, 차문화, 워케이션"
          value={draft.hashtags.join(", ")}
        />
      </div>
      <TextArea
        label="상세 소개"
        onChange={(description) => updateDraft({ description })}
        placeholder="운영 목적, 체류 방식, 주요 활동, 참여자가 얻게 될 경험을 적어주세요."
        rows={8}
        value={draft.description}
      />
    </PanelCard>
  );
}

function PlacePanel({
  draft,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  return (
    <PanelCard icon={<MapPin size={19} />} title={panelLabels.place}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="지역"
          onChange={(region) => updateDraft({ region })}
          placeholder="예: 전남"
          value={draft.region}
        />
        <TextInput
          label="도시/장소"
          onChange={(city) => updateDraft({ city })}
          placeholder="예: 보성군"
          value={draft.city}
        />
        <TextInput
          label="운영 기관"
          onChange={(sourceName) => updateDraft({ sourceName })}
          placeholder="예: 보성 로컬페이지 운영팀"
          value={draft.sourceName}
        />
        <TextInput
          label="공고/홈페이지 URL"
          onChange={(sourceUrl) => updateDraft({ sourceUrl })}
          placeholder="https://nuvio.kr/local"
          value={draft.sourceUrl}
        />
      </div>
    </PanelCard>
  );
}

function GuidePanel({
  draft,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  return (
    <PanelCard icon={<WalletCards size={19} />} title={panelLabels.guide}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="지원 혜택"
          onChange={(subsidyLabel) => updateDraft({ subsidyLabel })}
          placeholder="예: 숙박 1박 및 차문화 체험"
          value={draft.subsidyLabel}
        />
        <TextInput
          inputMode="numeric"
          label="지원금"
          onChange={(value) => updateDraft({ subsidyAmount: parseAmount(value) })}
          placeholder="예: 200000"
          value={String(draft.subsidyAmount || "")}
        />
        <TextInput
          label="참가비"
          onChange={(fee) => updateDraft({ fee })}
          placeholder="예: 무료"
          value={draft.fee}
        />
        <TextInput
          label="문의 연락처"
          onChange={(phone) => updateDraft({ phone })}
          placeholder="예: 010-0000-0000"
          value={draft.phone}
        />
        <TextInput
          label="신청 URL"
          onChange={(applyUrl) => updateDraft({ applyUrl })}
          placeholder="https://nuvio.kr/programs/..."
          value={draft.applyUrl}
        />
      </div>
    </PanelCard>
  );
}

function ManagementPanel({
  draft,
  updateDraft,
}: {
  draft: HostProgramDraft;
  updateDraft: (patch: Partial<HostProgramDraft>) => void;
}) {
  return (
    <PanelCard icon={<Settings size={19} />} title={panelLabels.management}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex min-h-20 items-center justify-between gap-4 rounded-md border border-[#F3E2D5] bg-[#FFFDFB] p-4">
          <span>
            <span className="block text-sm font-black text-[#0D0D0C]">
              공개 상태
            </span>
            <span className="mt-1 block text-sm font-bold text-[#8B7A6E]">
              켜면 공개 프로그램으로 사용할 준비 상태가 됩니다.
            </span>
          </span>
          <input
            checked={draft.published}
            className="size-5 accent-[#FE701E]"
            onChange={(event) => updateDraft({ published: event.target.checked })}
            type="checkbox"
          />
        </label>
        <div className="rounded-md border border-[#F3E2D5] bg-[#FFFDFB] p-4">
          <p className="text-sm font-black text-[#0D0D0C]">최근 수정</p>
          <p className="mt-2 text-sm font-bold text-[#8B7A6E]">
            {formatDateTime(draft.updatedAt)}
          </p>
        </div>
      </div>
    </PanelCard>
  );
}

function DeletePanel({ draft }: { draft: HostProgramDraft }) {
  return (
    <PanelCard icon={<Trash2 size={19} />} title={panelLabels.delete}>
      <div className="rounded-md border border-red-100 bg-red-50 p-4">
        <h2 className="text-lg font-black text-red-700">
          {draft.title} 삭제 기능은 아직 연결하지 않았습니다.
        </h2>
        <p className="mt-2 text-sm font-bold leading-6 text-red-700/80">
          실제 신청자와 신청폼이 연결될 수 있으므로 삭제/취소는 별도 확인 절차를
          붙여서 구현하는 것이 안전합니다.
        </p>
      </div>
    </PanelCard>
  );
}

function ToolCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      className="rounded-md border border-[#F3E2D5] bg-white p-5 transition hover:border-[#FE701E]/60 hover:bg-[#FFF6EC]"
      href={href}
    >
      <h2 className="flex items-center gap-2 text-lg font-black text-[#0D0D0C]">
        <span className="text-[#FE701E]">{icon}</span>
        {title}
      </h2>
      <p className="mt-2 text-sm font-bold leading-6 text-[#8B7A6E]">
        {description}
      </p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#FE701E]">
        열기
        <ArrowRight size={15} />
      </span>
    </Link>
  );
}

function PanelCard({
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
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#FFF6EC] p-3">
      <p className="text-xs font-black text-[#A06B4F]">{label}</p>
      <p className="mt-1 font-mono text-lg font-black text-[#0D0D0C]">{value}</p>
    </div>
  );
}

function TextInput({
  inputMode,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[#5B3A29]">{label}</span>
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

function SelectInput({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[#5B3A29]">{label}</span>
      <select
        className="h-11 rounded-md border border-[#E6D6CA] bg-white px-3 text-sm font-bold text-[#0D0D0C] outline-none transition focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/15"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  onChange,
  placeholder,
  rows = 4,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[#5B3A29]">{label}</span>
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

function findProgramDraft(
  drafts: HostProgramDraft[],
  programId: string,
  program?: HostProgramOverview,
): HostProgramDraft | undefined {
  const ids = new Set(
    [programId, program?.id, program?.slug, program ? hostProgramId(program.title) : ""]
      .filter(Boolean)
      .map((value) => String(value)),
  );

  return drafts.find((draft) => {
    const draftIds = [
      draft.id,
      draft.slug ?? "",
      hostProgramId(draft.title),
    ];
    return draftIds.some((id) => ids.has(id));
  });
}

function normalizePanel(value: string | null): ProgramPanel {
  if (
    value === "basic" ||
    value === "detail" ||
    value === "place" ||
    value === "guide" ||
    value === "management" ||
    value === "delete"
  ) {
    return value;
  }

  return "dashboard";
}

function parseHashtags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim().replace(/^#/u, ""))
    .filter(Boolean)
    .slice(0, 12);
}

function parseAmount(value: string): number {
  const normalized = value.replace(/[^\d]/gu, "");
  return normalized ? Number(normalized) : 0;
}

function statusLabel(status?: ProgramStatus): string {
  return statusOptions.find((option) => option.value === status)?.label ?? "상태 미정";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "저장 전";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
