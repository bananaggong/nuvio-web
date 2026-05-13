"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock3,
  Database,
  Download,
  Loader2,
  MailCheck,
  MessageSquareText,
  Plus,
  Save,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readHostApplicationsFromStorage } from "@/lib/host-operations";
import type { HostApplication } from "@/lib/host-operations";
import {
  findHostProgramOverview,
  findHostProjectOverview,
  hostProgramPath,
  hostProjectPath,
} from "@/lib/host-projects";
import {
  buildMessageExportCsv,
  buildMessageRecipientPreview,
  campaignStatusLabels,
  channelLabels,
  createMessageCampaign,
  mergeMessageCampaigns,
  readMessageCampaigns,
  readMessageTemplates,
  targetStatusLabels,
  targetStatusOptions,
  writeMessageCampaigns,
} from "@/lib/message-automation";
import type {
  MessageCampaign,
  MessageCampaignStatus,
  MessageChannel,
  MessageTargetStatus,
} from "@/lib/message-automation";
import {
  mergeReportProjects,
  readReportProjects,
  writeReportProjects,
} from "@/lib/report-automation";
import type { ReportProject } from "@/lib/report-automation";

const channelOptions: MessageChannel[] = ["email", "sms", "kakao"];
const campaignStatusOptions: MessageCampaignStatus[] = [
  "draft",
  "scheduled",
  "sent",
];

