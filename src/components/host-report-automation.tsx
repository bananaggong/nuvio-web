"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  ListChecks,
  Plus,
  Save,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { readHostApplicationsFromStorage } from "@/lib/host-operations";
import {
  buildGeneratedReportSections,
  buildReportChecklist,
  buildReportJson,
  buildReportMarkdown,
  createReportProject,
  readReportProjects,
  reportSectionLabels,
  reportSectionOrder,
  reportStatusLabels,
  writeReportProjects,
} from "@/lib/report-automation";
import type {
  ReportProject,
  ReportProjectStatus,
  ReportSectionId,
} from "@/lib/report-automation";

const reportStatusOptions: ReportProjectStatus[] = ["draft", "review", "ready"];

export function HostReportAutomation() {
  const [applications] = useState(readHostApplicationsFromStorage);
  const [projects, setProjects] = useState<ReportProject[]>(readReportProjects);
  const [selectedId, setSelectedId] = useState(projects[0]?.id);
  const [saved, setSaved] = useState(false);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? projects[0],
    [projects, selectedId],
  );
  const programOptions = useMemo(() => {
    const titles = applications.map((application) => application.programTitle);
    return ["전체 프로그램", ...Array.from(new Set(titles))];
  }, [applications]);
  const scopedApplications = useMemo(() => {
    if (!selectedProject) return [];
    if (selectedProject.programTitle === "전체 프로그램") return applications;
    return applications.filter(
      (application) => application.programTitle === selectedProject.programTitle,
    );
  }, [applications, selectedProject]);
  const checklist = useMemo(() => {
    if (!selectedProject) return [];
    return buildReportChecklist(selectedProject, applications);
  }, [applications, selectedProject]);
  const sections = useMemo(() => {
    if (!selectedProject) return [];
    return buildGeneratedReportSections(selectedProject, applications);
  }, [applications, selectedProject]);
  const readyCount = checklist.filter((item) => item.done).length;

  function saveProjects(nextProjects: ReportProject[]) {
    setProjects(nextProjects);
    writeReportProjects(nextProjects);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function updateProject(patch: Partial<ReportProject>) {
    if (!selectedProject) return;
    saveProjects(
      projects.map((project) =>
        project.id === selectedProject.id
          ? { ...project, ...patch, updatedAt: new Date().toISOString() }
          : project,
      ),
    );
  }

  function addProject() {
    const nextProject = createReportProject();
    saveProjects([nextProject, ...projects]);
    setSelectedId(nextProject.id);
  }

  function toggleSection(sectionId: ReportSectionId) {
    if (!selectedProject) return;
    const nextSections = selectedProject.sections.includes(sectionId)
      ? selectedProject.sections.filter((id) => id !== sectionId)
      : reportSectionOrder.filter(
          (id) => selectedProject.sections.includes(id) || id === sectionId,
        );
    updateProject({ sections: nextSections });
  }

  function downloadReport(format: "markdown" | "json") {
    if (!selectedProject) return;
    const content =
      format === "markdown"
        ? buildReportMarkdown(selectedProject, applications)
        : buildReportJson(selectedProject, applications);
    const fileName =
      format === "markdown"
        ? "nuvio-report-draft.md"
        : "nuvio-report-data.json";
    downloadTextFile(fileName, content, format === "markdown" ? "text/markdown" : "application/json");
  }

  if (!selectedProject) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white"
          onClick={addProject}
          type="button"
        >
          <Plus size={17} />
          보고서 만들기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
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
          새 보고서
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
          onClick={() => downloadReport("markdown")}
          type="button"
        >
          <Download size={16} />
          초안 저장
        </button>
      </div>

      <section className="overflow-hidden rounded-md bg-slate-950 p-5 text-white sm:p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-teal-200">
          <Sparkles size={18} />
          보고 자동화 센터
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <h1 className="max-w-3xl text-2xl font-black leading-tight sm:text-3xl md:text-4xl">
              제출용 결과보고서를 운영 데이터에서 바로 만듭니다.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              지금은 브라우저 저장소 기반 초안이며, DB 연결 후에는 보고서 프로젝트와
              내보내기 이력이 Supabase에 기록됩니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <HeroMetric label="보고 대상" value={`${scopedApplications.length}명`} />
            <HeroMetric label="체크 완료" value={`${readyCount}/${checklist.length}`} />
            <HeroMetric
              label="상태"
              value={reportStatusLabels[selectedProject.status]}
            />
          </div>
        </div>
      </section>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-2">
          {projects.map((project) => (
            <button
              className={`w-full rounded-md border p-3 text-left ${
                project.id === selectedProject.id
                  ? "border-[var(--primary)] bg-teal-50"
                  : "border-slate-200 bg-white"
              }`}
              key={project.id}
              onClick={() => setSelectedId(project.id)}
              type="button"
            >
              <p className="break-words font-black text-slate-950">{project.title}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {reportStatusLabels[project.status]} · {project.periodLabel}
              </p>
            </button>
          ))}
        </aside>

        <main className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <FileText className="text-[var(--primary)]" size={20} />
              보고서 설정
            </h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">보고서명</span>
                <input
                  className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateProject({ title: event.target.value })}
                  value={selectedProject.title}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">제출 기관</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateProject({ agencyName: event.target.value })
                    }
                    value={selectedProject.agencyName}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">담당자</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateProject({ ownerName: event.target.value })
                    }
                    value={selectedProject.ownerName}
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">대상 프로그램</span>
                  <select
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateProject({ programTitle: event.target.value })
                    }
                    value={selectedProject.programTitle}
                  >
                    {programOptions.map((programTitle) => (
                      <option key={programTitle} value={programTitle}>
                        {programTitle}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">운영 기간</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateProject({ periodLabel: event.target.value })
                    }
                    value={selectedProject.periodLabel}
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">진행 상태</span>
                <select
                  className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
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

            <div className="mt-6">
              <h3 className="text-lg font-black text-slate-950">포함 섹션</h3>
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
            </div>

            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-500">
              {saved ? <Check size={16} className="text-[var(--primary)]" /> : <Save size={16} />}
              {saved ? "저장됨" : "변경 사항 자동 저장"}
            </div>
          </section>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-md border border-slate-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <ListChecks className="text-[var(--primary)]" size={19} />
                제출 체크리스트
              </h2>
              <div className="mt-4 grid gap-2">
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

            <section className="rounded-md border border-slate-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <BarChart3 className="text-[var(--primary)]" size={19} />
                내보내기
              </h2>
              <div className="mt-4 grid gap-2">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-black text-white"
                  onClick={() => downloadReport("markdown")}
                  type="button"
                >
                  <FileText size={16} />
                  Markdown
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700"
                  onClick={() => downloadReport("json")}
                  type="button"
                >
                  <FileJson size={16} />
                  JSON
                </button>
              </div>
            </section>
          </aside>

          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5 xl:col-span-2">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <Sparkles className="text-[var(--primary)]" size={20} />
              자동 생성 초안
            </h2>
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
        </main>
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="text-xs font-black text-slate-300">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
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
