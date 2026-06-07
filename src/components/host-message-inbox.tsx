"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  Circle,
  Minus,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import { type HostApplication } from "@/lib/host-operations";
import {
  normalizeHostInquiry,
  type HostInquiry,
  type HostInquiryStatus,
} from "@/lib/host-inquiries";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

export type HostMessageInboxView = "ended" | "ongoing";

type MessageThread = {
  bookingInfo: string;
  dateLabel: string;
  guestName: string;
  id: string;
  imageUrl: string;
  lastMessage: string;
  openDate: string;
  periodLabel: string;
  programNumber: string;
  programTitle: string;
  sourceId: string;
  status: HostInquiryStatus;
  timeLabel: string;
  unread: boolean;
};

type AutoAnswerItem = {
  enabled: boolean;
  label: string;
  placeholder: string;
  value: string;
};

const defaultAutoAnswerItems: AutoAnswerItem[] = [
  {
    enabled: true,
    label: "집합 장소 및 시간",
    placeholder: "활성화 버튼을 클릭 후 내용을 입력해주세요.",
    value: "",
  },
  {
    enabled: false,
    label: "준비물 / 복장",
    placeholder: "활성화 버튼을 클릭 후 내용을 입력해주세요.",
    value: "",
  },
  {
    enabled: false,
    label: "취소 / 환불 규정",
    placeholder: "활성화 버튼을 클릭 후 내용을 입력해주세요.",
    value: "",
  },
];

const hostMessageScaleStyle = {
  "--host-message-scale":
    "clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333)",
  "--host-msg-2": scaledSize(2),
  "--host-msg-4": scaledSize(4),
  "--host-msg-6": scaledSize(6),
  "--host-msg-7": scaledSize(7),
  "--host-msg-8": scaledSize(8),
  "--host-msg-10": scaledSize(10),
  "--host-msg-11": scaledSize(11),
  "--host-msg-12": scaledSize(12),
  "--host-msg-13": scaledSize(13),
  "--host-msg-14": scaledSize(14),
  "--host-msg-16": scaledSize(16),
  "--host-msg-18": scaledSize(18),
  "--host-msg-21": scaledSize(21),
  "--host-msg-22": scaledSize(22),
  "--host-msg-23": scaledSize(23),
  "--host-msg-24": scaledSize(24),
  "--host-msg-26": scaledSize(26),
  "--host-msg-29": scaledSize(29),
  "--host-msg-31": scaledSize(31),
  "--host-msg-38": scaledSize(38),
  "--host-msg-603": scaledSize(603),
} as CSSProperties;

function scaledSize(value: number): string {
  return `clamp(${value}px, ${((value / 1440) * 100).toFixed(3)}vw, ${Math.round(
    value * (4 / 3),
  )}px)`;
}

