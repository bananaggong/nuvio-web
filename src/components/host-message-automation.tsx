"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Clock3,
  Database,
  Download,
  Inbox,
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
import {
  findHostProgramOverview,
  findHostProjectOverview,
  findStandaloneHostProgramOverview,
  hostProgramPath,
  hostProjectPath,
  hostStandaloneProgramPath,
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
} from "@/lib/message-automation";
import type {
  MessageCampaign,
  MessageCampaignStatus,
  MessageChannel,
  MessageTargetStatus,
} from "@/lib/message-automation";
import {
  hostInquiryStatusLabels,
  normalizeHostInquiry,
  type HostInquiry,
  type HostInquiryStatus,
} from "@/lib/host-inquiries";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

const channelOptions: MessageChannel[] = ["email", "sms", "kakao"];
const campaignStatusOptions: MessageCampaignStatus[] = [
  "draft",
  "scheduled",
  "sent",
];

export function HostMessageAutomation({
  panel,
  programId,
  projectId,
}: {
  panel?: string;
  programId?: string;
  projectId?: string;
}) {
  const { applications, programs: hostPrograms, reportProjects } = useHostOperationsData();
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
    return findHostProjectOverview(projectId, applications, reportProjects, hostPrograms);
  }, [applications, hostPrograms, projectId, reportProjects]);
  const program = useMemo(() => {
    if (projectId && programId) {
      return findHostProgramOverview(
        projectId,
        programId,
        applications,
        reportProjects,
        hostPrograms,
      );
    }
    if (programId) {
      return findStandaloneHostProgramOverview(
        programId,
        applications,
        reportProjects,
        hostPrograms,
      );
    }
    return undefined;
  }, [applications, hostPrograms, programId, projectId, reportProjects]);
  const projectApplications = program
    ? program.applications
    : project
      ? project.applications
      : applications;
  const projectBasePath = projectId ? hostProjectPath(projectId) : undefined;
  const programBasePath =
    projectId && program
      ? hostProgramPath(projectId, program.id)
      : program
        ? hostStandaloneProgramPath(program.id)
        : undefined;
  const recipients = useMemo(() => {
    if (!selectedCampaign) return [];
    return buildMessageRecipientPreview(
      selectedCampaign,
      templates,
      projectApplications,
    );
  }, [projectApplications, selectedCampaign, templates]);
  const shouldShowInquiries =
    panel === "inquiry" || (!programId && !projectId && !panel);

  useEffect(() => {
    if (shouldShowInquiries) return;

    let isMounted = true;

    async function loadDatabaseState() {
      try {
        const [campaignsResponse] = await Promise.all([
          fetch("/api/host/message-campaigns", { cache: "no-store" }),
        ]);

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
              return nextCampaigns;
            });
            setSelectedId((currentId) => currentId ?? databaseCampaigns[0]?.id);
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
  }, [shouldShowInquiries]);

  if (shouldShowInquiries) {
    return (
      <HostInquiryInbox
        programBasePath={programBasePath}
        programId={program?.id ?? programId}
        programTitle={program?.title}
        projectBasePath={projectBasePath}
      />
    );
  }

  function saveCampaigns(nextCampaigns: MessageCampaign[]) {
    setCampaigns(nextCampaigns);
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
          {programBasePath ? "프로그램 허브" : projectBasePath ? "폴더" : "운영 콘솔"}
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

function HostInquiryInbox({
  programBasePath,
  programId,
  programTitle,
  projectBasePath,
}: {
  programBasePath?: string;
  programId?: string;
  programTitle?: string;
  projectBasePath?: string;
}) {
  const [inquiries, setInquiries] = useState<HostInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const scoped = Boolean(programId);
  const filteredInquiries = inquiries;
  const statusCounts = useMemo(
    () =>
      filteredInquiries.reduce<Record<HostInquiryStatus, number>>(
        (counts, inquiry) => {
          counts[inquiry.status] += 1;
          return counts;
        },
        { answered: 0, closed: 0, inReview: 0, new: 0 },
      ),
    [filteredInquiries],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadInquiries() {
      setIsLoading(true);
      setError("");

      try {
        const query = programId
          ? `?programId=${encodeURIComponent(programId)}`
          : "";
        const response = await fetch(`/api/host/inquiries${query}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: HostInquiry[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "문의 목록을 불러오지 못했습니다.");
        }

        const nextInquiries = Array.isArray(payload.data)
          ? payload.data.map(normalizeHostInquiry)
          : [];

        if (isMounted) setInquiries(nextInquiries);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "문의 목록을 불러오지 못했습니다.",
          );
          setInquiries([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadInquiries();

    return () => {
      isMounted = false;
    };
  }, [programId]);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-[#F3E2D5] bg-white px-3 text-sm font-black text-[#5B3A29]"
          href={programBasePath ?? projectBasePath ?? "/host"}
        >
          <ArrowLeft size={16} />
          {programBasePath ? "프로그램 화면" : projectBasePath ? "폴더" : "호스트 홈"}
        </Link>
        <Link
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-[#FE701E] px-3 text-sm font-black text-white"
          href="/host/forms?kind=inquiry"
        >
          <CircleHelp size={16} />
          문의 양식 관리
        </Link>
      </div>

      <section className="rounded-md border border-[#F3E2D5] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black text-[#FE701E]">
              <Inbox size={18} />
              {scoped ? "프로그램 문의" : "로컬채널 문의"}
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-[#0D0D0C] sm:text-3xl">
              {scoped ? `${programTitle ?? "프로그램"} 문의사항` : "전체 문의사항"}
            </h1>
            <p className="mt-2 text-sm font-bold leading-6 text-[#8B7A6E]">
              {scoped
                ? "전체 문의 중 이 프로그램과 연결된 문의만 보여줍니다."
                : "로컬채널로 들어온 모든 프로그램 문의를 한곳에서 확인합니다."}
            </p>
          </div>
          {error ? (
            <span className="rounded-md bg-red-50 px-3 py-2 text-xs font-black text-red-700">
              {error}
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(["new", "inReview", "answered", "closed"] as HostInquiryStatus[]).map(
            (status) => (
              <div
                className="rounded-md border border-[#F3E2D5] bg-[#FFF8F2] p-4"
                key={status}
              >
                <p className="text-xs font-black text-[#8B7A6E]">
                  {hostInquiryStatusLabels[status]}
                </p>
                <p className="mt-2 text-2xl font-black text-[#0D0D0C]">
                  {statusCounts[status]}건
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-md border border-[#F3E2D5] bg-white shadow-sm">
        {isLoading ? (
          <div className="grid min-h-72 place-items-center text-sm font-black text-[#8B7A6E]">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={17} />
              문의를 불러오는 중입니다.
            </span>
          </div>
        ) : filteredInquiries.length > 0 ? (
          <div className="divide-y divide-[#F3E2D5]">
            {filteredInquiries.map((inquiry) => (
              <article className="grid gap-4 p-5 lg:grid-cols-[1fr_220px]" key={inquiry.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#FFF1E8] px-3 py-1 text-xs font-black text-[#FE701E]">
                      {hostInquiryStatusLabels[inquiry.status]}
                    </span>
                    <span className="text-xs font-bold text-[#8B7A6E]">
                      {formatDate(inquiry.submittedAt)}
                    </span>
                  </div>
                  <h2 className="mt-3 break-words text-lg font-black text-[#0D0D0C]">
                    {inquiry.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 break-words text-sm font-bold leading-6 text-[#5B3A29]">
                    {inquiry.message}
                  </p>
                  {inquiry.programTitle ? (
                    <p className="mt-3 text-xs font-black text-[#8B7A6E]">
                      연결 프로그램 · {inquiry.programTitle}
                    </p>
                  ) : null}
                </div>
                <aside className="rounded-md bg-[#F7F5F3] p-4 text-sm">
                  <p className="font-black text-[#0D0D0C]">{inquiry.contactName}</p>
                  <p className="mt-2 break-words font-bold text-[#6D7A8A]">
                    {inquiry.contactEmail || "이메일 없음"}
                  </p>
                  <p className="mt-1 break-words font-bold text-[#6D7A8A]">
                    {inquiry.contactPhone || "연락처 없음"}
                  </p>
                </aside>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-md bg-[#FFF1E8] text-[#FE701E]">
                <Inbox size={22} />
              </span>
              <h2 className="mt-4 text-xl font-black text-[#0D0D0C]">
                아직 문의가 없습니다.
              </h2>
              <p className="mt-2 text-sm font-bold leading-6 text-[#8B7A6E]">
                {scoped
                  ? "이 프로그램으로 접수된 문의가 생기면 이곳에 표시됩니다."
                  : "로컬채널 또는 프로그램 상세페이지에서 접수된 문의가 이곳에 모입니다."}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
