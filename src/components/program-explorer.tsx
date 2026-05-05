"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  Clock3,
  Database,
  FileSearch,
  MapPinned,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { announcements } from "@/lib/data";
import type {
  PeriodKey,
  Program,
  ProgramSort,
  ProgramStatus,
  ThemeKey,
} from "@/lib/types";
import { LiveAnnouncementStrip } from "./live-announcement-strip";
import { ProgramCard, SourceNotice } from "./program-card";
import { ThemeIcon } from "./theme-icon";

const themeOptions: Array<{ key: ThemeKey; label: string }> = [
  { key: "short", label: "짧은여행" },
  { key: "month", label: "7일~한달살기" },
  { key: "workation", label: "워케이션" },
  { key: "local", label: "로컬프로젝트" },
  { key: "returnFarm", label: "귀농귀촌" },
  { key: "event", label: "공모/이벤트" },
  { key: "half", label: "반값여행" },
  { key: "benefit", label: "지원혜택" },
  { key: "family", label: "가족" },
  { key: "pet", label: "반려동물" },
];

const periodOptions: Array<{ key: PeriodKey; label: string }> = [
  { key: "under4", label: "4박 이하" },
  { key: "week", label: "1주 내외" },
  { key: "twoWeeks", label: "2주 내외" },
  { key: "threeWeeks", label: "3주 내외" },
  { key: "month", label: "한달살기" },
];

