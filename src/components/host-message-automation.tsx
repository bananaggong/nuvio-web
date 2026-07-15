"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CircleHelp,
  Copy,
  Inbox,
  Info,
  Loader2,
  Pencil,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  findHostProgramDraft,
  findHostProgramDraftOverview,
  findHostProgramOverview,
  findHostProjectOverview,
  findStandaloneHostProgramOverview,
  getHostProgramSidebarStatus,
  hostProgramPath,
  hostProjectPath,
  hostStandaloneProgramPath,
} from "@/lib/host-projects";
import type {
  HostScheduledMessage,
  ScheduledMessageDeliveryStatus,
} from "@/lib/scheduled-message-db";
import {
  hostInquiryStatusLabels,
  normalizeHostInquiry,
  type HostInquiry,
  type HostInquiryStatus,
} from "@/lib/host-inquiries";
import type { HostApplication } from "@/lib/host-operations";
import { HostProgramSidebar } from "@/components/host-program-sidebar";
import { formatProgramDisplayName } from "@/lib/display-code";
import { useHostOperationsData } from "@/lib/use-host-operations-data";
import { formatKoreanMobilePhone } from "@/lib/korean-mobile-phone";

type MessageListTab = "all" | "scheduled" | "sent";

type MessageBatch = {
  body: string;
  channel: HostScheduledMessage["channel"];
  createdAt: string;
  deliveryStatus: ScheduledMessageDeliveryStatus;
  id: string;
  messages: HostScheduledMessage[];
  programTitle: string;
  scheduledFor: string;
  sentAt: string;
  title: string;
  updatedAt: string;
};

