"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChannelContentSkeleton,
  ChannelEmptyState,
  ChannelProfileHeader,
} from "@/components/host-channel-home";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import {
  filterProgramsForChannel,
  hostChannelProgramsEndpoint,
  selectHostChannel,
} from "@/lib/host-channel-selection";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import type { ProgramStatus } from "@/lib/types";
import { channelPath } from "@/lib/channel-routing";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
};

type HostProgramsPayload = {
  data?: HostProgramDraft[];
};

const filters = [
  { label: "전체", value: "all" },
  { label: "오픈", value: "open" },
  { label: "예정", value: "upcoming" },
  { label: "마감", value: "closed" },
] as const;

type ProgramFilter = (typeof filters)[number]["value"];
type SortOrder = "latest" | "oldest";

export function HostChannelPrograms() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const [channel, setChannel] = useState<Village | null>(null);
  const [programs, setPrograms] = useState<HostProgramDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ProgramFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      const channelResponse = await fetch("/api/host/channels", {
        cache: "no-store",
      }).catch(() => null);

      if (!active) return;

      if (!channelResponse?.ok) {
        setChannel(null);
        setPrograms([]);
        setIsLoading(false);
        return;
      }

      const channelPayload = (await channelResponse.json().catch(() => ({}))) as HostChannelPayload;
      const selectedChannel = selectHostChannel(
        channelPayload.data,
        requestedChannelSlug,
      );
      setChannel(selectedChannel);

      const programsEndpoint = hostChannelProgramsEndpoint(selectedChannel);
      if (!programsEndpoint) {
        setPrograms([]);
        setIsLoading(false);
        return;
      }

      const programsResponse = await fetch(programsEndpoint, {
        cache: "no-store",
      }).catch(() => null);
      if (!active) return;

      if (programsResponse?.ok) {
        const programsPayload = (await programsResponse.json().catch(() => ({}))) as HostProgramsPayload;
        setPrograms(filterProgramsForChannel(programsPayload.data, selectedChannel));
      } else {
        setPrograms([]);
      }
      setIsLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [requestedChannelSlug]);

  const publicHref = channel?.slug ? channelPath(channel.slug) : "";
  const visiblePrograms = useMemo(() => {
    return programs
      .filter((program) => {
        if (activeFilter === "all") return true;
        if (activeFilter === "closed") {
          return program.status === "closed" || program.status === "earlyClosed";
        }

        return program.status === activeFilter;
      })
      .sort((a, b) => {
        const latest = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
        return sortOrder === "latest" ? latest : -latest;
      });
  }, [activeFilter, programs, sortOrder]);

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1114)]">
      <section className="min-w-0 flex-1 overflow-x-clip bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader
            activeLabel="프로그램"
            channel={channel}
            loading={isLoading}
            publicHref={publicHref}
          />

          <section className="px-[var(--host-44)] pt-[var(--host-8)] max-lg:px-5 max-lg:pt-5">
            <div className="flex h-[var(--host-48)] items-start justify-between pt-[var(--host-6)] max-lg:h-auto max-lg:flex-col max-lg:gap-2 max-lg:pt-0">
              <div className="flex max-w-full items-center gap-[var(--host-10)] overflow-x-auto pl-[var(--host-9)] text-[length:var(--host-12)] font-semibold leading-[1.253] max-lg:w-full max-lg:pl-0">
                {filters.map((filter) => {
                  const active = activeFilter === filter.value;

                  return (
                    <button
                      className={`inline-flex h-[var(--host-30)] w-[var(--host-70)] shrink-0 items-center justify-center rounded-full transition max-lg:min-h-11 max-lg:w-16 ${
                        active
                          ? "bg-[#FF9A3D] text-white"
                          : "bg-[#CAC4BC] text-white hover:bg-[#BEB7AF]"
                      }`}
                      key={filter.value}
                      onClick={() => setActiveFilter(filter.value)}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex h-[var(--host-18)] items-center gap-[var(--host-6)] pt-[var(--host-6)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A] max-lg:min-h-11 max-lg:w-full max-lg:justify-end max-lg:pt-0 max-lg:text-sm">
                <span className="mr-[var(--host-2)] text-[#6D7A8A]">순서</span>
                <SortButton active={sortOrder === "latest"} label="최신순" onClick={() => setSortOrder("latest")} />
                <SortButton active={sortOrder === "oldest"} label="오래된순" onClick={() => setSortOrder("oldest")} />
              </div>
            </div>

            <p className="mt-[var(--host-30)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A] max-lg:mt-4 max-lg:leading-5">
              편집을 원하는 프로그램을 클릭 시, 해당 프로그램의 설정 페이지로 이동해요
            </p>

            {isLoading ? (
              <div className="mt-[var(--host-30)] pl-[var(--host-20)] max-lg:mt-5 max-lg:pl-0">
                <ChannelContentSkeleton variant="programs" />
              </div>
            ) : visiblePrograms.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 gap-6 pl-0 sm:grid-cols-2 lg:mt-[var(--host-30)] lg:grid-cols-3 lg:gap-x-[var(--host-36-7)] lg:gap-y-[var(--host-40)] lg:pl-[var(--host-20)] min-[1440px]:grid-cols-[repeat(3,var(--host-344))]">
                {visiblePrograms.map((program, index) => (
                  <ChannelProgramCard key={`${program.id}-${index}`} program={program} />
                ))}
              </div>
            ) : (
              <div className="mt-[var(--host-30)] pl-[var(--host-20)] max-lg:mt-5 max-lg:pl-0">
                <ChannelEmptyState
                  description="호스트센터에서 프로그램을 생성하고 공개하면 채널 프로그램 목록에 표시됩니다."
                  title="아직 표시할 프로그램이 없습니다."
                />
              </div>
            )}
          </section>

          <footer className="mt-[var(--host-8)] flex h-[var(--host-69)] items-start border-t border-[#6D7A8A] px-[var(--host-28)] pt-[var(--host-20)] max-lg:items-center max-lg:px-5 max-lg:pt-0">
            <button
              className="inline-flex h-[var(--host-29)] w-[var(--host-58)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] max-lg:min-h-11 max-lg:w-full max-lg:text-sm"
              type="button"
            >
              저장
            </button>
          </footer>
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function SortButton({
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
      className={`inline-flex h-[var(--host-18)] items-center gap-[var(--host-3)] transition max-lg:min-h-11 ${
        active ? "text-[#6D7A8A]" : "text-[#CAC4BC]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`grid size-[var(--host-14)] place-items-center rounded-full border ${
          active ? "border-[#FE701E]" : "border-[#CAC4BC]"
        }`}
      >
        <span
          className={`size-[var(--host-8)] rounded-full ${
            active ? "bg-[#FE701E]" : "bg-transparent"
          }`}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}

function ChannelProgramCard({ program }: { program: HostProgramDraft }) {
  const href = `/host/programs/${encodeURIComponent(program.id)}`;
  const status = program.status === "earlyClosed" ? "closed" : program.status;
  const statusCopy = getProgramStatusCopy(status);
  const dayCopy = formatProgramPeriod(program);
  const imageSrc = getDisplayableImage(program.image);

  return (
    <article className="h-[var(--host-591)] w-[var(--host-344)] max-[1439px]:h-auto max-[1439px]:w-full" data-channel-program-card>
      <Link className="group block h-full" href={href}>
        <div className="relative h-[var(--host-430)] w-full overflow-hidden rounded-[16px] bg-[#D9D9D9] max-[1439px]:h-auto max-[1439px]:aspect-[4/5] max-lg:rounded-[8px]" data-channel-program-thumb>
          {imageSrc ? (
            <Image
              alt=""
              className="object-cover transition duration-200 group-hover:scale-[1.03]"
              fill
              sizes="(min-width: 1920px) 459px, 344px"
              src={imageSrc}
            />
          ) : null}
        </div>
        <div className="mt-[var(--host-12)] flex items-center gap-[var(--host-8)]">
          <span
            className={`inline-flex h-[var(--host-20)] items-center rounded-[5px] px-[var(--host-8)] text-[length:var(--host-11)] font-semibold leading-[1.253] text-white ${statusCopy.className}`}
          >
            {statusCopy.label}
          </span>
          <span className="truncate text-[length:var(--host-11)] font-semibold leading-[1.253] text-[#6D7A8A]">
            {dayCopy}
          </span>
          <Image
            alt=""
            className="ml-auto size-[var(--host-18)] shrink-0 opacity-70"
            height={18}
            src={status === "open" ? nuvioIcons.bookmark : nuvioIcons.bell}
            width={18}
          />
        </div>
        <h2 className="mt-[var(--host-14)] line-clamp-1 text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
          {program.title || "제목 미입력"}
        </h2>
        <p className="mt-[var(--host-12)] line-clamp-3 text-[length:var(--host-12)] font-normal leading-[1.62] text-[#CAC4BC]">
          {program.summary ||
            "프로그램 소개 간략한 후킹을 작성해 주세요. 얼마나 길게 넣을건지 생각을 해야하는데 두 줄 정도로 생각을 합니다."}
        </p>
        <p className="mt-[var(--host-24)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
          프로그램 기간
        </p>
      </Link>
    </article>
  );
}

function formatProgramPeriod(program: HostProgramDraft): string {
  const start = formatShortDate(program.activityStart);
  const end = formatShortDate(program.activityEnd);

  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} 시작`;
  if (end) return `${end} 종료`;

  return "일정 미정";
}

function formatShortDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getDisplayableImage(src: string): string | undefined {
  const value = src.trim();
  if (!value) return undefined;
  if (/^https?:\/\//u.test(value)) return value;
  if (/^\/.+\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/iu.test(value)) return value;

  return undefined;
}

function getProgramStatusCopy(status: ProgramStatus): {
  className: string;
  label: string;
} {
  switch (status) {
    case "open":
      return { className: "bg-[#FF9A3D]", label: "오픈" };
    case "upcoming":
      return { className: "bg-[#C95A33]", label: "예정" };
    case "closed":
    case "earlyClosed":
      return { className: "bg-[#6D7A8A]", label: "마감" };
    default:
      return { className: "bg-[#6D7A8A]", label: "마감" };
  }
}