export function HostMessageInbox({ view }: { view: HostMessageInboxView }) {
  const { applications } = useHostOperationsData();
  const [inquiries, setInquiries] = useState<HostInquiry[]>([]);
  const [isLoadingInquiries, setIsLoadingInquiries] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [closingThreadId, setClosingThreadId] = useState("");
  const allThreads = useMemo(
    () => buildMessageThreads(inquiries, applications),
    [applications, inquiries],
  );
  const threads = useMemo(
    () =>
      allThreads.filter((thread) =>
        view === "ended" ? thread.status === "closed" : thread.status !== "closed",
      ),
    [allThreads, view],
  );
  const closedThreads = useMemo(
    () => allThreads.filter((thread) => thread.status === "closed"),
    [allThreads],
  );
  const [selectedId, setSelectedId] = useState("");
  const selectedThread = threads.find((thread) => thread.id === selectedId) ?? threads[0];
  const selectedThreadId = selectedThread?.id;

  useEffect(() => {
    let active = true;

    async function loadInquiries() {
      setIsLoadingInquiries(true);
      setLoadError("");

      try {
        const response = await fetch("/api/host/inquiries", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: HostInquiry[];
          error?: string;
        };

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("로그인 후 메세지함을 확인할 수 있습니다.");
          }
          throw new Error(payload.error ?? "문의 목록을 불러오지 못했습니다.");
        }

        if (active) {
          setInquiries(
            Array.isArray(payload.data)
              ? payload.data.map(normalizeHostInquiry)
              : [],
          );
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "문의 목록을 불러오지 못했습니다.",
          );
          setInquiries([]);
        }
      } finally {
        if (active) setIsLoadingInquiries(false);
      }
    }

    void loadInquiries();

    return () => {
      active = false;
    };
  }, []);

  async function closeThread(thread: MessageThread) {
    if (closingThreadId) return;

    setClosingThreadId(thread.id);
    setActionError("");

    try {
      const response = await fetch(`/api/host/inquiries/${thread.sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" satisfies HostInquiryStatus }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: HostInquiry;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "상담을 종료하지 못했습니다.");
      }

      const nextInquiry = normalizeHostInquiry(payload.data);
      setInquiries((current) =>
        current.map((inquiry) =>
          inquiry.id === nextInquiry.id ? nextInquiry : inquiry,
        ),
      );
      setSelectedId("");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "상담을 종료하지 못했습니다.",
      );
    } finally {
      setClosingThreadId("");
    }
  }

  if (view === "ended") {
    return (
      <EndedMessagesView
        isLoading={isLoadingInquiries}
        loadError={loadError}
        onSelectThread={setSelectedId}
        selectedThread={selectedThread}
        selectedThreadId={selectedThreadId}
        threads={threads}
      />
    );
  }

  return (
    <OngoingMessagesView
      actionError={actionError}
      closedThreads={closedThreads}
      closingThreadId={closingThreadId}
      isLoading={isLoadingInquiries}
      loadError={loadError}
      onCloseThread={closeThread}
      onSelectThread={setSelectedId}
      selectedThread={selectedThread}
      selectedThreadId={selectedThreadId}
      threads={threads}
    />
  );
}

function OngoingMessagesView({
  actionError,
  closedThreads,
  closingThreadId,
  isLoading,
  loadError,
  onCloseThread,
  onSelectThread,
  selectedThread,
  selectedThreadId,
  threads,
}: {
  actionError: string;
  closedThreads: MessageThread[];
  closingThreadId: string;
  isLoading: boolean;
  loadError: string;
  onCloseThread: (thread: MessageThread) => void;
  onSelectThread: (threadId: string) => void;
  selectedThread?: MessageThread;
  selectedThreadId?: string;
  threads: MessageThread[];
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      className="font-pretendard min-h-[calc(100vh-4.861vw)] bg-white text-[#5B3A29]"
      data-host-message-scale="ongoing"
      style={hostMessageScaleStyle}
    >
      <section className="flex h-[calc(100vh-4.861vw)] min-h-[658px] flex-col overflow-hidden max-lg:h-auto max-lg:min-h-0">
        <div
          className="flex items-center gap-[14px] border-b border-[#6D7A8A] px-[1.944vw] max-lg:flex-wrap max-lg:px-5"
          style={{ height: scaledSize(70), minHeight: scaledSize(70) }}
        >
          <Link
            aria-label="호스트 홈으로 돌아가기"
            className="inline-flex size-5 items-center justify-center text-[#6D7A8A] transition hover:text-[#FE701E]"
            href="/host"
          >
            <ChevronLeft size={20} strokeWidth={1.8} />
          </Link>
          <h1 className="shrink-0 text-[16px] font-medium leading-[1.253] text-[#6D7A8A]">
            메세지함 ({formatTwoDigits(threads.length)})
          </h1>
          <label
            className="relative h-[28px] min-w-[280px] flex-1 max-lg:max-w-none"
            style={{ maxWidth: scaledSize(411), width: scaledSize(411) }}
          >
            <Search
              aria-hidden="true"
              className="absolute left-[9px] top-1/2 size-[14px] -translate-y-1/2 text-[#6D7A8A]"
              strokeWidth={1.8}
            />
            <input
              className="h-full w-full rounded-full border border-[#6D7A8A] bg-[#F9F9F9] pl-9 pr-3 text-[12px] font-semibold leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#6D7A8A] focus:border-[#FE701E]"
              placeholder="검색"
              type="search"
            />
          </label>
          <div className="ml-auto flex items-center justify-end">
            <button
              className="inline-flex h-[30px] items-center justify-center rounded-[6px] bg-[#6D7A8A] px-4 text-center text-[12px] font-bold leading-[1.6] text-[#F3F3F3] transition hover:bg-[#5D6876]"
              onClick={() => setSettingsOpen(true)}
              type="button"
            >
              자동응답 설정
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div
            className="mx-auto grid h-full min-h-[608px] min-w-[1060px] max-w-[1920px]"
            data-host-message-grid="ongoing"
            style={{
              gridTemplateColumns: `${scaledSize(360)} minmax(${scaledSize(620)}, 1fr) ${scaledSize(390)}`,
            }}
          >
            <aside className="flex min-h-full flex-col border-r border-[#6D7A8A]">
              <div className="flex-1 px-3 pt-[18px]">
                <div className="grid gap-[6px]">
                  {isLoading ? (
                    <MessageListState label="문의를 불러오는 중입니다." />
                  ) : loadError ? (
                    <MessageListState label={loadError} />
                  ) : threads.length > 0 ? (
                    threads.slice(0, 8).map((thread) => (
                    <ThreadListButton
                      active={thread.id === selectedThreadId}
                      key={thread.id}
                      onClick={() => onSelectThread(thread.id)}
                      thread={thread}
                    />
                    ))
                  ) : (
                    <MessageListState label="진행 중인 메세지가 없습니다." />
                  )}
                </div>
              </div>
              <Link
                className="flex min-h-[47px] items-center border-t-[0.5px] border-[#6D7A8A] px-[10px] text-[14px] font-semibold leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
                href="/host/messages?view=ended"
              >
                종료된 메세지
              </Link>
            </aside>

            <ChatConversationPanel thread={selectedThread} />

            <ThreadDetailPanel
              actionError={actionError}
              closing={selectedThread ? closingThreadId === selectedThread.id : false}
              previousThreads={closedThreads}
              onCloseThread={onCloseThread}
              thread={selectedThread}
              variant="ongoing"
            />
          </div>
        </div>
      </section>

      {settingsOpen ? (
        <AutoAnswerSettingsDialog onClose={() => setSettingsOpen(false)} />
      ) : null}
    </div>
  );
}

function EndedMessagesView({
  isLoading,
  loadError,
  onSelectThread,
  selectedThread,
  selectedThreadId,
  threads,
}: {
  isLoading: boolean;
  loadError: string;
  onSelectThread: (threadId: string) => void;
  selectedThread?: MessageThread;
  selectedThreadId?: string;
  threads: MessageThread[];
}) {
  return (
    <HostWorkspaceLayout>
      <section
        className="flex min-w-0 flex-1 bg-white max-lg:flex-col"
        data-host-message-scale="ended"
        style={hostMessageScaleStyle}
      >
        <div
          className="min-w-[430px] px-[1.389vw] pt-[1.667vw] max-lg:w-full max-lg:max-w-none max-lg:px-5"
          style={{ maxWidth: scaledSize(547), width: scaledSize(547) }}
        >
          <div className="flex h-5 items-center gap-[14px]">
            <Link
              aria-label="진행 중인 메세지로 돌아가기"
              className="inline-flex size-5 items-center justify-center text-[#6D7A8A] transition hover:text-[#FE701E]"
              href="/host/messages"
            >
              <ChevronLeft size={20} strokeWidth={1.8} />
            </Link>
            <h1 className="text-[16px] font-medium leading-[1.253] text-[#6D7A8A]">
              종료된 메세지 ({formatTwoDigits(threads.length)})
            </h1>
          </div>

          <div className="mt-[2.778vw] grid gap-[18px] max-lg:mt-8">
            <div className="grid gap-2">
              <label className="relative h-[28px] w-full">
                <Search
                  aria-hidden="true"
                  className="absolute left-[9px] top-1/2 size-[14px] -translate-y-1/2 text-[#6D7A8A]"
                  strokeWidth={1.8}
                />
                <input
                  className="h-full w-full rounded-full border border-[#6D7A8A] bg-[#F9F9F9] pl-9 pr-3 text-[12px] font-semibold leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#6D7A8A] focus:border-[#FE701E]"
                  placeholder="대화 내용 또는 게스트 검색"
                  type="search"
                />
              </label>

              <div className="flex h-[28px] items-center gap-[10px]">
                <span className="text-[14px] font-medium leading-[1.253] text-[#0D0D0C]">
                  프로그램
                </span>
                <button
                  className="flex h-full flex-1 items-center rounded-[7px] border border-[#6D7A8A] pl-3 text-left text-[12px] font-medium leading-[1.253] text-[#D9D9D9]"
                  type="button"
                >
                  <span className="flex-1">전체</span>
                  <ChevronDown
                    aria-hidden="true"
                    className="mr-2 size-4 text-[#6D7A8A]"
                    strokeWidth={1.8}
                  />
                </button>
              </div>

              <div className="flex gap-[10px] border-b border-[#6D7A8A] pb-3 pl-[9px] pt-[6px]">
                <FilterPill active>전체</FilterPill>
                <FilterPill>최신순</FilterPill>
                <FilterPill>종료순</FilterPill>
              </div>
            </div>

            <div className="grid gap-3">
              {isLoading ? (
                <MessageListState label="문의를 불러오는 중입니다." />
              ) : loadError ? (
                <MessageListState label={loadError} />
              ) : threads.length > 0 ? (
                threads.slice(0, 12).map((thread) => (
                <button
                  className={`grid min-h-[42px] grid-cols-[69px_minmax(0,1fr)_92px] items-center gap-[23px] rounded-[6px] border px-3 py-3 text-left text-[14px] leading-[1.253] text-[#6D7A8A] transition ${
                    thread.id === selectedThreadId
                      ? "border-[3px] border-[#6D7A8A]"
                      : "border-[#D9D9D9] hover:border-[#6D7A8A]"
                  }`}
                  key={thread.id}
                  onClick={() => onSelectThread(thread.id)}
                  type="button"
                >
                  <span className="truncate font-semibold">{thread.guestName}</span>
                  <span className="truncate font-semibold">
                    {thread.programTitle || "호스트 문의"}
                  </span>
                  <span className="whitespace-nowrap text-right font-medium">
                    {thread.dateLabel}
                  </span>
                </button>
                ))
              ) : (
                <MessageListState label="종료된 메세지가 없습니다." />
              )}
            </div>
          </div>
        </div>

        <ThreadDetailPanel thread={selectedThread} variant="ended" />
      </section>
    </HostWorkspaceLayout>
  );
}

function ThreadListButton({
  active,
  onClick,
  thread,
}: {
  active: boolean;
  onClick: () => void;
  thread: MessageThread;
}) {
  return (
    <button
      className={`flex h-[53px] w-full items-center gap-3 rounded-[12px] px-[6px] py-2 text-left transition ${
        active ? "bg-[#F3F3F3]" : "bg-[#F3F3F3]/85 hover:bg-[#F3F3F3]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="relative size-[35px] shrink-0 overflow-hidden rounded-full bg-[#D9D9D9]">
        {thread.imageUrl ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="35px"
            src={thread.imageUrl}
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[14px] leading-[1.253] text-[#6D7A8A] ${
            thread.unread ? "font-semibold" : "font-normal"
          }`}
        >
          {thread.programTitle}
        </span>
        <span className="block truncate text-[12px] font-medium leading-[1.253] text-[#6D7A8A]">
          {thread.guestName}
        </span>
      </span>
      <span className="flex h-full w-[42px] shrink-0 flex-col items-end justify-center pr-[6px]">
        {thread.unread ? (
          <span className="mb-auto mt-1 size-[6px] rounded-full bg-[#FE701E]" />
        ) : null}
        <span className="mt-auto whitespace-nowrap text-[12px] font-normal leading-[1.6] text-[#6D7A8A]">
          {thread.timeLabel}
        </span>
      </span>
    </button>
  );
}

function MessageListState({ label }: { label: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-[#D9D9D9] px-4 py-5 text-center text-[12px] font-medium leading-[1.6] text-[#6D7A8A]">
      {label}
    </div>
  );
}

function ChatConversationPanel({ thread }: { thread?: MessageThread }) {
  return (
    <section className="flex min-h-full flex-col px-4 pt-[14px]">
      <div className="flex justify-end px-[10px] py-1">
        <Search aria-hidden="true" className="size-5 text-[#CAC4BC]" strokeWidth={1.8} />
      </div>
      <div className="flex flex-1 items-start justify-center pt-4">
        {thread ? (
          <AutoAnswerPreview />
        ) : (
          <EmptyConversation label="대화를 선택해주세요." />
        )}
      </div>
      <div className="flex min-h-[58px] items-end pb-[11px] pr-[15px]">
        <label className="flex h-[37px] w-full items-center gap-2 rounded-full border border-[#FF9A3D] bg-[#F9F9F9] p-[9px]">
          <Plus
            aria-hidden="true"
            className="size-3 rounded-full bg-[#FF9A3D] text-white"
            strokeWidth={3}
          />
          <input
            className="min-w-0 flex-1 bg-transparent text-[12px] font-normal leading-[1.6] text-[#6D7A8A] outline-none placeholder:text-[#D9D9D9]"
            placeholder={thread ? "메세지 입력" : "대화를 선택해주세요"}
            type="text"
          />
        </label>
      </div>
    </section>
  );
}

function EmptyConversation({ label }: { label: string }) {
  return (
    <div className="grid min-h-[180px] w-full max-w-[365px] place-items-center rounded-[12px] border border-dashed border-[#D9D9D9] text-center text-[13px] font-medium leading-[1.6] text-[#6D7A8A]">
      {label}
    </div>
  );
}

function ThreadDetailPanel({
  actionError,
  closing = false,
  onCloseThread,
  previousThreads = [],
  thread,
  variant,
}: {
  actionError?: string;
  closing?: boolean;
  onCloseThread?: (thread: MessageThread) => void;
  previousThreads?: MessageThread[];
  thread?: MessageThread;
  variant: "ended" | "ongoing";
}) {
  const isEnded = variant === "ended";

  if (!thread) {
    return (
      <aside
        className={`min-w-0 border-l border-[#6D7A8A] px-5 ${
          isEnded
            ? "flex-1 pt-[50px]"
            : "pt-[17px] shadow-[2px_5px_5.2px_rgba(0,0,0,0.23)]"
        }`}
      >
        <div className="grid min-h-[240px] place-items-center rounded-[8px] border border-dashed border-[#D9D9D9] p-5 text-center text-[13px] font-medium leading-[1.6] text-[#6D7A8A]">
          대화를 선택하면 상세 정보가 표시됩니다.
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`min-w-0 border-l border-[#6D7A8A] px-5 ${
        isEnded ? "flex-1 pt-[50px]" : "pt-[17px] shadow-[2px_5px_5.2px_rgba(0,0,0,0.23)]"
      }`}
    >
      {isEnded ? (
        <div className="pb-5">
          <MiniProgramHeader thread={thread} />
          <div className="mt-5 flex items-center gap-5 px-4">
            <Avatar imageUrl={thread?.imageUrl} sizeClass="size-[42px]" />
            <div className="grid gap-5 text-[14px] font-normal leading-[1.253] text-[#5B3A29]">
              <p>게스트명 : {thread?.guestName ?? ""}</p>
              <p>예약정보 : {thread?.bookingInfo ?? ""}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="h-[113px] w-full rounded-[6px] bg-[#D9D9D9]" />
          <div className="mt-[13px] border-b-[0.8px] border-[#6D7A8A] px-3 pb-3">
            <div className="flex gap-[6px] text-[14px] leading-[1.253]">
              <p className="min-w-0 flex-1 truncate font-semibold text-[#5B3A29]">
                {thread?.programTitle ?? "프로그램 제목"}
              </p>
              <p className="shrink-0 font-normal text-[#6D7A8A]">
                {thread?.programNumber ?? "프로그램 넘버"}
              </p>
            </div>
            <div className="mt-[3px] flex items-center gap-3 pl-[6px]">
              <p className="min-w-0 flex-1 truncate text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
                오픈일 : {thread?.openDate ?? ""}
              </p>
              <span className="inline-flex h-[19px] items-center justify-center rounded-[6px] bg-[#F7B267] px-[6px] text-[12px] font-normal leading-[1.6] text-[#FCFCFC]">
                오픈
              </span>
            </div>
            <p className="mt-[3px] truncate text-[12px] font-medium leading-[1.253] text-[#6D7A8A]">
              여행 기간 {thread?.periodLabel ?? "0000. 00. 00 - 0000. 00. 00"}
            </p>
          </div>
          <div className="mt-4">
            <Avatar imageUrl={thread?.imageUrl} sizeClass="size-[42px]" />
            <div className="mt-[13px] grid gap-[13px] text-[14px] font-normal leading-[1.253] text-[#5B3A29]">
              <p>게스트명 : {thread?.guestName ?? ""}</p>
              <p>예약정보 : {thread?.bookingInfo ?? ""}</p>
            </div>
          </div>
          <button
            className="mt-4 inline-flex h-[30px] w-full items-center justify-center rounded-[6px] bg-[#CAC4BC] text-[12px] font-bold leading-[1.6] text-[#F3F3F3] disabled:cursor-wait disabled:opacity-70"
            disabled={!thread || closing}
            onClick={() => {
              if (thread && onCloseThread) onCloseThread(thread);
            }}
            type="button"
          >
            {closing ? "종료 중" : "상담 종료"}
          </button>
          {actionError ? (
            <p className="mt-2 text-[12px] font-semibold leading-[1.253] text-red-600">
              {actionError}
            </p>
          ) : null}
        </>
      )}

      {isEnded ? (
        <div className="mt-5 rounded-[8px] border border-[#6D7A8A] p-[18px]">
          <div className="mb-[33px] flex justify-end px-[10px] py-1">
            <Minus
              aria-hidden="true"
              className="h-[19px] w-[34px] rounded-full bg-[#A8AFB8] px-2 text-white"
              strokeWidth={2}
            />
          </div>
          <AutoAnswerPreview />
        </div>
      ) : null}

      {!isEnded ? (
        <div className="mt-3 grid gap-[6px]">
          <p className="text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
            이전 상담 내역
          </p>
          {previousThreads.length > 0 ? (
            previousThreads.slice(0, 3).map((previousThread) => (
              <button
                className="flex min-h-[32px] items-center gap-3 rounded-[6px] border border-[#6D7A8A] px-[10px] py-[7px] text-left text-[14px] leading-[1.253] text-[#6D7A8A]"
                key={previousThread.id}
                type="button"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {previousThread.programTitle || "호스트 문의"}
                </span>
                <span className="shrink-0 font-normal">
                  {previousThread.dateLabel}
                </span>
              </button>
            ))
          ) : (
            <p className="rounded-[6px] border border-[#D9D9D9] px-[10px] py-[7px] text-[12px] font-medium leading-[1.253] text-[#6D7A8A]">
              이전 상담 내역이 없습니다.
            </p>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function MiniProgramHeader({ thread }: { thread?: MessageThread }) {
  return (
    <div className="flex border-b border-[#D9D9D9] pb-2">
      <div className="relative h-[90px] w-[87px] shrink-0 overflow-hidden rounded-[16px] bg-[#D9D9D9]">
        {thread?.imageUrl ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="87px"
            src={thread.imageUrl}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 pl-[6px]">
        <div className="flex gap-1">
          <p className="min-w-0 flex-1 truncate text-[20px] font-semibold leading-[1.253] text-[#5B3A29]">
            {thread?.programTitle ?? "프로그램 제목 입력"}
          </p>
          <p className="shrink-0 text-[12px] font-normal leading-[1.6] text-[#6D7A8A]">
            {thread?.programNumber ?? "프로그램 넘버"}
          </p>
        </div>
        <div className="mt-1 grid gap-[3px] pl-[6px]">
          <div className="flex gap-3">
            <p className="min-w-0 flex-1 truncate text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
              오픈일 : {thread?.openDate ?? ""}
            </p>
            <span className="inline-flex h-[19px] items-center justify-center rounded-[6px] bg-[#F7B267] px-[6px] text-[12px] font-normal leading-[1.6] text-[#FCFCFC]">
              오픈
            </span>
          </div>
          <p className="truncate text-[12px] font-medium leading-[1.253] text-[#6D7A8A]">
            여행 기간 {thread?.periodLabel ?? "0000. 00. 00 - 0000. 00. 00"}
          </p>
        </div>
      </div>
    </div>
  );
}

function AutoAnswerPreview() {
  return (
    <div
      className="mx-auto w-full rounded-[12px] border border-[#D9D9D9] bg-[#F9F9F9] px-[18px] py-6"
      style={{ maxWidth: scaledSize(365) }}
    >
      <p className="whitespace-pre-wrap text-[14px] font-medium leading-[1.253] text-[#0D0D0C]">
        호스트가 입력한 첫인사 텍스트가 쓰여질 공간 입니다{"\n"}
        ex) 안녕하세요 ㅇㅇㅇ에 관심 가져주셔서 감사해요.{"\n"}
        궁금한 점이 있으시면 아래 항목을 눌러보세요 :)
      </p>
      <div className="mt-[6px] grid gap-[6px]">
        {[
          "집합 장소 및 시간 안내",
          "준비물과 복장 안내",
          "취소 및 환불 규정 안내",
          "호스트와 직접 소통하기",
        ].map((label, index) => (
          <button
            className={`flex min-h-[32px] items-center justify-center rounded-[7px] border border-[#F7B267] px-3 text-[12px] font-medium leading-[1.253] ${
              index === 3 ? "text-[#FE701E]" : "text-[#6D7A8A]"
            }`}
            key={label}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AutoAnswerSettingsDialog({ onClose }: { onClose: () => void }) {
  const [enabled, setEnabled] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [items, setItems] = useState(defaultAutoAnswerItems);

  function toggleItem(index: number) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  }

  function updateItem(index: number, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, value } : item,
      ),
    );
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/10 px-4 py-8"
      role="presentation"
    >
      <section
        aria-labelledby="auto-answer-settings-title"
        aria-modal="true"
        className="max-h-[calc(100vh-64px)] w-full max-w-[var(--host-msg-603)] overflow-y-auto rounded-[var(--host-msg-12)] border border-[#D9D9D9] bg-[#F9F9F9] px-[var(--host-msg-18)] py-[var(--host-msg-24)] shadow-[0_18px_54px_rgba(13,13,12,0.16)]"
        role="dialog"
      >
        <div className="flex justify-end">
          <button
            aria-label="자동응답 설정 닫기"
            className="inline-flex size-[var(--host-msg-24)] items-center justify-center text-[#0D0D0C] transition hover:text-[#FE701E]"
            onClick={onClose}
            type="button"
          >
            <X className="size-[var(--host-msg-22)]" strokeWidth={2} />
          </button>
        </div>

        <div className="mt-[var(--host-msg-13)] flex items-end gap-[var(--host-msg-21)] pr-[var(--host-msg-38)]">
          <h2
            className="shrink-0 text-[length:var(--host-msg-14)] font-medium leading-[1.253] text-[#0D0D0C]"
            id="auto-answer-settings-title"
          >
            자동응답
          </h2>
          <p className="min-w-0 flex-1 text-[length:var(--host-msg-12)] font-medium leading-[1.253] text-[#6D7A8A]">
            게스트가 처음 메시지창을 열면 버튼이 표시돼요.
          </p>
          <ToggleButton
            active={enabled}
            label="자동응답 사용"
            onClick={() => setEnabled((value) => !value)}
          />
        </div>

        <input
          className="mt-[var(--host-msg-8)] h-[var(--host-msg-31)] w-full rounded-[var(--host-msg-7)] border border-[#F7B267] bg-transparent px-[var(--host-msg-12)] text-[length:var(--host-msg-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E]"
          onChange={(event) => setGreeting(event.target.value)}
          placeholder="게스트에게 첫 인사를 작성해주세요."
          value={greeting}
        />

        <div className="py-[var(--host-msg-16)]">
          <p className="text-[length:var(--host-msg-14)] font-medium leading-[1.253] text-[#0D0D0C]">
            자동응답 항목 선택
          </p>
          <div className="mt-[var(--host-msg-8)] grid gap-[var(--host-msg-8)]">
            {items.map((item, index) => (
              <div className="grid gap-[var(--host-msg-6)]" key={item.label}>
                <div className="flex items-center gap-[var(--host-msg-21)] pr-[var(--host-msg-38)] pt-[var(--host-msg-13)]">
                  <ToggleButton
                    active={item.enabled}
                    label={`${item.label} 사용`}
                    onClick={() => toggleItem(index)}
                  />
                  <p className="text-[length:var(--host-msg-12)] font-medium leading-[1.253] text-[#6D7A8A]">
                    {item.label}
                  </p>
                </div>
                <input
                  className="h-[var(--host-msg-31)] w-full rounded-[var(--host-msg-7)] border border-[#F7B267] bg-transparent px-[var(--host-msg-12)] text-[length:var(--host-msg-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9] focus:border-[#FE701E] disabled:opacity-70"
                  disabled={!item.enabled}
                  onChange={(event) => updateItem(index, event.target.value)}
                  placeholder={item.placeholder}
                  value={item.value}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-[var(--host-msg-26)] flex justify-end">
          <button
            className="inline-flex h-[var(--host-msg-29)] items-center justify-center rounded-[var(--host-msg-4)] bg-[#FE701E] px-[var(--host-msg-18)] text-[length:var(--host-msg-12)] font-medium leading-[1.253] text-[#FFF6EC] transition hover:bg-[#E85F13]"
            onClick={onClose}
            type="button"
          >
            저장
          </button>
        </div>
      </section>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-[var(--host-msg-12)] w-[var(--host-msg-23)] items-center rounded-full border transition ${
        active
          ? "border-[#FF9A3D] bg-[#FF9A3D]"
          : "border-[#6D7A8A] bg-[#F9F9F9]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`size-[var(--host-msg-10)] rounded-full bg-white transition ${
          active
            ? "translate-x-[var(--host-msg-11)]"
            : "translate-x-[var(--host-msg-2)] bg-[#F9F9F9]"
        }`}
      />
      <span className="sr-only">{label}</span>
      {active ? (
        <ToggleRight aria-hidden="true" className="hidden" />
      ) : (
        <ToggleLeft aria-hidden="true" className="hidden" />
      )}
    </button>
  );
}

function FilterPill({
  active = false,
  children,
}: {
  active?: boolean;
  children: string;
}) {
  return (
    <button
      className={`inline-flex h-[30px] min-w-[70px] items-center justify-center rounded-full px-5 text-[12px] font-bold leading-[1.6] ${
        active ? "bg-[#FF9A3D] text-[#F9F9F9]" : "bg-[#CAC4BC] text-[#F3F3F3]"
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

function Avatar({
  imageUrl,
  sizeClass,
}: {
  imageUrl?: string;
  sizeClass: string;
}) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-full bg-[#D9D9D9] ${sizeClass}`}
    >
      {imageUrl ? (
        <Image alt="" className="object-cover" fill sizes="42px" src={imageUrl} />
      ) : (
        <Circle aria-hidden="true" className="size-full text-[#D9D9D9]" />
      )}
    </span>
  );
}

function buildMessageThreads(
  inquiries: HostInquiry[],
  applications: HostApplication[],
): MessageThread[] {
  const applicationByProgramId = new Map(
    applications
      .filter((application) => application.programId)
      .map((application) => [application.programId, application]),
  );
  const applicationByProgramTitle = new Map(
    applications.map((application) => [normalizeTitle(application.programTitle), application]),
  );

  return inquiries.map((inquiry, index) => {
    const relatedApplication =
      applicationByProgramId.get(inquiry.programId) ??
      applicationByProgramTitle.get(normalizeTitle(inquiry.programTitle));
    const submitted = new Date(inquiry.submittedAt);
    const dateLabel = Number.isNaN(submitted.getTime())
      ? "0000. 00. 00"
      : new Intl.DateTimeFormat("ko-KR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
          .format(submitted)
          .replace(/\.$/u, "");

    return {
      bookingInfo:
        relatedApplication?.status === "completed"
          ? "참여 완료"
          : relatedApplication?.status === "accepted"
            ? "예약 확정"
            : "예약 확인 중",
      dateLabel,
      guestName: inquiry.contactName || "게스트명",
      id: inquiry.id || `message-thread-${index}`,
      imageUrl: resolveThreadImage(inquiry.programTitle),
      lastMessage: inquiry.message,
      openDate: dateLabel,
      periodLabel: "0000. 00. 00 - 0000. 00. 00",
      programNumber: inquiry.programId
        ? `P-${inquiry.programId.slice(0, 4).toUpperCase()}`
        : `P-${String(index + 1).padStart(4, "0")}`,
      programTitle:
        inquiry.programTitle || inquiry.title || "문의한 프로그램 명 또는 호스트 문의",
      sourceId: inquiry.id,
      status: inquiry.status,
      timeLabel: formatRelativeTime(inquiry.submittedAt, dateLabel),
      unread: inquiry.status === "new",
    };
  });
}

function resolveThreadImage(programTitle: string): string {
  if (programTitle.includes("차") || programTitle.includes("보성")) {
    return "/boseong/home-tea-time.png";
  }
  if (programTitle.includes("강릉")) {
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=480&q=80";
  }
  if (programTitle.includes("남해")) {
    return "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=480&q=80";
  }
  return "";
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/gu, "").trim().toLowerCase();
}

function formatRelativeTime(value: string, fallback: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (Number.isNaN(diffMs) || diffMs < 0) return fallback;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}분전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간전`;
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)}일전`;

  return fallback;
}

function formatTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}
