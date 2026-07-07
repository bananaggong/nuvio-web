"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import {
  channelGuestHref,
  channelHomeLabel,
  channelMenuMeta,
  getVisibleChannelMenuItems,
} from "@/lib/channel-menu";
import { villagePath, villageProgramPath } from "@/lib/village-routing";
import type { Program } from "@/lib/types";
import type { Village } from "@/lib/village-types";

type ChannelGuestProgramsPageProps = {
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

type ProgramStatusFilter = "all" | "open" | "upcoming" | "closed";
type ProgramSortOrder = "latest" | "oldest";

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

const px = (value: number) =>
  `clamp(${value}px, ${(value / 14.4).toFixed(6)}vw, ${(value * 4 / 3).toFixed(6)}px)`;

const scaleRootStyle = {
  "--channel-font-11": px(11),
  "--channel-font-12": px(12),
  "--channel-font-14": px(14),
  "--channel-font-16": px(16),
  "--channel-font-24": px(24),
} as CSSProperties;

const contentStyle = {
  maxWidth: `calc(100% - ${px(298)})`,
  width: px(1142),
} as CSSProperties;

const programFilterOptions: Array<{ label: string; value: ProgramStatusFilter }> = [
  { label: text.all, value: "all" },
  { label: text.open, value: "open" },
  { label: text.upcoming, value: "upcoming" },
  { label: text.closed, value: "closed" },
];

const programEmptyMessages: Record<ProgramStatusFilter, string> = {
  all: "아직 등록된 프로그램이 없어요",
  closed: "아직 마감된 프로그램이 없어요",
  open: "아직 오픈된 프로그램이 없어요",
  upcoming: "아직 예정된 프로그램이 없어요",
};

export function ChannelGuestProgramsPage({
  programs,
  village,
}: ChannelGuestProgramsPageProps) {
  const homeHref = villagePath(village.slug);
  const [activeFilter, setActiveFilter] = useState<ProgramStatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<ProgramSortOrder>("latest");
  const cards = useMemo(() => buildProgramCards(programs, village), [programs, village]);
  const visibleCards = useMemo(
    () => sortProgramCards(filterProgramCards(cards, activeFilter), sortOrder),
    [activeFilter, cards, sortOrder],
  );

  return (
    <div
      className="min-h-screen overflow-x-clip bg-white font-pretendard text-[#5B3A29]"
      style={scaleRootStyle}
    >
      <main className="mx-auto w-full max-w-[1920px]">
        <ChannelProfileHeader activeTab="program" homeHref={homeHref} village={village} />

        <section
          className="mx-auto flex flex-col"
          style={{
            ...contentStyle,
            gap: px(30),
            paddingBottom: px(90),
            paddingTop: px(8),
          }}
        >
          <FilterAndSortRow
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onSortChange={setSortOrder}
            sortOrder={sortOrder}
          />
          {visibleCards.length > 0 ? (
            <div
              className="grid"
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
              homeHref={homeHref}
              message={programEmptyMessages[activeFilter]}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function ChannelProfileHeader({
  activeTab,
  homeHref,
  village,
}: {
  activeTab: "home" | "program";
  homeHref: string;
  village: Village;
}) {
  const menuItems = getVisibleChannelMenuItems(village);

  return (
    <section
      className="mx-auto flex items-end border-b border-[#6D7A8A]"
      style={{
        ...contentStyle,
        gap: px(39),
        minHeight: px(185.658),
        padding: `${px(22)} ${px(58)} 0`,
      }}
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-[#D9D9D9]"
        style={{
          height: px(128),
          marginBottom: px(22),
          width: px(128),
        }}
      >
        {village.profileImage ? (
          <Image
            alt={`${village.name} profile`}
            className="object-cover"
            fill
            sizes="170px"
            src={village.profileImage}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-semibold leading-[1] text-[#6D7A8A]"
            style={{ fontSize: px(24) }}
          >
            {(village.name || village.logoText || "N").slice(0, 1)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col" style={{ gap: px(4) }}>
        <div className="flex items-end" style={{ gap: px(8) }}>
          <h1 className="text-[length:var(--channel-font-24)] font-medium leading-[1.253] text-[#0D0D0C]">
            {village.name}
          </h1>
          <span
            className="text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#6D7A8A]"
            style={{ paddingBottom: px(2) }}
          >
            {village.city || village.region}
          </span>
        </div>
        <p className="max-w-[60ch] truncate text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
          {village.tagline || village.summary}
        </p>
        <div className="flex items-center" style={{ gap: px(8) }}>
          <Image
            alt=""
            height={12}
            src={nuvioIcons.channelLink}
            style={{ height: px(12), width: px(12) }}
            width={12}
          />
          <span className="text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
            {village.region}
          </span>
          <span className="text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
            {village.slug}
          </span>
        </div>
        <div
          className="flex items-center"
          style={{
            gap: px(8),
            marginTop: px(4),
            paddingLeft: px(2),
          }}
        >
          <Image
            alt={text.bell}
            height={20}
            src={nuvioIcons.bell}
            style={{ height: px(20), width: px(19) }}
            width={19}
          />
          <Image
            alt={text.notice}
            height={18}
            src={nuvioIcons.message}
            style={{ height: px(18), width: px(18) }}
            width={18}
          />
        </div>
        <nav
          className="flex items-end"
          style={{
            gap: px(40),
            paddingTop: px(14),
          }}
        >
          <ChannelTab
            active={activeTab === "home"}
            href={homeHref}
            label={channelHomeLabel}
          />
          {menuItems.map((item) => (
            <ChannelTab
              active={activeTab === item.kind}
              href={channelGuestHref(item.kind, village)}
              key={item.id}
              label={item.label || channelMenuMeta[item.kind].defaultLabel}
            />
          ))}
        </nav>
      </div>
    </section>
  );
}

function ChannelTab({
  active = false,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`flex items-center justify-center whitespace-nowrap text-[length:var(--channel-font-16)] font-semibold leading-[1.253] text-[#5B3A29] ${
        active ? "border-b-2 border-[#FF9A3D]" : ""
      }`}
      href={href}
      style={{
        height: px(36),
        paddingBottom: px(8),
        paddingTop: active ? px(5) : px(8),
      }}
    >
      {label}
    </Link>
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
      className="flex items-center"
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
        className="ml-auto flex items-center justify-end text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#6D7A8A]"
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
      className={`rounded-full text-[length:var(--channel-font-12)] font-semibold leading-[1.253] ${
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
      className="flex items-center"
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
      className="flex flex-col"
      style={{
        gap: px(13),
        width: px(344),
      }}
    >
      <Link
        className="relative block overflow-hidden bg-[#D9D9D9]"
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
            width={19}
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
    href: villageProgramPath(village.slug, program.slug),
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
  homeHref,
  message,
}: {
  homeHref: string;
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
        actionHref={`${homeHref}/programs`}
        actionLabel="프로그램 찾아보기"
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