export function HostMessageAutomation({
  programId,
  projectId,
}: {
  programId?: string;
  projectId?: string;
}) {
  const [applications, setApplications] = useState(readHostApplicationsFromStorage);
  const [reportProjects, setReportProjects] =
    useState<ReportProject[]>(readReportProjects);
  const [templates] = useState(readMessageTemplates);
  const [campaigns, setCampaigns] = useState<MessageCampaign[]>(
    readMessageCampaigns,
  );
  const [selectedId, setSelectedId] = useState(campaigns[0]?.id);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const selectedCampaign = useMemo(
    () =>
      campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0],
    [campaigns, selectedId],
  );
  const project = useMemo(() => {
    if (!projectId) return undefined;
    return findHostProjectOverview(projectId, applications, reportProjects);
  }, [applications, projectId, reportProjects]);
  const program = useMemo(() => {
    if (!projectId || !programId) return undefined;
    return findHostProgramOverview(
      projectId,
      programId,
      applications,
      reportProjects,
    );
  }, [applications, programId, projectId, reportProjects]);
  const projectApplications = program
    ? program.applications
    : project
      ? project.applications
      : applications;
  const projectBasePath = projectId ? hostProjectPath(projectId) : undefined;
  const programBasePath =
    projectId && program ? hostProgramPath(projectId, program.id) : undefined;
  const recipients = useMemo(() => {
    if (!selectedCampaign) return [];
    return buildMessageRecipientPreview(
      selectedCampaign,
      templates,
      projectApplications,
    );
  }, [projectApplications, selectedCampaign, templates]);
  const scheduledCount = campaigns.filter(
    (campaign) => campaign.status === "scheduled",
  ).length;
  const sentCount = campaigns.filter((campaign) => campaign.status === "sent").length;

  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseState() {
      try {
        const [applicationsResponse, campaignsResponse, reportsResponse] = await Promise.all([
          fetch("/api/host/applications", { cache: "no-store" }),
          fetch("/api/host/message-campaigns", { cache: "no-store" }),
          fetch("/api/host/reports", { cache: "no-store" }),
        ]);

        if (applicationsResponse.ok) {
          const payload = (await applicationsResponse.json()) as {
            data?: HostApplication[];
          };
          const databaseApplications = Array.isArray(payload.data)
            ? payload.data
            : [];

          if (isMounted && databaseApplications.length > 0) {
            setApplications(databaseApplications);
          }
        }

        if (campaignsResponse.ok) {
          const payload = (await campaignsResponse.json()) as {
            data?: MessageCampaign[];
          };
          const databaseCampaigns = Array.isArray(payload.data) ? payload.data : [];

          if (isMounted && databaseCampaigns.length > 0) {
            setCampaigns((currentCampaigns) => {
              const nextCampaigns = mergeMessageCampaigns(
                databaseCampaigns,
                currentCampaigns,
              );
              writeMessageCampaigns(nextCampaigns);
              return nextCampaigns;
            });
            setSelectedId((currentId) => currentId ?? databaseCampaigns[0]?.id);
          }
        }

        if (reportsResponse.ok) {
          const payload = (await reportsResponse.json()) as {
            data?: ReportProject[];
          };
          const databaseProjects = Array.isArray(payload.data) ? payload.data : [];

          if (isMounted && databaseProjects.length > 0) {
            setReportProjects((currentProjects) => {
              const nextProjects = mergeReportProjects(databaseProjects, currentProjects);
              writeReportProjects(nextProjects);
              return nextProjects;
            });
          }
        }
      } catch {
        if (isMounted) {
          setSyncError("DB 캠페인을 불러오지 못했습니다.");
        }
      }
    }

    loadDatabaseState();

    return () => {
      isMounted = false;
    };
  }, []);

  function saveCampaigns(nextCampaigns: MessageCampaign[]) {
    setCampaigns(nextCampaigns);
    writeMessageCampaigns(nextCampaigns);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function updateCampaign(patch: Partial<MessageCampaign>) {
    if (!selectedCampaign) return;
    setSyncMessage("");
    setSyncError("");
    saveCampaigns(
      campaigns.map((campaign) =>
        campaign.id === selectedCampaign.id
          ? { ...campaign, ...patch, updatedAt: new Date().toISOString() }
          : campaign,
      ),
    );
  }

  function addCampaign() {
    const nextCampaign = createMessageCampaign(templates);
    setSyncMessage("");
    setSyncError("");
    saveCampaigns([nextCampaign, ...campaigns]);
    setSelectedId(nextCampaign.id);
  }

  async function syncSelectedCampaign() {
    if (!selectedCampaign) return;

    setIsSyncing(true);
    setSyncMessage("");
    setSyncError("");

    try {
      const response = await fetch("/api/host/message-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedCampaign),
      });
      const payload = (await response.json()) as {
        data?: MessageCampaign;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "DB 저장에 실패했습니다.");
      }

      const nextCampaigns = mergeMessageCampaigns(
        [payload.data],
        campaigns.filter(
          (campaign) =>
            campaign.id !== selectedCampaign.id &&
            campaign.id !== payload.data?.id,
        ),
      );

      saveCampaigns(nextCampaigns);
      setSelectedId(payload.data.id);
      setSyncMessage("Supabase DB에 저장되었습니다.");
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "DB 저장에 실패했습니다.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  function markSent() {
    updateCampaign({ status: "sent" });
  }

  function downloadCampaignCsv() {
    if (!selectedCampaign) return;
    downloadTextFile(
      "nuvio-message-queue.csv",
      buildMessageExportCsv(selectedCampaign, templates, projectApplications),
      "text/csv",
    );
  }

  if (!selectedCampaign) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white"
          onClick={addCampaign}
          type="button"
        >
          <Plus size={17} />
          캠페인 만들기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href={programBasePath ?? projectBasePath ?? "/host"}
        >
          <ArrowLeft size={16} />
          {programBasePath ? "프로그램 허브" : projectBasePath ? "프로젝트 허브" : "운영 콘솔"}
        </Link>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          onClick={addCampaign}
          type="button"
        >
          <Plus size={16} />
          새 캠페인
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
          disabled={isSyncing}
          onClick={syncSelectedCampaign}
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
          onClick={downloadCampaignCsv}
          type="button"
        >
          <Download size={16} />
          큐 내보내기
        </button>
      </div>

      <section className="overflow-hidden rounded-md bg-slate-950 p-5 text-white sm:p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-teal-200">
          <Sparkles size={18} />
          {program ? "프로그램 메시지" : project ? "프로젝트 메시지" : "메시지 자동화 센터"}
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <h1 className="max-w-3xl text-2xl font-black leading-tight sm:text-3xl md:text-4xl">
              {program
                ? `${program.title} 신청자에게 보낼 안내 메시지를 예약합니다.`
                : project
                ? `${project.title} 신청자에게 보낼 안내 메시지를 예약합니다.`
                : "신청자 상태에 맞춰 안내 메시지를 예약합니다."}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              {program
                ? "수신자 큐는 이 프로그램에 신청한 사람만 기준으로 생성됩니다."
                : project
                ? "수신자 큐는 이 프로젝트에 연결된 신청자만 기준으로 생성됩니다."
                : "템플릿, 대상 상태, 발송 채널을 조합해 수신자 큐를 만들고 DB 연결 후에는 예약 발송 이력을 서버에 기록합니다."}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <HeroMetric label="수신 대상" value={`${recipients.length}명`} />
            <HeroMetric label="예약 캠페인" value={`${scheduledCount}개`} />
            <HeroMetric label="발송 완료" value={`${sentCount}개`} />
          </div>
        </div>
      </section>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-2">
          {campaigns.map((campaign) => (
            <button
              className={`w-full rounded-md border p-3 text-left ${
                campaign.id === selectedCampaign.id
                  ? "border-[var(--primary)] bg-teal-50"
                  : "border-slate-200 bg-white"
              }`}
              key={campaign.id}
              onClick={() => setSelectedId(campaign.id)}
              type="button"
            >
              <p className="break-words font-black text-slate-950">
                {campaign.name}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {channelLabels[campaign.channel]} ·{" "}
                {campaignStatusLabels[campaign.status]}
              </p>
            </button>
          ))}
        </aside>

        <main className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <MessageSquareText className="text-[var(--primary)]" size={20} />
              캠페인 설정
            </h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">캠페인명</span>
                <input
                  className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateCampaign({ name: event.target.value })}
                  value={selectedCampaign.name}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">템플릿</span>
                  <select
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateCampaign({ templateId: event.target.value })
                    }
                    value={selectedCampaign.templateId}
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">발송 채널</span>
                  <select
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateCampaign({
                        channel: event.target.value as MessageChannel,
                      })
                    }
                    value={selectedCampaign.channel}
                  >
                    {channelOptions.map((channel) => (
                      <option key={channel} value={channel}>
                        {channelLabels[channel]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">대상 상태</span>
                  <select
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateCampaign({
                        targetStatus: event.target.value as MessageTargetStatus,
                      })
                    }
                    value={selectedCampaign.targetStatus}
                  >
                    {targetStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {targetStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">예약 시간</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateCampaign({ scheduledAt: event.target.value })
                    }
                    type="datetime-local"
                    value={selectedCampaign.scheduledAt}
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">상태</span>
                <select
                  className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                  onChange={(event) =>
                    updateCampaign({
                      status: event.target.value as MessageCampaignStatus,
                    })
                  }
                  value={selectedCampaign.status}
                >
                  {campaignStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {campaignStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-black text-white"
                onClick={() => updateCampaign({ status: "scheduled" })}
                type="button"
              >
                <Clock3 size={16} />
                예약 처리
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700"
                onClick={markSent}
                type="button"
              >
                <Send size={16} />
                발송 완료
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
                disabled={isSyncing}
                onClick={syncSelectedCampaign}
                type="button"
              >
                {isSyncing ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Database size={16} />
                )}
                Supabase
              </button>
            </div>

            <div
              aria-live="polite"
              className="mt-5 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500"
            >
              {saved ? <Check size={16} className="text-[var(--primary)]" /> : <Save size={16} />}
              {saved ? "저장됨" : "변경 사항 자동 저장"}
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
          </section>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-md border border-slate-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <Users className="text-[var(--primary)]" size={19} />
                수신자 큐
              </h2>
              <div className="mt-4 grid gap-2">
                {recipients.length > 0 ? (
                  recipients.map((recipient) => (
                    <div
                      className="rounded-md bg-[var(--surface-muted)] p-3"
                      key={recipient.applicationId}
                    >
                      <p className="font-black text-slate-950">
                        {recipient.applicantName}
                      </p>
                      <p className="mt-1 break-words text-xs font-bold text-slate-500">
                        {recipient.contact} · {targetStatusLabels[recipient.status]}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md bg-[var(--surface-muted)] p-3 text-sm font-bold text-slate-500">
                    현재 조건에 맞는 수신자가 없습니다.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <MailCheck className="text-[var(--primary)]" size={19} />
                발송 파일
              </h2>
              <button
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
                onClick={downloadCampaignCsv}
                type="button"
              >
                <Download size={16} />
                CSV 다운로드
              </button>
            </section>
          </aside>

          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5 xl:col-span-2">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <Sparkles className="text-[var(--primary)]" size={20} />
              메시지 미리보기
            </h2>
            <div className="mt-4 grid gap-3">
              {recipients.slice(0, 5).map((recipient) => (
                <article
                  className="rounded-md bg-[var(--surface-muted)] p-4"
                  key={recipient.applicationId}
                >
                  <p className="text-sm font-black text-[var(--primary)]">
                    {recipient.applicantName} · {recipient.programTitle}
                  </p>
                  <p className="mt-2 break-words text-sm leading-7 text-slate-700">
                    {recipient.body}
                  </p>
                </article>
              ))}
              {recipients.length === 0 ? (
                <p className="rounded-md bg-[var(--surface-muted)] p-4 text-sm font-bold text-slate-500">
                  대상 상태를 바꾸면 메시지 미리보기가 생성됩니다.
                </p>
              ) : null}
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
