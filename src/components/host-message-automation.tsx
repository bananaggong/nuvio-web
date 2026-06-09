"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CircleHelp,
  Inbox,
  Loader2,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  findHostProgramOverview,
  findHostProgramDraft,
  findHostProgramDraftOverview,
  findHostProjectOverview,
  findStandaloneHostProgramOverview,
  getHostProgramSidebarStatus,
  hostProgramPath,
  hostProjectPath,
  hostStandaloneProgramPath,
} from "@/lib/host-projects";
import {
  buildMessageRecipientPreview,
  createMessageCampaign,
  mergeMessageCampaigns,
  readMessageCampaigns,
  readMessageTemplates,
} from "@/lib/message-automation";
import type {
  MessageCampaign,
  MessageCampaignStatus,
} from "@/lib/message-automation";
import {
  hostInquiryStatusLabels,
  normalizeHostInquiry,
  type HostInquiry,
  type HostInquiryStatus,
} from "@/lib/host-inquiries";
import { HostProgramSidebar } from "@/components/host-program-sidebar";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

type MessageListTab = "all" | "scheduled" | "sent";

const messageFigmaScaleStyle = {
  "--msg-3": "clamp(3px, 0.208vw, 4px)",
  "--msg-4": "clamp(4px, 0.278vw, 5.333px)",
  "--msg-6": "clamp(6px, 0.417vw, 8px)",
  "--msg-8": "clamp(8px, 0.556vw, 10.667px)",
  "--msg-12": "clamp(12px, 0.833vw, 16px)",
  "--msg-16": "clamp(16px, 1.111vw, 21.333px)",
  "--msg-18": "clamp(18px, 1.25vw, 24px)",
  "--msg-20": "clamp(20px, 1.389vw, 26.667px)",
  "--msg-22": "clamp(22px, 1.528vw, 29.333px)",
  "--msg-24": "clamp(24px, 1.667vw, 32px)",
  "--msg-28": "clamp(28px, 1.944vw, 37.333px)",
  "--msg-29": "clamp(29px, 2.014vw, 38.667px)",
  "--msg-34": "clamp(34px, 2.361vw, 45.333px)",
  "--msg-40": "clamp(40px, 2.778vw, 53.333px)",
  "--msg-47": "clamp(47px, 3.264vw, 62.667px)",
  "--msg-52": "clamp(52px, 3.611vw, 69.333px)",
  "--msg-65": "clamp(65px, 4.514vw, 86.667px)",
  "--msg-68": "clamp(68px, 4.722vw, 90.667px)",
  "--msg-69": "clamp(69px, 4.792vw, 92px)",
  "--msg-77": "clamp(77px, 5.347vw, 102.667px)",
  "--msg-91": "clamp(91px, 6.319vw, 121.333px)",
  "--msg-167": "clamp(167px, 11.597vw, 222.667px)",
  "--msg-180": "clamp(180px, 12.5vw, 240px)",
  "--msg-188": "clamp(188px, 13.056vw, 250.667px)",
  "--msg-192": "clamp(192px, 13.333vw, 256px)",
  "--msg-216": "clamp(216px, 15vw, 288px)",
  "--msg-228": "clamp(228px, 15.833vw, 304px)",
  "--msg-296": "clamp(296px, 20.556vw, 394.667px)",
  "--msg-327": "clamp(327px, 22.708vw, 436px)",
  "--msg-358": "clamp(358px, 24.861vw, 477.333px)",
  "--msg-389": "clamp(389px, 27.014vw, 518.667px)",
  "--msg-420": "clamp(420px, 29.167vw, 560px)",
  "--msg-438": "clamp(438px, 30.417vw, 584px)",
  "--msg-513": "clamp(513px, 35.625vw, 684px)",
  "--msg-577": "clamp(577px, 40.069vw, 769.333px)",
  "--msg-625": "clamp(625px, 43.403vw, 833.333px)",
} as CSSProperties;

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
  const [messageListTab, setMessageListTab] = useState<MessageListTab>("all");
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
      const projectProgram = findHostProgramOverview(
        projectId,
        programId,
        applications,
        reportProjects,
        hostPrograms,
      );
      if (projectProgram) return projectProgram;
    }
    if (programId) {
      return (
        findStandaloneHostProgramOverview(
          programId,
          applications,
          reportProjects,
          hostPrograms,
        ) ??
        findHostProgramDraftOverview(programId, applications, hostPrograms)
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
  const visibleCampaigns = useMemo(() => {
    if (messageListTab === "all") return campaigns;
    if (messageListTab === "sent") {
      return campaigns.filter((campaign) => campaign.status === "sent");
    }
    return campaigns.filter((campaign) => campaign.status !== "sent");
  }, [campaigns, messageListTab]);
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
            setCampaigns(databaseCampaigns);
            setSelectedId((currentId) =>
              databaseCampaigns.some((campaign) => campaign.id === currentId)
                ? currentId
                : databaseCampaigns[0]?.id,
            );
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

  function deleteSelectedCampaign() {
    if (!selectedCampaign) return;

    const nextCampaigns = campaigns.filter(
      (campaign) => campaign.id !== selectedCampaign.id,
    );
    saveCampaigns(nextCampaigns);
    setSelectedId(nextCampaigns[0]?.id);
    setSyncMessage("");
    setSyncError("");
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

  const resolvedProgramBasePath =
    programBasePath ??
    projectBasePath ??
    (programId
      ? projectId
        ? hostProgramPath(projectId, programId)
        : hostStandaloneProgramPath(programId)
      : "/host/programs");
  const applicationsHref = `${resolvedProgramBasePath}/applications`;
  const formsHref = `${resolvedProgramBasePath}/forms`;
  const messagesHref = `${resolvedProgramBasePath}/messages`;
  const sidebarTitle = program?.title ?? project?.title ?? "프로그램 제목";
  const sidebarProgramId = program?.id ?? programId ?? "";
  const sidebarDraft = sidebarProgramId
    ? findHostProgramDraft(sidebarProgramId, hostPrograms)
    : undefined;
  const sidebarStatus = getHostProgramSidebarStatus(program, sidebarDraft);

  return (
    <div
      className="font-pretendard min-h-[calc(100vh_-_4.861vw)] bg-white text-[#5B3A29]"
      style={messageFigmaScaleStyle}
    >
      <div className="flex min-h-[calc(100vh_-_4.861vw)] max-md:flex-col">
        <HostProgramSidebar
          activeItem="result"
          applicationsHref={applicationsHref}
          formsHref={formsHref}
          messagesHref={messagesHref}
          programId={sidebarProgramId}
          programPath={resolvedProgramBasePath}
          status={sidebarStatus}
          title={sidebarTitle}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <main className="flex min-h-[calc(100vh_-_4.861vw_-_var(--msg-69))] flex-1 bg-white">
            <MessageCampaignListPanel
              activeTab={messageListTab}
              campaigns={visibleCampaigns}
              onSelect={setSelectedId}
              onTabChange={setMessageListTab}
              projectApplications={projectApplications}
              selectedCampaignId={selectedCampaign?.id}
              templates={templates}
            />
            <MessageCampaignDetailPanel
              addCampaign={addCampaign}
              campaign={selectedCampaign}
              isSyncing={isSyncing}
              markSent={markSent}
              recipients={recipients}
              saved={saved}
              syncError={syncError}
              syncMessage={syncMessage}
              syncSelectedCampaign={syncSelectedCampaign}
              templates={templates}
              updateCampaign={updateCampaign}
            />
          </main>

          <div className="flex h-[var(--msg-69)] shrink-0 border-t border-[#6D7A8A] bg-white pl-[var(--msg-29)] pt-[var(--msg-20)]">
            <button
              className="inline-flex h-[var(--msg-29)] w-[var(--msg-91)] items-center justify-center rounded-[4px] border border-[#FE701E] bg-white text-[12px] font-normal leading-[1.253] text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!selectedCampaign}
              onClick={deleteSelectedCampaign}
              type="button"
            >
              메시지 삭제
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function MessageCampaignListPanel({
  activeTab,
  campaigns,
  onSelect,
  onTabChange,
  projectApplications,
  selectedCampaignId,
  templates,
}: {
  activeTab: MessageListTab;
  campaigns: MessageCampaign[];
  onSelect: (campaignId: string) => void;
  onTabChange: (tab: MessageListTab) => void;
  projectApplications: ReturnType<typeof useHostOperationsData>["applications"];
  selectedCampaignId?: string;
  templates: ReturnType<typeof readMessageTemplates>;
}) {
  const tabs: Array<{ label: string; value: MessageListTab }> = [
    { label: "전체", value: "all" },
    { label: "발송예약", value: "scheduled" },
    { label: "발송완료", value: "sent" },
  ];

  return (
    <section className="w-[var(--msg-625)] shrink-0 border-r border-[#6D7A8A] bg-white">
      <div className="ml-[var(--msg-40)] mt-[var(--msg-47)] w-[var(--msg-577)] border-b border-[#CAC4BC]">
        <div className="flex h-[27px] items-start gap-[12px]">
          {tabs.map((tab) => (
            <button
              className={`relative h-[27px] text-[14px] leading-[1.253] ${
                activeTab === tab.value
                  ? "font-semibold text-[#5B3A29] after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:bg-[#FE701E]"
                  : "font-normal text-[#CAC4BC]"
              }`}
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ml-[var(--msg-40)] mt-[23px] grid w-[var(--msg-577)] gap-[9px]">
        {campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <MessageCampaignRow
              campaign={campaign}
              key={campaign.id}
              onSelect={onSelect}
              projectApplications={projectApplications}
              selected={campaign.id === selectedCampaignId}
              templates={templates}
            />
          ))
        ) : (
          <div className="flex h-[34px] items-center text-[12px] font-semibold leading-[1.253] text-[#6D7A8A]">
            표시할 메시지가 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}

function MessageCampaignRow({
  campaign,
  onSelect,
  projectApplications,
  selected,
  templates,
}: {
  campaign: MessageCampaign;
  onSelect: (campaignId: string) => void;
  projectApplications: ReturnType<typeof useHostOperationsData>["applications"];
  selected: boolean;
  templates: ReturnType<typeof readMessageTemplates>;
}) {
  const status = getCampaignDisplayStatus(campaign.status);
  const dateTime = formatCampaignDateTime(campaign.scheduledAt);
  const recipientCount = buildMessageRecipientPreview(
    campaign,
    templates,
    projectApplications,
  ).length;
  const templateTitle =
    templates.find((template) => template.id === campaign.templateId)?.name ??
    campaign.name ??
    "발송된 템플릿 제목";

  return (
    <button
      className={`grid h-[34px] w-full grid-cols-[22px_86px_106px_63px_89px_minmax(0,1fr)] items-center text-left text-[14px] font-normal leading-[1.253] text-[#6D7A8A] ${
        selected ? "bg-[#F3F3F3]" : "bg-white"
      }`}
      onClick={() => onSelect(campaign.id)}
      type="button"
    >
      <span className="ml-[6px] size-[14px] border border-[#6D7A8A] bg-white" />
      <span className="flex items-center gap-[4px]">
        <span className={`size-[4px] rounded-full ${status.dotClassName}`} />
        {status.label}
      </span>
      <span>{dateTime.date}</span>
      <span>{dateTime.time}</span>
      <span>수신자 ({String(recipientCount).padStart(2, "0")})</span>
      <span className="truncate">{templateTitle}</span>
    </button>
  );
}

function MessageCampaignDetailPanel({
  addCampaign,
  campaign,
  isSyncing,
  markSent,
  recipients,
  saved,
  syncError,
  syncMessage,
  syncSelectedCampaign,
  templates,
  updateCampaign,
}: {
  addCampaign: () => void;
  campaign?: MessageCampaign;
  isSyncing: boolean;
  markSent: () => void;
  recipients: ReturnType<typeof buildMessageRecipientPreview>;
  saved: boolean;
  syncError: string;
  syncMessage: string;
  syncSelectedCampaign: () => Promise<void>;
  templates: ReturnType<typeof readMessageTemplates>;
  updateCampaign: (patch: Partial<MessageCampaign>) => void;
}) {
  const selectedTemplate = campaign
    ? templates.find((template) => template.id === campaign.templateId)
    : undefined;
  const dateTime = formatCampaignDateTime(campaign?.scheduledAt);

  return (
    <section className="min-w-0 flex-1 bg-white pl-[var(--msg-20)] pr-[28px] pt-[var(--msg-52)]">
      <div className="flex items-start">
        <div>
          <h1 className="text-[16px] font-semibold leading-[1.253] text-[#0D0D0C]">
            발송 예약 정보
          </h1>
          <p className="mt-[22px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
            발송 전 메세지는 수정이 가능해요
          </p>
        </div>
        <button
          className="ml-auto inline-flex h-[34px] w-[var(--msg-68)] items-center justify-center rounded-[16px] bg-[#1D70D6] text-[13px] font-semibold leading-[1.253] text-white disabled:opacity-40"
          disabled={isSyncing}
          onClick={() => {
            if (!campaign) {
              addCampaign();
              return;
            }
            updateCampaign({ status: "scheduled" });
            void syncSelectedCampaign();
          }}
          type="button"
        >
          {campaign ? "발송예약" : "새 예약"}
        </button>
      </div>

      <div className="ml-[8px] mt-[22px] flex h-[40px] w-[var(--msg-513)] items-center border-b border-[#6D7A8A] pb-[20px] text-[16px] font-semibold leading-[1.253] text-[#0D0D0C]">
        <span>발송예정:</span>
        <span className="ml-[26px]">{dateTime.date}</span>
        <span className="ml-[28px]">{dateTime.time}</span>
        <button
          aria-label="발송 완료로 변경"
          className="ml-auto size-[20px] rounded-[4px] border border-[#6D7A8A] text-[10px] text-[#6D7A8A]"
          disabled={!campaign}
          onClick={markSent}
          type="button"
        >
          /
        </button>
      </div>

      <section className="ml-[8px] mt-[34px] w-[var(--msg-513)]">
        <div className="flex items-center">
          <h2 className="text-[16px] font-semibold leading-[1.253] text-[#0D0D0C]">
            메시지 템플릿
          </h2>
          <button
            aria-label="템플릿 추가"
            className="ml-auto grid size-[18px] place-items-center rounded-[4px] border border-[#6D7A8A] text-[#6D7A8A]"
            onClick={addCampaign}
            type="button"
          >
            <Plus aria-hidden="true" className="size-[12px]" strokeWidth={1.8} />
          </button>
        </div>
        <div className="mt-[13px] h-[var(--msg-188)] w-full rounded-[4px] border border-[#6D7A8A] bg-white">
          <input
            className="h-[34px] w-full border-b border-[#6D7A8A] bg-white px-[12px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] outline-none"
            onChange={(event) => updateCampaign({ name: event.target.value })}
            readOnly={!campaign}
            value={campaign?.name ?? ""}
            placeholder="템플릿 제목"
          />
          <textarea
            className="h-[calc(var(--msg-188)-34px)] w-full resize-none bg-white px-[12px] py-[12px] text-[12px] font-normal leading-[1.6] text-[#6D7A8A] outline-none"
            readOnly
            value={selectedTemplate?.body ?? "템플릿 메시지 내용 보여지는 중"}
          />
        </div>
      </section>

      <section className="ml-[8px] mt-[20px] w-[var(--msg-513)] border-t border-[#6D7A8A] pt-[15px]">
        <div className="flex items-center">
          <h2 className="text-[16px] font-semibold leading-[1.253] text-[#0D0D0C]">
            수신자 ( {String(recipients.length).padStart(2, "0")} )
          </h2>
          <button
            aria-label="수신자 추가"
            className="ml-auto grid size-[12px] place-items-center rounded-full bg-[#6D7A8A] text-white"
            onClick={addCampaign}
            type="button"
          >
            <Plus aria-hidden="true" className="size-[8px]" strokeWidth={2.4} />
          </button>
        </div>
        <div className="mt-[13px] h-[var(--msg-188)] w-full overflow-hidden rounded-[4px] border border-[#AEB8C2] bg-white">
          {recipients.length > 0
            ? recipients.slice(0, 5).map((recipient) => (
              <div
                className="grid h-[36px] grid-cols-[64px_54px_1fr_20px] items-center border-b border-[#D9D9D9] px-[22px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] last:border-b-0"
                key={recipient.applicationId}
              >
                <span>{recipient.applicantName}</span>
                <span>성별</span>
                <span>접수일 {formatRecipientDate()}</span>
                <span className="ml-auto size-[10px] rounded-full bg-[#CAC4BC]" />
              </div>
            ))
            : Array.from({ length: 5 }).map((_, index) => (
                <div
                  className="grid h-[36px] grid-cols-[64px_54px_1fr_20px] items-center border-b border-[#D9D9D9] px-[22px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] last:border-b-0"
                  key={`empty-${index}`}
                >
                  <span>신청자</span>
                  <span>성별</span>
                  <span>접수일 0000. 00. 00</span>
                  <span className="ml-auto size-[10px] rounded-full bg-[#CAC4BC]" />
                </div>
              ))}
        </div>
      </section>

      <p aria-live="polite" className="sr-only">
        {saved ? "저장됨" : ""}
        {syncMessage}
        {syncError}
      </p>
    </section>
  );
}

function getCampaignDisplayStatus(status: MessageCampaignStatus) {
  if (status === "sent") {
    return { dotClassName: "bg-[#FF9A3D]", label: "발송완료" };
  }

  return { dotClassName: "bg-[#1D70D6]", label: "발송예약" };
}

function formatCampaignDateTime(value?: string) {
  if (!value) return { date: "0000. 00. 00", time: "00:00" };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const [datePart = "0000. 00. 00", timePart = "00:00"] = value.split("T");
    return {
      date: datePart.replaceAll("-", ". "),
      time: timePart.slice(0, 5) || "00:00",
    };
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return { date: `${year}. ${month}. ${day}`, time: `${hour}:${minute}` };
}

function formatRecipientDate(value?: string) {
  return formatCampaignDateTime(value).date;
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