const messageFigmaScaleStyle = {
  "--msg-bottom-height": "64px",
  "--msg-detail-width": "520px",
  "--msg-header-height": "70px",
  "--msg-list-width": "572px",
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
  const {
    applications,
    programs: hostPrograms,
    reportProjects,
  } = useHostOperationsData();
  const [scheduledMessages, setScheduledMessages] = useState<
    HostScheduledMessage[]
  >([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");
  const [messageListTab, setMessageListTab] = useState<MessageListTab>("all");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [messageNotice, setMessageNotice] = useState("");
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [isMarkingSent, setIsMarkingSent] = useState(false);

  const project = useMemo(() => {
    if (!projectId) return undefined;
    return findHostProjectOverview(
      projectId,
      applications,
      reportProjects,
      hostPrograms,
    );
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
  const shouldShowInquiries =
    panel === "inquiry" || (!programId && !projectId && !panel);

  useEffect(() => {
    if (shouldShowInquiries) return;

    let isMounted = true;

    async function loadScheduledMessages() {
      setIsLoadingMessages(true);
      setMessageError("");
      setMessageNotice("");

      try {
        const response = await fetch("/api/host/scheduled-messages", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: HostScheduledMessage[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "메시지 목록을 불러오지 못했습니다.");
        }

        const nextMessages = Array.isArray(payload.data)
          ? payload.data
              .map(normalizeScheduledMessage)
              .filter(
                (message): message is HostScheduledMessage => Boolean(message),
              )
          : [];

        if (isMounted) setScheduledMessages(nextMessages);
      } catch (error) {
        if (isMounted) {
          setMessageError(
            error instanceof Error
              ? error.message
              : "메시지 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    }

    void loadScheduledMessages();

    return () => {
      isMounted = false;
    };
  }, [shouldShowInquiries]);

  const scopedMessages = useMemo(
    () => filterMessagesByScope(scheduledMessages, projectApplications, program),
    [program, projectApplications, scheduledMessages],
  );
  const messageBatches = useMemo(
    () => groupScheduledMessageBatches(scopedMessages),
    [scopedMessages],
  );
  const visibleMessageBatches = useMemo(() => {
    if (messageListTab === "sent") {
      return messageBatches.filter((batch) => batch.deliveryStatus === "sent");
    }
    if (messageListTab === "scheduled") {
      return messageBatches.filter((batch) => batch.deliveryStatus !== "sent");
    }
    return messageBatches;
  }, [messageBatches, messageListTab]);

  const selectedBatch =
    visibleMessageBatches.find((batch) => batch.id === selectedBatchId) ??
    visibleMessageBatches[0];

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

  async function deleteSelectedBatch() {
    if (!selectedBatch || isDeletingMessage) return;

    const messageIds = selectedBatch.messages.map((message) => message.id);
    setIsDeletingMessage(true);
    setMessageError("");
    setMessageNotice("");

    try {
      const response = await fetch("/api/host/scheduled-messages", {
        body: JSON.stringify({ messageIds }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { deletedCount?: number };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "메시지를 삭제하지 못했습니다.");
      }

      setScheduledMessages((currentMessages) =>
        currentMessages.filter((message) => !messageIds.includes(message.id)),
      );
      setSelectedBatchId("");
    } catch (error) {
      setMessageError(
        error instanceof Error ? error.message : "메시지를 삭제하지 못했습니다.",
      );
    } finally {
      setIsDeletingMessage(false);
    }
  }

  function copySelectedBatchBody() {
    if (!selectedBatch?.body) return;

    void navigator.clipboard
      .writeText(selectedBatch.body)
      .then(() => {
        setMessageError("");
        setMessageNotice("메시지 본문을 복사했습니다. 업무폰에서 붙여넣어 발송하세요.");
      })
      .catch(() => {
        setMessageNotice("");
        setMessageError("메시지 본문을 복사하지 못했습니다.");
      });
  }

  async function markSelectedBatchSent() {
    if (
      !selectedBatch ||
      selectedBatch.deliveryStatus === "sent" ||
      isMarkingSent
    ) {
      return;
    }

    const messageIds = selectedBatch.messages.map((message) => message.id);
    setIsMarkingSent(true);
    setMessageError("");
    setMessageNotice("");

    try {
      const response = await fetch("/api/host/scheduled-messages", {
        body: JSON.stringify({ messageIds, result: "업무폰 수동 발송" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: {
          sheetSync?: { message?: string; status?: string; updatedCount?: number };
          updatedCount?: number;
        };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "발송완료 처리에 실패했습니다.");
      }

      const sentAt = new Date().toISOString();
      setScheduledMessages((currentMessages) =>
        currentMessages.map((message) =>
          messageIds.includes(message.id)
            ? {
                ...message,
                deliveryStatus: "sent",
                error: "",
                sentAt,
                updatedAt: sentAt,
              }
            : message,
        ),
      );

      const updatedCount = payload.data?.updatedCount ?? messageIds.length;
      const sheetSync = payload.data?.sheetSync;
      const sheetMessage =
        sheetSync?.status === "synced"
          ? " Google Sheet도 갱신했습니다."
          : sheetSync?.status === "skipped"
            ? ` Google Sheet 동기화는 건너뜀: ${sheetSync.message ?? ""}`
            : sheetSync?.status === "failed"
              ? ` Google Sheet 동기화 실패: ${sheetSync.message ?? ""}`
              : "";
      setMessageNotice(`${updatedCount}건을 발송완료로 처리했습니다.${sheetMessage}`);
    } catch (error) {
      setMessageError(
        error instanceof Error ? error.message : "발송완료 처리에 실패했습니다.",
      );
    } finally {
      setIsMarkingSent(false);
    }
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

  function selectMessageBatch(batchId: string) {
    setSelectedBatchId(batchId);
    setMobilePane("detail");
  }

  return (
    <div
      className="font-pretendard min-h-[calc(100vh_-_var(--msg-header-height))] bg-white text-[#5B3A29]"
      style={messageFigmaScaleStyle}
    >
      <div className="flex min-h-[calc(100vh_-_var(--msg-header-height))] max-md:flex-col">
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

        <section className="min-w-0 flex-1 overflow-x-auto bg-white max-md:overflow-x-hidden">
          <div className="flex min-h-[calc(100vh_-_var(--msg-header-height))] w-[calc(var(--msg-list-width)_+_var(--msg-detail-width))] flex-col bg-white max-md:w-full">
          <div className="hidden min-h-11 grid-cols-2 border-b border-[#D9D9D9] bg-white px-5 max-md:grid">
            {([
              ["list", "메시지 목록"],
              ["detail", "발송 정보"],
            ] as const).map(([pane, label]) => (
              <button
                aria-pressed={mobilePane === pane}
                className={`min-h-11 border-b-2 text-sm font-semibold ${
                  mobilePane === pane
                    ? "border-[#FE701E] text-[#FE701E]"
                    : "border-transparent text-[#6D7A8A]"
                }`}
                key={pane}
                onClick={() => setMobilePane(pane)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <main className="grid min-h-[calc(100vh_-_var(--msg-header-height)_-_var(--msg-bottom-height))] grid-cols-[var(--msg-list-width)_var(--msg-detail-width)] bg-white max-md:grid-cols-1">
            <div className={`contents ${mobilePane === "list" ? "" : "max-md:hidden"}`}>
              <MessageScheduleListPanel
                activeTab={messageListTab}
                batches={visibleMessageBatches}
                error={messageError}
                isLoading={isLoadingMessages}
                notice={messageNotice}
                onSelect={selectMessageBatch}
                onTabChange={setMessageListTab}
                selectedBatchId={selectedBatch?.id}
              />
            </div>
            <div className={`contents ${mobilePane === "detail" ? "" : "max-md:hidden"}`}>
              <MessageScheduleDetailPanel
                batch={selectedBatch}
                onCopyBody={copySelectedBatchBody}
              />
            </div>
          </main>

          <div className="flex h-[var(--msg-bottom-height)] shrink-0 items-start gap-[10px] border-t border-[#6D7A8A] bg-white pl-[28px] pt-[20px] max-md:items-center max-md:px-5 max-md:pt-0">
            <button
              className="inline-flex h-[28px] w-[92px] items-center justify-center rounded-[4px] border border-[#7A8B52] bg-[#7A8B52] text-[12px] font-normal leading-[1.253] text-white disabled:cursor-not-allowed disabled:opacity-40 max-md:min-h-11 max-md:flex-1 max-md:text-sm"
              disabled={
                !selectedBatch ||
                selectedBatch.deliveryStatus === "sent" ||
                isMarkingSent
              }
              onClick={markSelectedBatchSent}
              type="button"
            >
              {isMarkingSent ? "처리 중" : "발송완료"}
            </button>
            <button
              className="inline-flex h-[28px] w-[92px] items-center justify-center rounded-[4px] border border-[#FE701E] bg-white text-[12px] font-normal leading-[1.253] text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-40 max-md:min-h-11 max-md:flex-1 max-md:text-sm"
              disabled={!selectedBatch || isDeletingMessage}
              onClick={deleteSelectedBatch}
              type="button"
            >
              메시지 삭제
            </button>
          </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MessageScheduleListPanel({
  activeTab,
  batches,
  error,
  isLoading,
  notice,
  onSelect,
  onTabChange,
  selectedBatchId,
}: {
  activeTab: MessageListTab;
  batches: MessageBatch[];
  error: string;
  isLoading: boolean;
  notice: string;
  onSelect: (batchId: string) => void;
  onTabChange: (tab: MessageListTab) => void;
  selectedBatchId?: string;
}) {
  const tabs: Array<{ label: string; value: MessageListTab }> = [
    { label: "전체", value: "all" },
    { label: "발송예약", value: "scheduled" },
    { label: "발송완료", value: "sent" },
  ];

  return (
    <section className="w-[var(--msg-list-width)] shrink-0 border-r border-[#6D7A8A] bg-white px-[40px] pt-[48px] max-md:w-full max-md:border-r-0 max-md:px-5 max-md:pt-5">
      <div className="border-b border-[#CAC4BC]">
        <div className="flex h-[28px] items-start gap-[12px] max-md:h-11">
          {tabs.map((tab) => (
            <button
              className={`relative h-[28px] text-[13px] leading-[1.253] max-md:min-h-11 max-md:min-w-11 max-md:text-sm ${
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

      <div className="mt-[22px] grid gap-[6px]">
        {isLoading ? (
          <div className="flex h-[42px] items-center gap-2 text-[12px] font-semibold leading-[1.253] text-[#6D7A8A]">
            <Loader2 className="size-4 animate-spin" />
            발송 메시지를 불러오는 중입니다.
          </div>
        ) : error ? (
          <div className="rounded-[4px] border border-[#FE701E]/40 px-3 py-2 text-[12px] font-semibold leading-[1.5] text-[#FE701E]">
            {error}
          </div>
        ) : notice ? (
          <div className="rounded-[4px] border border-[#7A8B52]/40 bg-[#F6FAF0] px-3 py-2 text-[12px] font-semibold leading-[1.5] text-[#5D6F38]">
            {notice}
          </div>
        ) : batches.length > 0 ? (
          batches.map((batch) => (
            <MessageScheduleRow
              batch={batch}
              key={batch.id}
              onSelect={onSelect}
              selected={batch.id === selectedBatchId}
            />
          ))
        ) : (
          <div className="flex h-[42px] items-center text-[12px] font-semibold leading-[1.253] text-[#6D7A8A]">
            표시할 메시지가 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}

function MessageScheduleRow({
  batch,
  onSelect,
  selected,
}: {
  batch: MessageBatch;
  onSelect: (batchId: string) => void;
  selected: boolean;
}) {
  const status = getMessageStatusMeta(batch.deliveryStatus);
  const dateTime = formatCampaignDateTime(
    batch.scheduledFor || batch.sentAt || batch.createdAt,
  );

  return (
    <button
      className={`grid h-[28px] w-full grid-cols-[20px_80px_92px_58px_82px_minmax(0,1fr)] items-center text-left text-[12px] font-normal leading-[1.253] text-[#6D7A8A] max-md:flex max-md:h-auto max-md:min-h-16 max-md:flex-wrap max-md:gap-x-3 max-md:gap-y-1 max-md:px-2 max-md:py-2 ${
        selected ? "bg-[#F3F3F3]" : "bg-white"
      }`}
      onClick={() => onSelect(batch.id)}
      type="button"
    >
      <span className="ml-[6px] size-[12px] border border-[#6D7A8A] bg-white max-md:hidden" />
      <span className="flex items-center gap-[4px]">
        <span className={`size-[4px] rounded-full ${status.dotClassName}`} />
        {status.label}
      </span>
      <span>{dateTime.date}</span>
      <span>{dateTime.time}</span>
      <span className="max-md:ml-auto">수신자 ({String(batch.messages.length).padStart(2, "0")})</span>
      <span className="truncate max-md:w-full max-md:text-sm max-md:font-semibold max-md:text-[#5B3A29]">{batch.title}</span>
    </button>
  );
}

function MessageScheduleDetailPanel({
  batch,
  onCopyBody,
}: {
  batch?: MessageBatch;
  onCopyBody: () => void;
}) {
  const status = getMessageStatusMeta(batch?.deliveryStatus ?? "draft");
  const dateTime = formatCampaignDateTime(
    batch?.scheduledFor || batch?.sentAt || batch?.createdAt,
  );
  const recipients = batch?.messages ?? [];

  return (
    <section className="w-[var(--msg-detail-width)] shrink-0 bg-white px-[30px] pt-[58px] max-md:w-full max-md:px-5 max-md:pt-5">
      <div className="flex items-start">
        <div>
          <h1 className="text-[14px] font-semibold leading-[1.253] text-[#0D0D0C]">
            발송 예약 정보
          </h1>
          <p className="mt-[18px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
            발송 전 메시지는 수정할 수 있어요
          </p>
        </div>
        <span
          className={`ml-auto inline-flex h-[28px] min-w-[72px] items-center justify-center rounded-[16px] px-4 text-[12px] font-semibold leading-[1.253] text-white ${status.pillClassName}`}
        >
          {status.actionLabel}
        </span>
      </div>

      <div className="mt-[24px] flex h-[40px] w-full items-center border-b border-[#6D7A8A] pb-[18px] text-[14px] font-semibold leading-[1.253] text-[#0D0D0C]">
        <span>발송예정:</span>
        <span className="ml-[26px]">{dateTime.date}</span>
        <span className="ml-[28px]">{dateTime.time}</span>
        <button
          aria-label="발송 시간 수정"
          className="ml-auto grid size-[20px] place-items-center rounded-[4px] text-[16px] font-normal text-[#6D7A8A] max-md:size-11"
          disabled={!batch || batch.deliveryStatus === "sent"}
          type="button"
        >
          <Pencil aria-hidden="true" className="size-[13px]" strokeWidth={1.8} />
        </button>
      </div>

      <section className="mt-[34px] w-full">
        <div className="flex items-center">
          <h2 className="text-[14px] font-semibold leading-[1.253] text-[#0D0D0C]">
            메시지 템플릿
          </h2>
          <button
            aria-label="메시지 본문 복사"
            className="ml-auto grid size-[18px] place-items-center rounded-[4px] border border-[#6D7A8A] text-[12px] text-[#6D7A8A] disabled:cursor-not-allowed disabled:opacity-40 max-md:size-11"
            disabled={!batch}
            onClick={onCopyBody}
            type="button"
          >
            <Copy aria-hidden="true" className="size-[12px]" strokeWidth={1.8} />
          </button>
        </div>
        <div className="mt-[13px] h-[188px] w-full rounded-[4px] border border-[#6D7A8A] bg-white">
          <div className="flex h-[34px] items-center border-b border-[#6D7A8A] px-[12px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A]">
            {batch?.title ?? "선택된 메시지가 없습니다."}
          </div>
          <div className="h-[154px] overflow-y-auto whitespace-pre-line px-[12px] py-[12px] text-[12px] font-normal leading-[1.6] text-[#6D7A8A]">
            {batch?.body ?? ""}
          </div>
        </div>
      </section>

      <section className="mt-[20px] w-full border-t border-[#6D7A8A] pt-[15px]">
        <div className="flex items-center">
          <h2 className="text-[14px] font-semibold leading-[1.253] text-[#0D0D0C]">
            수신자 ( {String(recipients.length).padStart(2, "0")} )
          </h2>
          <span className="ml-auto grid size-[12px] place-items-center rounded-full bg-[#6D7A8A] text-[9px] text-white">
            <Info aria-hidden="true" className="size-[8px]" strokeWidth={2.2} />
          </span>
        </div>
        <div className="mt-[13px] h-[188px] w-full overflow-y-auto rounded-[4px] border border-[#AEB8C2] bg-white">
          {recipients.length > 0 ? (
            recipients.map((recipient) => (
              <div
                className="grid h-[36px] grid-cols-[64px_104px_1fr_48px] items-center border-b border-[#D9D9D9] px-[22px] text-[12px] font-normal leading-[1.253] text-[#6D7A8A] last:border-b-0 max-md:min-h-14 max-md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] max-md:px-3"
                key={recipient.id}
              >
                <span className="truncate">{recipient.applicantName}</span>
                <span className="truncate">
                  {recipient.channel === "sms"
                    ? formatKoreanMobilePhone(recipient.recipient)
                    : recipient.recipient}
                </span>
                <span className="max-md:hidden">접수일 {formatCampaignDateTime(recipient.submittedAt).date}</span>
                {recipient.recipient ? (
                  <a
                    className="ml-auto inline-flex h-[22px] w-[38px] items-center justify-center rounded-[4px] border border-[#6D7A8A] text-[11px] font-semibold text-[#6D7A8A] max-md:size-11"
                    href={getSmsHref(recipient.recipient)}
                  >
                    SMS
                  </a>
                ) : (
                  <span className="ml-auto size-[10px] rounded-full bg-[#CAC4BC]" />
                )}
              </div>
            ))
          ) : (
            <div className="grid h-full min-h-24 place-items-center px-4 text-center text-[12px] text-[#6D7A8A]">
              수신자가 없습니다.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function filterMessagesByScope(
  messages: HostScheduledMessage[],
  applications: HostApplication[],
  program?: { id: string; title: string; slug?: string },
): HostScheduledMessage[] {
  if (program) {
    return messages.filter((message) => {
      return (
        message.programId === program.id ||
        message.programTitle === program.title ||
        Boolean(program.slug && message.programId === program.slug)
      );
    });
  }

  if (applications.length === 0) return messages;

  const applicationIds = new Set(applications.map((application) => application.id));
  const programTitles = new Set(
    applications.map((application) => application.programTitle),
  );

  return messages.filter(
    (message) =>
      applicationIds.has(message.applicationId) ||
      programTitles.has(message.programTitle),
  );
}

function groupScheduledMessageBatches(
  messages: HostScheduledMessage[],
): MessageBatch[] {
  const groupedMessages = new Map<string, HostScheduledMessage[]>();

  for (const message of messages) {
    const timestamp =
      message.scheduledFor || message.sentAt || message.createdAt || message.updatedAt;
    const key = [
      message.deliveryStatus,
      message.channel,
      timestamp.slice(0, 16),
      message.createdAt.slice(0, 16),
    ].join("|");
    groupedMessages.set(key, [...(groupedMessages.get(key) ?? []), message]);
  }

  return [...groupedMessages.entries()]
    .map(([key, batchMessages]) => {
      const firstMessage = batchMessages[0];
      return {
        body: firstMessage.body,
        channel: firstMessage.channel,
        createdAt: firstMessage.createdAt,
        deliveryStatus: firstMessage.deliveryStatus,
        id: key,
        messages: batchMessages,
        programTitle: firstMessage.programTitle,
        scheduledFor: firstMessage.scheduledFor,
        sentAt: firstMessage.sentAt,
        title: inferMessageTitle(firstMessage.body),
        updatedAt: firstMessage.updatedAt,
      };
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.scheduledFor || a.sentAt || a.createdAt);
      const bTime = Date.parse(b.scheduledFor || b.sentAt || b.createdAt);
      return bTime - aTime;
    });
}

function normalizeScheduledMessage(
  value: HostScheduledMessage,
): HostScheduledMessage | null {
  if (!value?.id || !value.body) return null;

  return {
    applicationId: asString(value.applicationId),
    applicantName: asString(value.applicantName) || "신청자",
    body: value.body,
    channel:
      value.channel === "email" || value.channel === "kakao" || value.channel === "sms"
        ? value.channel
        : "sms",
    createdAt: asString(value.createdAt),
    deliveryStatus: normalizeDeliveryStatus(value.deliveryStatus),
    error: asString(value.error),
    id: value.id,
    programId: asString(value.programId),
    programTitle: asString(value.programTitle) || "누비오 프로그램",
    recipient: asString(value.recipient),
    scheduledFor: asString(value.scheduledFor),
    sentAt: asString(value.sentAt),
    submittedAt: asString(value.submittedAt),
    updatedAt: asString(value.updatedAt),
  };
}

function normalizeDeliveryStatus(
  value: unknown,
): ScheduledMessageDeliveryStatus {
  return value === "draft" ||
    value === "scheduled" ||
    value === "sent" ||
    value === "failed" ||
    value === "processing"
    ? value
    : "scheduled";
}

function getMessageStatusMeta(status: ScheduledMessageDeliveryStatus) {
  if (status === "sent") {
    return {
      actionLabel: "발송완료",
      dotClassName: "bg-[#FF9A3D]",
      label: "발송완료",
      pillClassName: "bg-[#8CA35D]",
    };
  }
  if (status === "failed") {
    return {
      actionLabel: "발송실패",
      dotClassName: "bg-[#D94B3D]",
      label: "발송실패",
      pillClassName: "bg-[#D94B3D]",
    };
  }

  return {
    actionLabel: "발송예약",
    dotClassName: "bg-[#1D70D6]",
    label: "발송예약",
    pillClassName: "bg-[#1D70D6]",
  };
}

function inferMessageTitle(body: string): string {
  if (body.includes("확정") || body.includes("승인")) return "승인 안내";
  if (body.includes("리뷰") || body.includes("후기")) return "리뷰 요청";
  if (body.includes("준비") || body.includes("집결")) return "참여 전 리마인더";
  return "발송될 템플릿 제목";
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

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getSmsHref(value: string): string {
  const phone = value.replace(/[^\d+]/gu, "");
  return phone ? `sms:${phone}` : "#";
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
              {scoped ? "프로그램 문의" : "채널 문의"}
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-[#0D0D0C] sm:text-3xl">
              {scoped ? `${programTitle ?? "프로그램"} 문의사항` : "전체 문의사항"}
            </h1>
            <p className="mt-2 text-sm font-bold leading-6 text-[#8B7A6E]">
              {scoped
                ? "전체 문의 중 이 프로그램과 연결된 문의만 보여줍니다."
                : "채널로 들어온 모든 프로그램 문의를 한곳에서 확인합니다."}
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
                      연결 프로그램 · {formatProgramDisplayName(inquiry.programTitle, inquiry.programId)}
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
                  : "채널 또는 프로그램 상세페이지에서 접수된 문의가 이곳에 모입니다."}
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
