"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { periodOptions, programs, regions, themeOptions } from "@/lib/data";
import type { PeriodKey, ProgramSort, ProgramStatus, ThemeKey } from "@/lib/types";
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

export function ProgramExplorer() {
  const [keyword, setKeyword] = useState("");
  const [themes, setThemes] = useState<ThemeKey[]>([]);
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

  return (
    <div>
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 md:px-8 lg:grid-cols-[1fr_330px] lg:items-end">
          <div>
            <p className="text-sm font-black text-[var(--primary)]">
              오늘 열려 있는 여행지원금
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              어디로 떠날지보다 먼저,
              <br className="hidden sm:block" /> 받을 수 있는 혜택을 찾으세요.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              한달살기, 워케이션, 반값여행, 로컬 프로젝트를 검색하고 마감 전에
              지원 상태를 기록할 수 있습니다.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-mono text-2xl font-black text-slate-950">
                  {programs.length}
                </div>
                <div className="text-xs font-bold text-slate-500">초기 프로그램</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-black text-[var(--primary)]">
                  13
                </div>
                <div className="text-xs font-bold text-slate-500">테마 필터</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-black text-[var(--accent)]">
                  5
                </div>
                <div className="text-xs font-bold text-slate-500">공지 유형</div>
              </div>
            </div>
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
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 md:px-8">
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
