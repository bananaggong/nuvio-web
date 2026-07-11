"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChannelGuestProfileHeader } from "@/components/channel-guest-profile-header";
import {
  channelGuestContentStyle,
  channelGuestScaleRootStyle,
  px,
} from "@/components/channel-guest-shared";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import {
  buildChannelProgramsHref,
  normalizeChannelProgramSortOrder,
  normalizeChannelProgramStatusFilter,
  type ChannelProgramSortOrder,
  type ChannelProgramStatusFilter,
} from "@/lib/channel-program-filters";
import { channelPath, channelProgramPath } from "@/lib/channel-routing";
import type { Program } from "@/lib/types";
import type { Village } from "@/lib/village-types";

type ChannelGuestProgramsPageProps = {
  initialFilter?: ChannelProgramStatusFilter;
  initialSort?: ChannelProgramSortOrder;
  programs: Program[];
  village: Village;
};

type ProgramCardModel = {
  activityStart: string;
  href: string;
  id: string;
  image?: string;
  period: string;
  recruitStart: string;
  recruitEnd: string;
  status: Program["status"];
  summary: string;
  title: string;
};

type ProgramStatusFilter = ChannelProgramStatusFilter;
type ProgramSortOrder = ChannelProgramSortOrder;

const text = {
  all: "전체",
  bell: "알림",
  boardType: "게시판형",
  channelHome: "채널 홈",
  closed: "마감",
  ddayFallback: "D+ 00",
  fallbackPeriod: "프로그램 기간",
  fallbackSummary:
    "프로그램 소개 간략한 작문글을 작성해 주세요. 얼마나 길게 넣을건지 생각을 해야하는데 약 두줄 정도로 생각을 합니다.",
  fallbackTitle: "프로그램 제목 입력",
  freeType: "자유형",
  galleryType: "갤러리형",
  latest: "최신순",
  magazineType: "매거진형",
  notice: "알림",
  oldFirst: "오래된순",
  open: "오픈",
  program: "프로그램",
  review: "후기",
  save: "저장",
  sort: "순서",
  upcoming: "예정",
} as const;

const programFilterOptions: Array<{ label: string; value: ProgramStatusFilter }> = [
  { label: text.all, value: "all" },
  { label: text.open, value: "open" },
  { label: text.upcoming, value: "upcoming" },
  { label: text.closed, value: "closed" },
];

const programEmptyMessages: Record<ProgramStatusFilter, string> = {
  all: "아직 프로그램이 없어요",
  closed: "아직 마감된 프로그램이 없어요",
  open: "아직 오픈된 프로그램이 없어요",
  upcoming: "아직 예정된 프로그램이 없어요",
};

