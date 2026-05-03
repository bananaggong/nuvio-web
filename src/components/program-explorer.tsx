"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  Clock3,
  Flame,
  MapPinned,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import {
  announcements,
  periodOptions,
  programs,
  regions,
  themeOptions,
} from "@/lib/data";
import type { PeriodKey, ProgramSort, ProgramStatus, ThemeKey } from "@/lib/types";
import { getDday } from "@/lib/format";
import { LiveAnnouncementStrip } from "./live-announcement-strip";
import { ProgramCard } from "./program-card";
import { ThemeIcon } from "./theme-icon";

const statusOptions: Array<{ key: "all" | ProgramStatus; label: string }> = [
  { key: "all", label: "전체" },
  { key: "open", label: "모집중" },
  { key: "upcoming", label: "모집예정" },
  { key: "closed", label: "모집종료" },
  { key: "earlyClosed", label: "조기종료" },
];

const sortOptions: Array<{ key: ProgramSort; label: string }> = [
  { key: "recent", label: "최신순" },
  { key: "deadline", label: "마감순" },
  { key: "subsidy", label: "지원금 높은순" },
];

const popularRegions = ["강원", "전남", "전북", "경남", "제주", "부산"];

export function ProgramExplorer({ initialTheme }: { initialTheme?: ThemeKey }) {
  const [keyword, setKeyword] = useState("");
  const [themes, setThemes] = useState<ThemeKey[]>(
    initialTheme ? [initialTheme] : [],
  );
  const [periods, setPeriods] = useState<PeriodKey[]>([]);
  const [region, setRegion] = useState("전체");
  const [status, setStatus] = useState<"all" | ProgramStatus>("all");
  const [sort, setSort] = useState<ProgramSort>("recent");
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);

  const filteredPrograms = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    return programs
      .filter((program) => {
        const matchesKeyword =
          !normalized ||
          [program.title, program.summary, program.description, program.region, program.city]
            .join(" ")
            .toLowerCase()
            .includes(normalized);
        const matchesThemes =
          themes.length === 0 ||
          themes.some((theme) => program.categories.includes(theme));
        const matchesPeriods =
          periods.length === 0 || periods.includes(program.periodKey);
        const matchesRegion = region === "전체" || program.region === region;
        const matchesStatus = status === "all" || program.status === status;

        return (
          matchesKeyword &&
          matchesThemes &&
          matchesPeriods &&
          matchesRegion &&
          matchesStatus
        );
      })
      .sort((a, b) => {
        if (sort === "deadline") {
          return new Date(a.recruitEnd).getTime() - new Date(b.recruitEnd).getTime();
        }
        if (sort === "subsidy") return b.subsidyAmount - a.subsidyAmount;
        return new Date(b.recruitStart).getTime() - new Date(a.recruitStart).getTime();
      });
  }, [keyword, periods, region, sort, status, themes]);

  const activeFilterCount =
    themes.length +
    periods.length +
    (region === "전체" ? 0 : 1) +
    (status === "all" ? 0 : 1);

  const visiblePrograms = filteredPrograms.slice(0, visibleCount);
  const featuredProgram = programs.find((program) => program.id === 1002) ?? programs[0];
  const endingSoonPrograms = [...programs]
    .filter((program) => program.status === "open")
    .sort(
      (a, b) =>
        new Date(a.recruitEnd).getTime() - new Date(b.recruitEnd).getTime(),
    )
    .slice(0, 3);
  const highSubsidyPrograms = [...programs]
    .filter((program) => program.subsidyAmount > 0)
    .sort((a, b) => b.subsidyAmount - a.subsidyAmount)
    .slice(0, 3);
  const openProgramCount = programs.filter((program) => program.status === "open").length;

  function toggleTheme(theme: ThemeKey) {
    setVisibleCount(8);
    setThemes((current) =>
      current.includes(theme)
        ? current.filter((item) => item !== theme)
        : [...current, theme],
    );
  }

  function togglePeriod(period: PeriodKey) {
    setVisibleCount(8);
    setPeriods((current) =>
      current.includes(period)
        ? current.filter((item) => item !== period)
        : [...current, period],
    );
  }

  function resetFilters() {
    setThemes([]);
    setPeriods([]);
    setRegion("전체");
    setStatus("all");
    setSort("recent");
    setVisibleCount(8);
  }

  function applyPreset(next: {
    themes?: ThemeKey[];
    status?: "all" | ProgramStatus;
    sort?: ProgramSort;
    region?: string;
  }) {
    setKeyword("");
    setPeriods([]);
    setThemes(next.themes ?? []);
    setStatus(next.status ?? "all");
    setSort(next.sort ?? "recent");
    setRegion(next.region ?? "전체");
    setVisibleCount(8);
  }

  return (
    <div>
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
          <div className="min-w-0">
            <p className="text-sm font-black text-[var(--primary)]">
              오늘 열려 있는 여행지원금
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl md:text-5xl">
              어디로 떠날지보다 먼저,
              <br className="hidden sm:block" /> 받을 수 있는 혜택을 찾으세요.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              한달살기, 워케이션, 반값여행, 로컬 프로젝트를 검색하고 마감 전에
              지원 상태를 기록할 수 있습니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["반값여행", "워케이션", "한달살기"].map((label) => (
                <button
                  className="rounded-md border border-slate-200 bg-[var(--surface-muted)] px-3 py-2 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  key={label}
                  onClick={() => {
                    const option = themeOptions.find((theme) => theme.label.includes(label));
                    if (option) applyPreset({ themes: [option.key] });
                  }}
                  type="button"
                >
                  {label} 바로 보기
                </button>
              ))}
            </div>
          </div>
          <aside className="grid min-w-0 overflow-hidden rounded-md border border-slate-200 bg-[var(--surface-muted)] shadow-sm">
            <Link
              className="group relative block min-h-52 overflow-hidden"
              href={`/programs/${featuredProgram.id}`}
            >
              <Image
                alt={featuredProgram.title}
                className="object-cover transition duration-300 group-hover:scale-105"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 420px"
                src={featuredProgram.image}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-4 text-white">
                <p className="text-xs font-black text-teal-100">이번 주 추천</p>
                <h2 className="mt-1 line-clamp-2 text-xl font-black">
                  {featuredProgram.title}
                </h2>
                <p className="mt-1 text-sm font-bold text-white/85">
                  {featuredProgram.subsidyLabel}
                </p>
              </div>
            </Link>
            <div className="grid grid-cols-3 gap-0 border-t border-slate-200 bg-white text-center">
              <HeroMetric label="모집중" value={openProgramCount} />
              <HeroMetric label="테마" value={themeOptions.length} />
              <HeroMetric label="공지" value={announcements.length} />
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-[var(--line)] bg-[var(--surface-muted)]">
        <div className="mx-auto grid max-w-6xl min-w-0 gap-3 px-5 py-3 md:px-8 lg:grid-cols-[1.15fr_0.85fr]">
          <LiveAnnouncementStrip fallbackAnnouncement={announcements[0]} />
          <div className="grid min-w-0 grid-cols-3 gap-2">
            {endingSoonPrograms.map((program) => (
              <Link
                className="min-w-0 rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-[var(--primary)] hover:ring-[var(--primary)]"
                href={`/programs/${program.id}`}
                key={program.id}
              >
                <span className="block font-mono font-black text-slate-950">
                  {getDday(program.recruitEnd, program.status)}
                </span>
                <span className="line-clamp-1">{program.city}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sticky top-16 z-30 border-b border-[var(--line)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 py-4 md:px-8">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                className="h-12 w-full rounded-md border border-slate-200 bg-white pl-12 pr-4 text-base font-semibold outline-none ring-[var(--primary)] placeholder:text-slate-400 focus:ring-2"
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setVisibleCount(8);
                }}
                placeholder="지역, 프로그램, 혜택 검색"
                type="search"
                value={keyword}
              />
            </label>
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              onClick={() => setFilterOpen(true)}
              type="button"
            >
              <SlidersHorizontal size={18} />
              필터
              {activeFilterCount > 0 ? (
                <span className="rounded-md bg-[var(--primary)] px-1.5 py-0.5 text-xs text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <label className="relative">
              <ArrowDownWideNarrow
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <select
                className="h-12 w-full appearance-none rounded-md border border-slate-200 bg-white pl-10 pr-10 text-sm font-black outline-none ring-[var(--primary)] focus:ring-2 lg:w-44"
                onChange={(event) => setSort(event.target.value as ProgramSort)}
                value={sort}
              >
                {sortOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {themeOptions.map((theme) => {
              const active = themes.includes(theme.key);
              return (
                <button
                  className={`flex min-w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-black transition ${
                    active
                      ? "border-[var(--primary)] bg-teal-50 text-[var(--primary-strong)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                  key={theme.key}
                  onClick={() => toggleTheme(theme.key)}
                  type="button"
                >
                  <ThemeIcon size={18} theme={theme.key} />
                  {theme.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="flex min-w-fit items-center gap-1 text-xs font-black text-slate-500">
              <MapPinned size={15} />
              인기 지역
            </span>
            {popularRegions.map((item) => (
              <button
                className={`min-w-fit rounded-md border px-3 py-1.5 text-xs font-black ${
                  region === item
                    ? "border-[var(--primary)] bg-teal-50 text-[var(--primary)]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
                key={item}
                onClick={() => applyPreset({ region: item })}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="mb-8 grid gap-3 lg:grid-cols-4">
          <QuickAction
            description="사전 신청과 영수증 관리가 중요한 페이백형 모집"
            icon={<Flame size={20} />}
            onClick={() => applyPreset({ themes: ["half"], sort: "deadline" })}
            title="반값여행만 보기"
          />
          <QuickAction
            description={`${endingSoonPrograms[0]?.city ?? "마감"}부터 빠르게 확인`}
            icon={<Clock3 size={20} />}
            onClick={() => applyPreset({ status: "open", sort: "deadline" })}
            title="마감 임박"
          />
          <QuickAction
            description={`${highSubsidyPrograms[0]?.subsidyLabel ?? "지원금"} 우선 탐색`}
            icon={<TrendingUp size={20} />}
            onClick={() => applyPreset({ sort: "subsidy" })}
            title="지원금 높은 순"
          />
          <QuickAction
            description="아이 동반, 반려견 동반 프로그램을 함께 보기"
            icon={<Sparkles size={20} />}
            onClick={() => applyPreset({ themes: ["family", "pet"] })}
            title="가족/반려 추천"
          />
        </div>

        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              프로그램 {filteredPrograms.length.toLocaleString("ko-KR")}개
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              카드의 마감일과 최종 조건은 공식 공고 링크에서 다시 확인하세요.
            </p>
          </div>
          {activeFilterCount > 0 || keyword ? (
            <button
              className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-[var(--primary)]"
              onClick={() => {
                setKeyword("");
                resetFilters();
              }}
              type="button"
            >
              <X size={16} />
              검색/필터 초기화
            </button>
          ) : null}
        </div>

        {visiblePrograms.length > 0 ? (
          <div className="grid gap-4">
            {visiblePrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-lg font-black text-slate-950">조건에 맞는 프로그램이 없어요.</p>
            <p className="mt-2 text-sm text-slate-500">
              지역이나 진행여부 필터를 조금 넓혀보세요.
            </p>
          </div>
        )}

        {visibleCount < filteredPrograms.length ? (
          <div className="mt-8 flex justify-center">
            <button
              className="h-12 rounded-md bg-slate-950 px-6 text-sm font-black text-white hover:bg-slate-800"
              onClick={() => setVisibleCount((count) => count + 6)}
              type="button"
            >
              더 보기
            </button>
          </div>
        ) : null}
      </section>

      {filterOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-0 sm:items-center sm:justify-center sm:p-6"
          role="dialog"
        >
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-md bg-white shadow-2xl sm:max-w-2xl sm:rounded-md">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <button
                aria-label="필터 닫기"
                className="rounded-md border border-slate-200 p-2 text-slate-600"
                onClick={() => setFilterOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
              <div className="text-base font-black">필터</div>
              <button
                className="text-sm font-black text-[var(--primary)]"
                onClick={resetFilters}
                type="button"
              >
                전체해제
              </button>
            </div>

            <div className="space-y-7 px-5 py-5">
              <FilterSection title="진행여부">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {statusOptions.map((option) => (
                    <button
                      className={`rounded-md border px-3 py-2 text-sm font-black ${
                        status === option.key
                          ? "border-[var(--primary)] bg-teal-50 text-[var(--primary)]"
                          : "border-slate-200 text-slate-600"
                      }`}
                      key={option.key}
                      onClick={() => {
                        setStatus(option.key);
                        setVisibleCount(8);
                      }}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="기간">
                <div className="grid gap-2 sm:grid-cols-2">
                  {periodOptions.map((option) => (
                    <label
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                      key={option.key}
                    >
                      <input
                        checked={periods.includes(option.key)}
                        className="size-4 accent-[var(--primary)]"
                        onChange={() => togglePeriod(option.key)}
                        type="checkbox"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="테마">
                <div className="flex flex-wrap gap-2">
                  {themeOptions.map((theme) => (
                    <button
                      className={`rounded-md border px-3 py-2 text-sm font-black ${
                        themes.includes(theme.key)
                          ? "border-[var(--primary)] bg-teal-50 text-[var(--primary)]"
                          : "border-slate-200 text-slate-600"
                      }`}
                      key={theme.key}
                      onClick={() => toggleTheme(theme.key)}
                      type="button"
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="지역">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {regions.map((item) => (
                    <button
                      className={`rounded-md border px-3 py-2 text-sm font-black ${
                        region === item
                          ? "border-[var(--primary)] bg-teal-50 text-[var(--primary)]"
                          : "border-slate-200 text-slate-600"
                      }`}
                      key={item}
                      onClick={() => {
                        setRegion(item);
                        setVisibleCount(8);
                      }}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </FilterSection>
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white p-5">
              <button
                className="h-12 w-full rounded-md bg-[var(--primary)] text-sm font-black text-white hover:bg-[var(--primary-strong)]"
                onClick={() => setFilterOpen(false)}
                type="button"
              >
                {filteredPrograms.length.toLocaleString("ko-KR")}개 결과 보기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-black text-slate-950">{title}</h3>
      {children}
    </section>
  );
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-slate-100 px-3 py-3 last:border-r-0">
      <div className="font-mono text-2xl font-black text-slate-950">{value}</div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="group rounded-md border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
      onClick={onClick}
      type="button"
    >
      <span className="inline-flex size-10 items-center justify-center rounded-md bg-teal-50 text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white">
        {icon}
      </span>
      <span className="mt-3 block font-black text-slate-950">{title}</span>
      <span className="mt-1 line-clamp-2 block text-sm leading-5 text-slate-500">
        {description}
      </span>
    </button>
  );
}
