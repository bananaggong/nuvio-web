"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  FileText,
  Layers3,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  buildGeneratedReportSections,
  buildReportChecklist,
  buildReportJson,
  buildReportMarkdown,
  createActivityEvent,
  createBudgetCategory,
  createEvidenceRule,
  createExpenseEvent,
  createManualField,
  createReportProject,
  evidenceStatusLabels,
  getExpenseEvidenceItems,
  mergeReportProjects,
  operationFieldGroupLabels,
  operationFieldTypeLabels,
  paymentMethodLabels,
  reportSectionLabels,
  reportSectionOrder,
  reportStatusLabels,
  summarizeReportProject,
} from "@/lib/report-automation";
import type {
  ActivityEvent,
  BudgetCategory,
  EvidenceItem,
  EvidenceItemStatus,
  EvidenceRule,
  ExpenseEvent,
  OperationFieldGroup,
  OperationFieldType,
  ReportManualField,
  ReportProject,
  ReportProjectStatus,
  ReportSectionId,
} from "@/lib/report-automation";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

const reportStatusOptions: ReportProjectStatus[] = ["draft", "review", "ready"];
const activePanels = ["overview", "expenses", "activities", "fields", "export"] as const;
type ActivePanel = (typeof activePanels)[number];

const activePanelLabels: Record<ActivePanel, string> = {
  activities: "활동",
  export: "마감",
  expenses: "지출/증빙",
  fields: "필드",
  overview: "프로젝트",
};

const operationFieldGroups = Object.keys(
  operationFieldGroupLabels,
) as OperationFieldGroup[];
const operationFieldTypes = Object.keys(
  operationFieldTypeLabels,
) as OperationFieldType[];
const paymentMethods = Object.keys(paymentMethodLabels) as ExpenseEvent["paymentMethod"][];