const regions = [
  "전체",
  "전국",
  "서울",
  "부산",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

const statusOptions: Array<{ key: "all" | ProgramStatus; label: string }> = [
  { key: "all", label: "전체" },
  { key: "open", label: "모집중" },
  { key: "upcoming", label: "원문 확인" },
  { key: "closed", label: "마감" },
  { key: "earlyClosed", label: "조기마감" },
];

const sortOptions: Array<{ key: ProgramSort; label: string }> = [
  { key: "recent", label: "최신 공고순" },
  { key: "deadline", label: "마감 임박순" },
  { key: "subsidy", label: "지원금 높은순" },
];

type ProgramExplorerProps = {
  initialTheme?: ThemeKey;
  programs: Program[];
};

export function ProgramExplorer({ initialTheme, programs }: ProgramExplorerProps) {
  const availablePrograms = programs;
  const [keyword, setKeyword] = useState("");
  const [themes, setThemes] = useState<ThemeKey[]>(
    initialTheme ? [initialTheme] : [],
  );
  const [periods, setPeriods] = useState<PeriodKey[]>([]);
  const [region, setRegion] = useState("전체");
  const [status, setStatus] = useState<"all" | ProgramStatus>("all");
  const [sort, setSort] = useState<ProgramSort>("recent");
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const filteredPrograms = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    return availablePrograms
      .filter((program) => {
        const searchableText = [
          program.title,
          program.summary,
          program.description,
          program.region,
          program.city,
          program.sourceName,
          ...program.hashtags,
        ]
          .join(" ")
          .toLowerCase();
        const matchesKeyword = !normalized || searchableText.includes(normalized);
        const matchesThemes =
          themes.length === 0 ||
          themes.some((theme) => program.categories.includes(theme));
        const matchesPeriods =
          periods.length === 0 || periods.includes(program.periodKey);
        const matchesRegion =
          region === "전체" || program.region === region || program.region.includes(region);
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
  }, [availablePrograms, keyword, periods, region, sort, status, themes]);

  const sourceStats = useMemo(() => {
    const externalCount = availablePrograms.filter(
      (program) => program.dataSource === "external",
    ).length;
    const dbCount = availablePrograms.filter(
      (program) => program.dataSource === "database",
    ).length;
    const seedCount = availablePrograms.filter(
      (program) => program.dataSource === "seed" || !program.dataSource,
    ).length;
    const sourceCount = new Set(
      availablePrograms
        .filter((program) => program.dataSource === "external")
        .map((program) => program.sourceName),
    ).size;

    return { externalCount, dbCount, seedCount, sourceCount };
  }, [availablePrograms]);

  const activeFilterCount =
    themes.length +
    periods.length +
    (region === "전체" ? 0 : 1) +
    (status === "all" ? 0 : 1);

  const visiblePrograms = filteredPrograms.slice(0, visibleCount);

  function toggleTheme(theme: ThemeKey) {
    setVisibleCount(10);
    setThemes((current) =>
      current.includes(theme)
        ? current.filter((item) => item !== theme)
        : [...current, theme],
    );
  }

  function togglePeriod(period: PeriodKey) {
    setVisibleCount(10);
    setPeriods((current) =>
      current.includes(period)
        ? current.filter((item) => item !== period)
        : [...current, period],
    );
  }

  function resetFilters() {
    setKeyword("");
    setThemes([]);
    setPeriods([]);
    setRegion("전체");
    setStatus("all");
    setSort("recent");
    setVisibleCount(10);
  }

  return (
    <div className="bg-[var(--background)]">
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-5 md:px-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
                <RefreshCw size={17} />
                공식 공고 수집 중
              </p>
              <h1 className="mt-2 max-w-4xl text-2xl font-black leading-tight text-slate-950 md:text-3xl">
                지역 체류, 워케이션, 여행지원금 공고 탐색
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                공식 RSS와 공고 소스를 하루 1-2회 갱신하고 모집 가능성이 있는 항목만 후보로 분류합니다.
                운영자가 검수한 항목은 신청, 결제, 기수 관리 흐름으로 이어집니다.
              </p>
            </div>
            <div className="grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 bg-[var(--surface-muted)]">
              <Metric label="수집 후보" value={sourceStats.externalCount} />
              <Metric label="공식 소스" value={sourceStats.sourceCount} />
              <Metric label="직접 게시" value={sourceStats.dbCount} />
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <LiveAnnouncementStrip fallbackAnnouncement={announcements[0]} />
            <SourceNotice />
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
                  setVisibleCount(10);
                }}
                placeholder="지역, 공고명, 지원 키워드 검색"
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
              지역
            </span>
            {regions.map((item) => (
              <button
                className={`min-w-fit rounded-md border px-3 py-1.5 text-xs font-black ${
                  region === item
                    ? "border-[var(--primary)] bg-teal-50 text-[var(--primary)]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
                key={item}
                onClick={() => {
                  setRegion(item);
                  setVisibleCount(10);
                }}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              공고 후보 {filteredPrograms.length.toLocaleString("ko-KR")}건
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              자동 수집 항목은 후보입니다. 운영자가 검수해 프로그램으로 게시하면 신청/결제/기수 관리 흐름에 연결됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sourceStats.seedCount > 0 ? (
              <SmallBadge icon={<Database size={15} />} label={`예시 데이터 ${sourceStats.seedCount}`} />
            ) : null}
            <SmallBadge icon={<FileSearch size={15} />} label={`외부 공고 ${sourceStats.externalCount}`} />
            <SmallBadge icon={<Database size={15} />} label={`직접 게시 ${sourceStats.dbCount}`} />
            <SmallBadge icon={<Clock3 size={15} />} label="원문 우선" />
          </div>
        </div>

        {visiblePrograms.length > 0 ? (
          <div className="grid gap-3">
            {visiblePrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-lg font-black text-slate-950">조건에 맞는 공고가 없습니다.</p>
            <p className="mt-2 text-sm text-slate-500">
              지역이나 테마 필터를 줄여서 다시 확인해 주세요.
            </p>
          </div>
        )}

        {visibleCount < filteredPrograms.length ? (
          <div className="mt-8 flex justify-center">
            <button
              className="h-12 rounded-md bg-slate-950 px-6 text-sm font-black text-white hover:bg-slate-800"
              onClick={() => setVisibleCount((count) => count + 10)}
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
                전체 해제
              </button>
            </div>

            <div className="space-y-7 px-5 py-5">
              <FilterSection title="상태">
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
                        setVisibleCount(10);
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
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white p-5">
              <button
                className="h-12 w-full rounded-md bg-[var(--primary)] text-sm font-black text-white hover:bg-[var(--primary-strong)]"
                onClick={() => setFilterOpen(false)}
                type="button"
              >
                {filteredPrograms.length.toLocaleString("ko-KR")}건 보기
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-slate-200 p-4 last:border-r-0">
      <div className="font-mono text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}

function SmallBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-600">
      {icon}
      {label}
    </span>
  );
}
