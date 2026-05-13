"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  MapPinned,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type {
  PeriodKey,
  Program,
  ProgramSort,
  ProgramStatus,
  ThemeKey,
} from "@/lib/types";
import { ProgramCard } from "./program-card";
import { ThemeIcon } from "./theme-icon";

const themeOptions: Array<{ key: ThemeKey; label: string }> = [
  { key: "workation", label: "워케이션" },
  { key: "month", label: "한달살기" },
  { key: "short", label: "짧은여행" },
  { key: "local", label: "로컬프로젝트" },
  { key: "half", label: "반값여행" },
  { key: "returnFarm", label: "귀농귀촌" },
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
  { key: "upcoming", label: "확인 필요" },
  { key: "closed", label: "마감" },
  { key: "earlyClosed", label: "조기마감" },
];

const sortOptions: Array<{ key: ProgramSort; label: string }> = [
  { key: "recent", label: "최신순" },
  { key: "deadline", label: "마감 임박순" },
];

type ProgramExplorerProps = {
  initialKeyword?: string;
  initialTheme?: ThemeKey;
  programs: Program[];
};

export function ProgramExplorer({
  initialKeyword = "",
  initialTheme,
  programs,
}: ProgramExplorerProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [themes, setThemes] = useState<ThemeKey[]>(
    initialTheme ? [initialTheme] : [],
  );
  const [periods, setPeriods] = useState<PeriodKey[]>([]);
  const [region, setRegion] = useState("전체");
  const [status, setStatus] = useState<"all" | ProgramStatus>("all");
  const [sort, setSort] = useState<ProgramSort>("recent");
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const filteredPrograms = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    return programs
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

        return new Date(b.recruitStart).getTime() - new Date(a.recruitStart).getTime();
      });
  }, [keyword, periods, programs, region, sort, status, themes]);

  const activeFilterCount =
    themes.length +
    periods.length +
    (region === "전체" ? 0 : 1) +
    (status === "all" ? 0 : 1);

  const visiblePrograms = filteredPrograms.slice(0, visibleCount);

  function toggleTheme(theme: ThemeKey) {
    setVisibleCount(12);
    setThemes((current) =>
      current.includes(theme)
        ? current.filter((item) => item !== theme)
        : [...current, theme],
    );
  }

  function togglePeriod(period: PeriodKey) {
    setVisibleCount(12);
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
    setVisibleCount(12);
  }

  return (
    <div className="bg-white">
      <section className="border-b border-[var(--line)] bg-white">
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
                  setVisibleCount(12);
                }}
                placeholder="프로그램명, 지역, 로컬홈 검색"
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
                className="h-12 w-full appearance-none rounded-md border border-slate-200 bg-white pl-10 pr-10 text-sm font-black outline-none ring-[var(--primary)] focus:ring-2 lg:w-40"
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
                  setVisibleCount(12);
                }}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-7 md:px-8 md:py-10">
        <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              프로그램 {filteredPrograms.length.toLocaleString("ko-KR")}개
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              로컬홈 운영자가 등록했거나 누비오가 검수한 프로그램만 보여줍니다.
            </p>
          </div>
        </div>

        {visiblePrograms.length > 0 ? (
          <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-lg font-black text-slate-950">
              조건에 맞는 프로그램이 없습니다.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              지역이나 테마 필터를 줄여서 다시 확인해 주세요.
            </p>
          </div>
        )}

        {visibleCount < filteredPrograms.length ? (
          <div className="mt-10 flex justify-center">
            <button
              className="h-12 rounded-md bg-slate-950 px-6 text-sm font-black text-white hover:bg-slate-800"
              onClick={() => setVisibleCount((count) => count + 12)}
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
                        setVisibleCount(12);
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