export function HostReportAutomation() {
  const {
    applications,
    programs: hostPrograms,
    reportProjects: projects,
    setReportProjects: setProjects,
  } = useHostOperationsData();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [activePanel, setActivePanel] = useState<ActivePanel>("overview");
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? projects[0],
    [projects, selectedId],
  );
  const programOptions = useMemo(() => {
    const titles = [
      ...hostPrograms.map((program) => program.title),
      ...applications.map((application) => application.programTitle),
    ];
    return ["전체 프로그램", ...Array.from(new Set(titles))];
  }, [applications, hostPrograms]);
  const summary = useMemo(
    () =>
      selectedProject
        ? summarizeReportProject(selectedProject, applications)
        : undefined,
    [applications, selectedProject],
  );
  const checklist = useMemo(
    () =>
      selectedProject ? buildReportChecklist(selectedProject, applications) : [],
    [applications, selectedProject],
  );
  const sections = useMemo(
    () =>
      selectedProject
        ? buildGeneratedReportSections(selectedProject, applications)
        : [],
    [applications, selectedProject],
  );

  function saveProjects(nextProjects: ReportProject[]) {
    setProjects(nextProjects);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function replaceSelectedProject(nextProject: ReportProject) {
    setSyncMessage("");
    setSyncError("");
    saveProjects(
      projects.map((project) =>
        project.id === nextProject.id
          ? { ...nextProject, updatedAt: new Date().toISOString() }
          : project,
      ),
    );
  }

  function updateProject(patch: Partial<ReportProject>) {
    if (!selectedProject) return;
    replaceSelectedProject({ ...selectedProject, ...patch });
  }

  function addProject() {
    const nextProject = createReportProject();
    setSyncMessage("");
    setSyncError("");
    saveProjects([nextProject, ...projects]);
    setSelectedId(nextProject.id);
    setActivePanel("overview");
  }

  async function syncSelectedProject() {
    if (!selectedProject) return;

    setIsSyncing(true);
    setSyncMessage("");
    setSyncError("");

    try {
      const response = await fetch("/api/host/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedProject),
      });
      const payload = (await response.json()) as {
        data?: ReportProject;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "DB 저장에 실패했습니다.");
      }

      const nextProjects = mergeReportProjects(
        [payload.data],
        projects.filter(
          (project) =>
            project.id !== selectedProject.id && project.id !== payload.data?.id,
        ),
      );

      saveProjects(nextProjects);
      setSelectedId(payload.data.id);
      setSyncMessage("Supabase DB에 저장됐습니다.");
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "DB 저장에 실패했습니다.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  function downloadReport(format: "markdown" | "json") {
    if (!selectedProject) return;
    const content =
      format === "markdown"
        ? buildReportMarkdown(selectedProject, applications)
        : buildReportJson(selectedProject, applications);
    const fileName =
      format === "markdown"
        ? "nuvio-operation-closeout.md"
        : "nuvio-operation-data.json";
    downloadTextFile(fileName, content, format === "markdown" ? "text/markdown" : "application/json");
  }

  if (!selectedProject || !summary) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white"
          onClick={addProject}
          type="button"
        >
          <Plus size={17} />
          운영 프로젝트 만들기
        </button>
      </div>
    );
  }

  function updateBudgetCategory(categoryId: string, patch: Partial<BudgetCategory>) {
    if (!selectedProject) return;
    updateProject({
      budgetCategories: selectedProject.budgetCategories.map((category) =>
        category.id === categoryId ? { ...category, ...patch } : category,
      ),
    });
  }

  function updateEvidenceRule(ruleId: string, patch: Partial<EvidenceRule>) {
    if (!selectedProject) return;
    updateProject({
      evidenceRules: selectedProject.evidenceRules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule,
      ),
    });
  }

  function updateExpense(expenseId: string, patch: Partial<ExpenseEvent>) {
    if (!selectedProject) return;
    updateProject({
      expenseEvents: selectedProject.expenseEvents.map((expense) =>
        expense.id === expenseId ? { ...expense, ...patch } : expense,
      ),
    });
  }

  function updateActivity(activityId: string, patch: Partial<ActivityEvent>) {
    if (!selectedProject) return;
    updateProject({
      activityEvents: selectedProject.activityEvents.map((activity) =>
        activity.id === activityId ? { ...activity, ...patch } : activity,
      ),
    });
  }

  function updateManualField(fieldId: string, patch: Partial<ReportManualField>) {
    if (!selectedProject) return;
    updateProject({
      manualFields: selectedProject.manualFields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    });
  }

  function setExpenseEvidenceStatus(
    expense: ExpenseEvent,
    item: EvidenceItem,
    status: EvidenceItemStatus,
  ) {
    if (!selectedProject) return;
    const nextItems = getExpenseEvidenceItems(selectedProject, expense).map(
      (currentItem) =>
        currentItem.ruleId === item.ruleId
          ? { ...currentItem, status }
          : currentItem,
    );
    updateExpense(expense.id, { evidenceItems: nextItems });
  }

  function toggleProgram(programTitle: string) {
    if (!selectedProject) return;
    if (programTitle === "전체 프로그램") {
      updateProject({ connectedProgramIds: [], connectedProgramTitles: [] });
      return;
    }

    const matchedProgram = hostPrograms.find(
      (program) => program.title === programTitle,
    );
    const currentTitles = selectedProject.connectedProgramTitles;
    const currentIds = selectedProject.connectedProgramIds;
    const nextTitles = currentTitles.includes(programTitle)
      ? currentTitles.filter((title) => title !== programTitle)
      : [...currentTitles, programTitle];
    const nextIds = matchedProgram
      ? currentIds.includes(matchedProgram.id)
        ? currentIds.filter((id) => id !== matchedProgram.id)
        : [...currentIds, matchedProgram.id]
      : currentIds;
    updateProject({ connectedProgramIds: nextIds, connectedProgramTitles: nextTitles });
  }

  function toggleSection(sectionId: ReportSectionId) {
    const nextSections = selectedProject.sections.includes(sectionId)
      ? selectedProject.sections.filter((id) => id !== sectionId)
      : reportSectionOrder.filter(
          (id) => selectedProject.sections.includes(id) || id === sectionId,
        );
    updateProject({ sections: nextSections });
  }

  return (
    <div className="mx-auto min-w-0 max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          <ArrowLeft size={16} />
          운영 콘솔
        </Link>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          onClick={addProject}
          type="button"
        >
          <Plus size={16} />
          새 프로젝트
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
          disabled={isSyncing}
          onClick={syncSelectedProject}
          type="button"
        >
          {isSyncing ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Database size={16} />
          )}
          DB 저장
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
          onClick={() => downloadReport("markdown")}
          type="button"
        >
          <Download size={16} />
          마감 초안
        </button>
      </div>


      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-3">
          <section className="rounded-md border border-slate-200 bg-white p-3">
            <p className="px-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              운영 프로젝트
            </p>
            <div className="mt-3 grid gap-2">
              {projects.map((project) => {
                const projectSummary = summarizeReportProject(project, applications);

                return (
                  <button
                    className={`w-full rounded-md border p-3 text-left ${
                      project.id === selectedProject.id
                        ? "border-[var(--primary)] bg-teal-50"
                        : "border-slate-200 bg-white hover:border-[var(--primary)]"
                    }`}
                    key={project.id}
                    onClick={() => setSelectedId(project.id)}
                    type="button"
                  >
                    <p className="break-words font-black text-slate-950">
                      {project.title}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {reportStatusLabels[project.status]} · 준비율 {projectSummary.readiness}%
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-950">
              <ListChecks className="text-[var(--primary)]" size={17} />
              마감 체크리스트
            </h2>
            <div className="mt-3 grid gap-2">
              {checklist.map((item) => (
                <div
                  className="rounded-md bg-[var(--surface-muted)] p-3"
                  key={item.id}
                >
                  <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <span
                      className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full ${
                        item.done
                          ? "bg-[var(--primary)] text-white"
                          : "bg-white text-slate-400 ring-1 ring-slate-200"
                      }`}
                    >
                      {item.done ? <Check size={13} /> : null}
                    </span>
                    {item.label}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {item.helper}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="min-w-0">
          <div className="mb-4 flex flex-wrap gap-2">
            {activePanels.map((panel) => (
              <button
                className={`inline-flex h-10 items-center rounded-md border px-4 text-sm font-black ${
                  activePanel === panel
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[var(--primary)]"
                }`}
                key={panel}
                onClick={() => setActivePanel(panel)}
                type="button"
              >
                {activePanelLabels[panel]}
              </button>
            ))}
          </div>

          {activePanel === "overview" ? (
            <div className="grid gap-5">
              <section className="rounded-md border border-slate-200 bg-white p-5">
                <SectionTitle
                  icon={<Layers3 size={20} />}
                  title="운영 프로젝트 설정"
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="프로젝트명"
                    onChange={(value) => updateProject({ title: value })}
                    value={selectedProject.title}
                  />
                  <TextInput
                    label="로컬홈명"
                    onChange={(value) => updateProject({ villageName: value })}
                    value={selectedProject.villageName}
                  />
                  <TextInput
                    label="운영 조직"
                    onChange={(value) => updateProject({ agencyName: value })}
                    value={selectedProject.agencyName}
                  />
                  <TextInput
                    label="대표 이미지 URL"
                    onChange={(value) => updateProject({ imageUrl: value })}
                    value={selectedProject.imageUrl ?? ""}
                  />
                  <TextInput
                    label="담당자"
                    onChange={(value) => updateProject({ ownerName: value })}
                    value={selectedProject.ownerName}
                  />
                  <TextInput
                    label="운영 기간"
                    onChange={(value) => updateProject({ periodLabel: value })}
                    value={selectedProject.periodLabel}
                  />
                  <label className="grid gap-2">
                    <span className="text-sm font-black text-slate-700">
                      진행 상태
                    </span>
                    <select
                      className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
                      onChange={(event) =>
                        updateProject({
                          status: event.target.value as ReportProjectStatus,
                        })
                      }
                      value={selectedProject.status}
                    >
                      {reportStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {reportStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-5">
                <SectionTitle
                  icon={<Sparkles size={20} />}
                  title="공개 프로그램 연결"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {programOptions.map((programTitle) => {
                    const matchedProgram = hostPrograms.find(
                      (program) => program.title === programTitle,
                    );
                    const checked =
                      programTitle === "전체 프로그램"
                        ? selectedProject.connectedProgramIds.length === 0 &&
                          selectedProject.connectedProgramTitles.length === 0
                        : matchedProgram
                          ? selectedProject.connectedProgramIds.includes(matchedProgram.id) ||
                            selectedProject.connectedProgramTitles.includes(programTitle)
                          : selectedProject.connectedProgramTitles.includes(programTitle);

                    return (
                      <button
                        className={`rounded-md border px-3 py-2 text-sm font-black ${
                          checked
                            ? "border-[var(--primary)] bg-teal-50 text-teal-700"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                        key={programTitle}
                        onClick={() => toggleProgram(programTitle)}
                        type="button"
                      >
                        {programTitle}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-5">
                <SectionTitle icon={<BarChart3 size={20} />} title="예산 구조" />
                <div className="mt-4 grid gap-3">
                  {selectedProject.budgetCategories.map((category) => (
                    <div
                      className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_180px_36px]"
                      key={category.id}
                    >
                      <TextInput
                        label="상위 구분"
                        onChange={(value) =>
                          updateBudgetCategory(category.id, { parentLabel: value })
                        }
                        value={category.parentLabel}
                      />
                      <TextInput
                        label="예산 항목"
                        onChange={(value) =>
                          updateBudgetCategory(category.id, { label: value })
                        }
                        value={category.label}
                      />
                      <TextInput
                        label="계획 금액"
                        onChange={(value) =>
                          updateBudgetCategory(category.id, {
                            plannedAmount: Number(value) || 0,
                          })
                        }
                        type="number"
                        value={String(category.plannedAmount)}
                      />
                      <button
                        aria-label="예산 항목 삭제"
                        className="mt-7 grid size-9 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
                        onClick={() =>
                          updateProject({
                            budgetCategories:
                              selectedProject.budgetCategories.filter(
                                (item) => item.id !== category.id,
                              ),
                          })
                        }
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)]"
                  onClick={() =>
                    updateProject({
                      budgetCategories: [
                        ...selectedProject.budgetCategories,
                        createBudgetCategory(),
                      ],
                    })
                  }
                  type="button"
                >
                  <Plus size={16} />
                  예산 항목 추가
                </button>
              </section>
            </div>
          ) : null}

          {activePanel === "expenses" ? (
            <div className="grid gap-5">
              <section className="rounded-md border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <SectionTitle icon={<FileText size={20} />} title="지출 이벤트" />
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
                    onClick={() =>
                      updateProject({
                        expenseEvents: [
                          createExpenseEvent(selectedProject),
                          ...selectedProject.expenseEvents,
                        ],
                      })
                    }
                    type="button"
                  >
                    <Plus size={16} />
                    지출 추가
                  </button>
                </div>

                <div className="mt-4 grid gap-4">
                  {selectedProject.expenseEvents.map((expense) => (
                    <article
                      className="rounded-md border border-slate-200 p-4"
                      key={expense.id}
                    >
                      <div className="grid gap-3 lg:grid-cols-[1.4fr_130px_150px_1fr]">
                        <TextInput
                          label="지출명"
                          onChange={(value) => updateExpense(expense.id, { title: value })}
                          value={expense.title}
                        />
                        <TextInput
                          label="사용일"
                          onChange={(value) => updateExpense(expense.id, { spentAt: value })}
                          type="date"
                          value={expense.spentAt}
                        />
                        <TextInput
                          label="금액"
                          onChange={(value) =>
                            updateExpense(expense.id, { amount: Number(value) || 0 })
                          }
                          type="number"
                          value={String(expense.amount)}
                        />
                        <TextInput
                          label="지급처"
                          onChange={(value) => updateExpense(expense.id, { vendor: value })}
                          value={expense.vendor}
                        />
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_160px_1fr]">
                        <SelectInput
                          label="예산 항목"
                          onChange={(value) =>
                            updateExpense(expense.id, { categoryId: value })
                          }
                          options={selectedProject.budgetCategories.map((category) => ({
                            label: `${category.parentLabel} / ${category.label}`,
                            value: category.id,
                          }))}
                          value={expense.categoryId}
                        />
                        <SelectInput
                          label="결제수단"
                          onChange={(value) =>
                            updateExpense(expense.id, {
                              paymentMethod: value as ExpenseEvent["paymentMethod"],
                            })
                          }
                          options={paymentMethods.map((method) => ({
                            label: paymentMethodLabels[method],
                            value: method,
                          }))}
                          value={expense.paymentMethod}
                        />
                        <SelectInput
                          label="연결 활동"
                          onChange={(value) =>
                            updateExpense(expense.id, { linkedActivityId: value })
                          }
                          options={[
                            { label: "연결 없음", value: "" },
                            ...selectedProject.activityEvents.map((activity) => ({
                              label: activity.title,
                              value: activity.id,
                            })),
                          ]}
                          value={expense.linkedActivityId ?? ""}
                        />
                      </div>
                      <TextArea
                        label="메모"
                        onChange={(value) => updateExpense(expense.id, { memo: value })}
                        value={expense.memo ?? ""}
                      />

                      <div className="mt-4 rounded-md bg-slate-50 p-3">
                        <p className="text-sm font-black text-slate-800">
                          증빙 체크리스트
                        </p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {getExpenseEvidenceItems(selectedProject, expense).map((item) => (
                            <div
                              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3"
                              key={item.ruleId}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-800">
                                  {item.label}
                                </p>
                                <p className="mt-1 text-xs font-bold text-slate-500">
                                  {evidenceStatusLabels[item.status]}
                                </p>
                              </div>
                              <button
                                className={`shrink-0 rounded-md px-3 py-2 text-xs font-black ${
                                  item.status === "missing"
                                    ? "bg-slate-950 text-white"
                                    : "bg-teal-50 text-teal-700"
                                }`}
                                onClick={() =>
                                  setExpenseEvidenceStatus(
                                    expense,
                                    item,
                                    item.status === "missing" ? "submitted" : "missing",
                                  )
                                }
                                type="button"
                              >
                                {item.status === "missing" ? "수집 처리" : "되돌리기"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-black text-red-600"
                        onClick={() =>
                          updateProject({
                            expenseEvents: selectedProject.expenseEvents.filter(
                              (item) => item.id !== expense.id,
                            ),
                          })
                        }
                        type="button"
                      >
                        <Trash2 size={15} />
                        지출 삭제
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <SectionTitle icon={<ListChecks size={20} />} title="증빙 규칙 빌더" />
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700"
                    onClick={() =>
                      updateProject({
                        evidenceRules: [
                          ...selectedProject.evidenceRules,
                          createEvidenceRule(),
                        ],
                      })
                    }
                    type="button"
                  >
                    <Plus size={16} />
                    증빙 항목 추가
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  {selectedProject.evidenceRules.map((rule) => (
                    <div
                      className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_130px_100px_36px]"
                      key={rule.id}
                    >
                      <TextInput
                        label="증빙명"
                        onChange={(value) => updateEvidenceRule(rule.id, { label: value })}
                        value={rule.label}
                      />
                      <SelectInput
                        label="적용 예산"
                        onChange={(value) =>
                          updateEvidenceRule(rule.id, { categoryId: value })
                        }
                        options={[
                          { label: "전체 지출", value: "all" },
                          ...selectedProject.budgetCategories.map((category) => ({
                            label: category.label,
                            value: category.id,
                          })),
                        ]}
                        value={rule.categoryId}
                      />
                      <SelectInput
                        label="유형"
                        onChange={(value) =>
                          updateEvidenceRule(rule.id, {
                            type: value as EvidenceRule["type"],
                          })
                        }
                        options={[
                          { label: "파일", value: "file" },
                          { label: "체크", value: "check" },
                          { label: "텍스트", value: "text" },
                        ]}
                        value={rule.type}
                      />
                      <label className="mt-7 flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-2 text-xs font-black text-slate-700">
                        <input
                          checked={rule.required}
                          onChange={(event) =>
                            updateEvidenceRule(rule.id, {
                              required: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                        필수
                      </label>
                      <button
                        aria-label="증빙 규칙 삭제"
                        className="mt-7 grid size-9 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
                        onClick={() =>
                          updateProject({
                            evidenceRules: selectedProject.evidenceRules.filter(
                              (item) => item.id !== rule.id,
                            ),
                          })
                        }
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activePanel === "activities" ? (
            <section className="rounded-md border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SectionTitle icon={<CheckCircle2 size={20} />} title="활동/참석/사진 기록" />
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
                  onClick={() =>
                    updateProject({
                      activityEvents: [
                        createActivityEvent(),
                        ...selectedProject.activityEvents,
                      ],
                    })
                  }
                  type="button"
                >
                  <Plus size={16} />
                  활동 추가
                </button>
              </div>
              <div className="mt-4 grid gap-4">
                {selectedProject.activityEvents.map((activity) => (
                  <article
                    className="rounded-md border border-slate-200 p-4"
                    key={activity.id}
                  >
                    <div className="grid gap-3 lg:grid-cols-[1.3fr_130px_1fr_1fr]">
                      <TextInput
                        label="활동명"
                        onChange={(value) => updateActivity(activity.id, { title: value })}
                        value={activity.title}
                      />
                      <TextInput
                        label="일자"
                        onChange={(value) =>
                          updateActivity(activity.id, { activityAt: value })
                        }
                        type="date"
                        value={activity.activityAt}
                      />
                      <TextInput
                        label="장소"
                        onChange={(value) => updateActivity(activity.id, { place: value })}
                        value={activity.place}
                      />
                      <SelectInput
                        label="연결 프로그램"
                        onChange={(value) =>
                          updateActivity(activity.id, { relatedProgramTitle: value })
                        }
                        options={programOptions.map((programTitle) => ({
                          label: programTitle,
                          value: programTitle,
                        }))}
                        value={activity.relatedProgramTitle}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <TextInput
                        label="참석자 수"
                        onChange={(value) =>
                          updateActivity(activity.id, {
                            participantCount: Number(value) || 0,
                          })
                        }
                        type="number"
                        value={String(activity.participantCount)}
                      />
                      <TextInput
                        label="사진 수"
                        onChange={(value) =>
                          updateActivity(activity.id, {
                            photosCount: Number(value) || 0,
                          })
                        }
                        type="number"
                        value={String(activity.photosCount)}
                      />
                    </div>
                    <TextArea
                      label="활동 내용"
                      onChange={(value) =>
                        updateActivity(activity.id, { description: value })
                      }
                      value={activity.description}
                    />
                    <button
                      className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-black text-red-600"
                      onClick={() =>
                        updateProject({
                          activityEvents: selectedProject.activityEvents.filter(
                            (item) => item.id !== activity.id,
                          ),
                        })
                      }
                      type="button"
                    >
                      <Trash2 size={15} />
                      활동 삭제
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activePanel === "fields" ? (
            <section className="rounded-md border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SectionTitle icon={<Database size={20} />} title="운영/보고 필드 빌더" />
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
                  onClick={() =>
                    updateProject({
                      manualFields: [
                        ...selectedProject.manualFields,
                        createManualField(),
                      ],
                    })
                  }
                  type="button"
                >
                  <Plus size={16} />
                  필드 추가
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {selectedProject.manualFields.map((field) => (
                  <div
                    className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_120px_90px_1fr_36px]"
                    key={field.id}
                  >
                    <TextInput
                      label="필드명"
                      onChange={(value) => updateManualField(field.id, { label: value })}
                      value={field.label}
                    />
                    <SelectInput
                      label="그룹"
                      onChange={(value) =>
                        updateManualField(field.id, {
                          group: value as OperationFieldGroup,
                        })
                      }
                      options={operationFieldGroups.map((group) => ({
                        label: operationFieldGroupLabels[group],
                        value: group,
                      }))}
                      value={field.group}
                    />
                    <SelectInput
                      label="유형"
                      onChange={(value) =>
                        updateManualField(field.id, {
                          fieldType: value as OperationFieldType,
                        })
                      }
                      options={operationFieldTypes.map((type) => ({
                        label: operationFieldTypeLabels[type],
                        value: type,
                      }))}
                      value={field.fieldType}
                    />
                    <label className="mt-7 flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-2 text-xs font-black text-slate-700">
                      <input
                        checked={field.required}
                        onChange={(event) =>
                          updateManualField(field.id, {
                            required: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />
                      필수
                    </label>
                    <TextInput
                      label="값"
                      onChange={(value) => updateManualField(field.id, { value })}
                      value={field.value}
                    />
                    <button
                      aria-label="보고 필드 삭제"
                      className="mt-7 grid size-9 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
                      onClick={() =>
                        updateProject({
                          manualFields: selectedProject.manualFields.filter(
                            (item) => item.id !== field.id,
                          ),
                        })
                      }
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {activePanel === "export" ? (
            <div className="grid gap-5">
              <section className="rounded-md border border-slate-200 bg-white p-5">
                <SectionTitle icon={<Sparkles size={20} />} title="마감 초안" />
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-black text-white"
                    onClick={() => downloadReport("markdown")}
                    type="button"
                  >
                    <FileText size={16} />
                    Markdown 내보내기
                  </button>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700"
                    onClick={() => downloadReport("json")}
                    type="button"
                  >
                    <FileJson size={16} />
                    JSON 내보내기
                  </button>
                </div>
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-5">
                <SectionTitle icon={<ListChecks size={20} />} title="포함 섹션" />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {reportSectionOrder.map((sectionId) => {
                    const checked = selectedProject.sections.includes(sectionId);

                    return (
                      <button
                        aria-pressed={checked}
                        className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm font-black ${
                          checked
                            ? "border-[var(--primary)] bg-teal-50 text-teal-700"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                        key={sectionId}
                        onClick={() => toggleSection(sectionId)}
                        type="button"
                      >
                        {reportSectionLabels[sectionId]}
                        {checked ? <CheckCircle2 size={16} /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-5">
                <SectionTitle icon={<FileText size={20} />} title="자동 생성 요약" />
                <div className="mt-4 grid gap-3">
                  {sections.map((section) => (
                    <article
                      className="rounded-md bg-[var(--surface-muted)] p-4"
                      key={section.id}
                    >
                      <p className="text-sm font-black text-[var(--primary)]">
                        {section.title}
                      </p>
                      <p className="mt-2 break-words text-sm leading-7 text-slate-700">
                        {section.body}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </main>
      </div>

      <div
        aria-live="polite"
        className="mt-5 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500"
      >
        {saved ? <Check size={16} className="text-[var(--primary)]" /> : <Save size={16} />}
        {saved ? "저장됨" : "변경사항 자동 저장"}
        {syncMessage ? (
          <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-700">
            {syncMessage}
          </span>
        ) : null}
        {syncError ? (
          <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700">
            {syncError}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
      <span className="text-[var(--primary)]">{icon}</span>
      {title}
    </h2>
  );
}

function TextInput({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        className="h-11 min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
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
      <span className="text-sm font-black text-slate-700">{label}</span>
      <select
        className="h-11 min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[var(--primary)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
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
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="mt-3 grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <textarea
        className="min-h-24 rounded-md border border-slate-200 p-3 text-sm font-bold leading-6 outline-none focus:border-[var(--primary)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}