export function ChannelGuestProgramsPage({
  initialFilter = "all",
  initialSort = "latest",
  programs,
  village,
}: ChannelGuestProgramsPageProps) {
  const homeHref = channelPath(village.slug);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilter = normalizeChannelProgramStatusFilter(searchParams.get("status"));
  const urlSort = normalizeChannelProgramSortOrder(searchParams.get("sort"));
  const activeFilter = searchParams.has("status") ? urlFilter : initialFilter;
  const sortOrder = searchParams.has("sort") ? urlSort : initialSort;
  const cards = useMemo(() => buildProgramCards(programs, village), [programs, village]);
  const visibleCards = useMemo(
    () => sortProgramCards(filterProgramCards(cards, activeFilter), sortOrder),
    [activeFilter, cards, sortOrder],
  );

  const updateProgramQuery = (
    nextFilter: ProgramStatusFilter,
    nextSort: ProgramSortOrder,
  ) => {
    router.replace(
      buildChannelProgramsHref({
        baseHref: pathname,
        filter: nextFilter,
        sort: nextSort,
      }),
      { scroll: false },
    );
  };
  const handleFilterChange = (value: ProgramStatusFilter) => {
    updateProgramQuery(value, sortOrder);
  };
  const handleSortChange = (value: ProgramSortOrder) => {
    updateProgramQuery(activeFilter, value);
  };

  return (
    <div
      className="channel-guest-page min-h-screen overflow-x-clip bg-white font-pretendard text-[#5B3A29]"
      style={channelGuestScaleRootStyle}
    >
      <main className="mx-auto w-full max-w-[1920px]">
        <ChannelGuestProfileHeader
          activeTab="program"
          homeHref={homeHref}
          village={village}
          wide
        />

        <section
          className="channel-guest-content mx-auto flex flex-col"
          style={{
            ...channelGuestContentStyle,
            gap: px(30),
            paddingBottom: px(90),
            paddingTop: px(8),
          }}
        >
          <FilterAndSortRow
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            sortOrder={sortOrder}
          />
          {visibleCards.length > 0 ? (
            <div
              className="channel-program-grid grid"
              style={{
                columnGap: px(36.6667),
                gridTemplateColumns: `repeat(3, ${px(344)})`,
                paddingLeft: px(20),
                rowGap: px(40),
              }}
            >
              {visibleCards.map((program) => (
                <ProgramGridCard key={program.id} program={program} />
              ))}
            </div>
          ) : (
            <ChannelProgramsEmptyState
              message={programEmptyMessages[activeFilter]}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function FilterAndSortRow({
  activeFilter,
  onFilterChange,
  onSortChange,
  sortOrder,
}: {
  activeFilter: ProgramStatusFilter;
  onFilterChange: (value: ProgramStatusFilter) => void;
  onSortChange: (value: ProgramSortOrder) => void;
  sortOrder: ProgramSortOrder;
}) {
  return (
    <div
      className="channel-program-toolbar flex items-center"
      style={{
        height: px(48),
        paddingLeft: px(9),
      }}
    >
      <div className="flex items-center" style={{ gap: px(10) }}>
        {programFilterOptions.map((option) => (
          <FilterButton
            active={activeFilter === option.value}
            key={option.value}
            label={option.label}
            onClick={() => onFilterChange(option.value)}
          />
        ))}
      </div>

      <div
        className="channel-program-sort ml-auto flex items-center justify-end text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#6D7A8A]"
        style={{
          gap: px(10),
          minWidth: px(330),
          paddingRight: px(3),
        }}
      >
        <span>{text.sort}</span>
        <span className="h-[1em] w-px bg-[#FF9A3D]" aria-hidden />
        <SortChoice
          active={sortOrder === "latest"}
          label={text.latest}
          onClick={() => onSortChange("latest")}
        />
        <SortChoice
          active={sortOrder === "oldest"}
          label={text.oldFirst}
          onClick={() => onSortChange("oldest")}
        />
      </div>
    </div>
  );
}

function FilterButton({
  active = false,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`channel-filter-pill rounded-full text-[length:var(--channel-font-12)] font-semibold leading-[1.253] ${
        active ? "bg-[#FF9A3D] text-white" : "bg-[#CAC4BC] text-white"
      }`}
      onClick={onClick}
      style={{
        height: px(30),
        width: px(70),
      }}
      type="button"
    >
      {label}
    </button>
  );
}

function SortChoice({
  active = false,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className="channel-sort-choice flex items-center"
      onClick={onClick}
      style={{ gap: px(4) }}
      type="button"
    >
      <span
        className="relative inline-flex shrink-0 items-center justify-center rounded-full"
        style={{
          border: `${px(1.5)} solid ${active ? "#FF9A3D" : "#CAC4BC"}`,
          height: px(14),
          width: px(14),
        }}
      >
        {active ? (
          <span
            className="rounded-full bg-[#FF9A3D]"
            style={{ height: px(7), width: px(7) }}
          />
        ) : null}
      </span>
      {label}
    </button>
  );
}

function ProgramGridCard({ program }: { program: ProgramCardModel }) {
  const status = getProgramStatus(program.status);
  const dday = getProgramDday(program.recruitEnd, program.status);

  return (
    <article
      className="channel-program-card flex flex-col"
      style={{
        gap: px(13),
        width: px(344),
      }}
    >
      <Link
        className="channel-program-card-image relative block overflow-hidden bg-[#D9D9D9]"
        href={program.href}
        style={{
          borderRadius: px(16),
          height: px(430),
          width: px(344),
        }}
      >
        {program.image ? (
          <Image
            alt={program.title}
            className="object-cover"
            fill
            sizes="(max-width: 1919px) 24vw, 459px"
            src={program.image}
          />
        ) : null}
      </Link>

      <div
        className="flex flex-col"
        style={{
          gap: px(13),
          paddingLeft: px(6),
        }}
      >
        <div className="flex items-center">
          <span
            className="inline-flex items-center justify-center rounded-[5px] text-[length:var(--channel-font-12)] font-semibold leading-[1.253] text-white"
            style={{
              backgroundColor: status.badgeColor,
              height: px(23),
              minWidth: px(31),
              paddingLeft: px(6),
              paddingRight: px(6),
            }}
          >
            {status.label}
          </span>
          {dday ? (
            <span
              className="text-[length:var(--channel-font-12)] font-semibold leading-[1.253] text-[#6D7A8A]"
              style={{ marginLeft: px(8) }}
            >
              {dday}
            </span>
          ) : null}
          <Image
            alt={program.status === "open" ? text.save : text.bell}
            height={19}
            src={program.status === "open" ? nuvioIcons.bookmark : nuvioIcons.bell}
            style={{
              height: px(19),
              marginLeft: "auto",
              width: px(program.status === "open" ? 17 : 19),
            }}
            width={program.status === "open" ? 17 : 19}
          />
        </div>

        <Link
          className="line-clamp-2 text-[length:var(--channel-font-16)] font-normal leading-[1.253] text-[#5B3A29]"
          href={program.href}
        >
          {program.title}
        </Link>
        <p className="line-clamp-2 text-[length:var(--channel-font-12)] font-normal leading-[1.6] text-[#CAC4BC]">
          {program.summary}
        </p>
        <p className="text-[length:var(--channel-font-12)] font-normal leading-[1.6] text-[#6D7A8A]">
          {program.period}
        </p>
      </div>
    </article>
  );
}

function buildProgramCards(programs: Program[], village: Village): ProgramCardModel[] {
  return programs.map((program) => ({
    activityStart: program.activityStart,
    href: channelProgramPath(village.slug, program.slug),
    id: String(program.id),
    image: program.image,
    period: formatCompactPeriod(program.activityStart, program.activityEnd),
    recruitStart: program.recruitStart,
    recruitEnd: program.recruitEnd,
    status: program.status,
    summary: program.summary || text.fallbackSummary,
    title: program.title || text.fallbackTitle,
  }));
}

function filterProgramCards(
  cards: ProgramCardModel[],
  activeFilter: ProgramStatusFilter,
) {
  if (activeFilter === "all") return cards;
  if (activeFilter === "closed") {
    return cards.filter(
      (program) => program.status === "closed" || program.status === "earlyClosed",
    );
  }

  return cards.filter((program) => program.status === activeFilter);
}

function sortProgramCards(cards: ProgramCardModel[], sortOrder: ProgramSortOrder) {
  return [...cards].sort((a, b) => {
    const aTime = getProgramSortTime(a);
    const bTime = getProgramSortTime(b);

    return sortOrder === "latest" ? bTime - aTime : aTime - bTime;
  });
}

function getProgramSortTime(program: ProgramCardModel) {
  const date =
    toDate(program.recruitStart) ||
    toDate(program.activityStart) ||
    toDate(program.recruitEnd);

  return date?.getTime() ?? 0;
}

function ChannelProgramsEmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div
      className="border border-dashed border-[#D6D6D6]"
      style={{
        margin: `${px(18)} ${px(20)} 0`,
        minHeight: px(320),
      }}
    >
      <NuvioEmptyState
        className="h-full"
        message={message}
      />
    </div>
  );
}

function getProgramStatus(status: Program["status"]) {
  if (status === "closed" || status === "earlyClosed") {
    return { badgeColor: "#6D7A8A", label: text.closed };
  }
  if (status === "upcoming") {
    return { badgeColor: "#FF9A3D", label: text.upcoming };
  }
  return { badgeColor: "#FF9A3D", label: text.open };
}

function getProgramDday(recruitEnd: string, status: Program["status"]) {
  if (status === "closed" || status === "earlyClosed") return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${recruitEnd}T23:59:59+09:00`);
  if (Number.isNaN(end.getTime())) return text.ddayFallback;

  const diff = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${String(diff).padStart(2, "0")}`;
  return `D+ ${String(Math.abs(diff)).padStart(2, "0")}`;
}

function formatCompactPeriod(start: string, end: string) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return text.fallbackPeriod;

  return `${startDate.getMonth() + 1}.${startDate.getDate()}-${endDate.getMonth() + 1}.${endDate.getDate()}`;
}

function toDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
