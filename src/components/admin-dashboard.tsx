"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  ListChecks,
  MessageSquareText,
  Plus,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { programs, reviews, statusLabels } from "@/lib/data";
import {
  implementationStatus,
  summarizeImplementationStatus,
} from "@/lib/implementation-status";
import type { Program, ProgramLead, ProgramStatus } from "@/lib/types";
import { AnnouncementSourceMonitor } from "./announcement-source-monitor";
import { ProgramLeadQueue } from "./program-lead-queue";

type Submission = Record<string, string>;

const programStatusTone: Record<ProgramStatus, string> = {
  open: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  upcoming: "bg-blue-50 text-blue-700 ring-blue-100",
  closed: "bg-slate-100 text-slate-700 ring-slate-200",
  earlyClosed: "bg-rose-50 text-rose-700 ring-rose-100",
};

const adminQuickLinks = [
  {
    href: "/admin/implementation",
    label: "구현 현황",
    helper: "PRD 대비 완료/검증 항목",
    icon: ListChecks,
  },
  {
    href: "/host/programs",
    label: "프로그램 검수",
    helper: "초안 등록, 발행, 공개 노출",
    icon: ClipboardList,
  },
  {
    href: "/host/applications",
    label: "신청자 CRM",
    helper: "신청 상태와 상세 응답 확인",
    icon: Users,
  },
] as const;

export function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [drafts, setDrafts] = useState<Submission[]>([]);

  useEffect(() => {
    const storageTimeoutId = window.setTimeout(() => {
      setSubmissions(readStorageArray("nuvio:partner-submissions"));
      setDrafts(readStorageArray("nuvio:admin-program-drafts"));
    }, 0);

    return () => window.clearTimeout(storageTimeoutId);
  }, []);

  const implementationSummary = useMemo(
    () => summarizeImplementationStatus(),
    [],
  );
  const openPrograms = useMemo(
    () => programs.filter((program) => program.status === "open"),
    [],
  );
  const upcomingPrograms = useMemo(
    () => programs.filter((program) => program.status === "upcoming"),
    [],
  );
  const recentPrograms = useMemo(() => programs.slice(0, 5), []);

  const metrics = [
    {
      label: "전체 프로그램",
      value: `${programs.length}개`,
      helper: "공개/시드/운영 데이터",
      icon: ClipboardList,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "모집중",
      value: `${openPrograms.length}개`,
      helper: "신청 가능한 프로그램",
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "커뮤니티",
      value: `${reviews.length}건`,
      helper: "후기와 경험 기록",
      icon: MessageSquareText,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "PRD 구현",
      value: `${implementationSummary.implemented}/${implementationSummary.total}`,
      helper: `마지막 정리 ${implementationStatus.updatedAt}`,
      icon: ListChecks,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft = Object.fromEntries(form.entries()) as Submission;
    const next = [{ ...draft, createdAt: new Date().toISOString() }, ...drafts];
    setDrafts(next);
    window.localStorage.setItem("nuvio:admin-program-drafts", JSON.stringify(next));
    event.currentTarget.reset();
  }

  function createDraftFromLead(lead: ProgramLead) {
    const draft: Submission = {
      title: lead.title,
      region: lead.suggestedRegion ?? "",
      subsidy: lead.suggestedThemes.includes("benefit")
        ? "지원 조건 확인 필요"
        : "혜택 확인 필요",
      summary: lead.summary,
      sourceName: lead.sourceName,
      sourceUrl: lead.sourceUrl ?? "",
      createdAt: new Date().toISOString(),
    };
    const next = [draft, ...drafts];
    setDrafts(next);
    window.localStorage.setItem("nuvio:admin-program-drafts", JSON.stringify(next));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-md border border-slate-200 bg-white p-6">
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <Shield size={18} />
            관리자 운영 대시보드
          </p>
          <h1 className="mt-4 max-w-3xl text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
            레거시 관리자 홈처럼 검수할 일과 운영 지표를 한 화면에 모았습니다.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            프로그램 소스, 외부 공고, 신청자 CRM, PRD 구현 상태를 한 콘솔에서
            빠르게 이동할 수 있도록 재구성했습니다. 기존 관리자 기능은 유지하고
            화면 구조만 운영 대시보드형으로 맞췄습니다.
          </p>
        </div>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">빠른 검수</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                관리자 권한으로 자주 여는 화면
              </p>
            </div>
            <Sparkles className="text-[var(--primary)]" size={20} />
          </div>
          <div className="mt-4 grid gap-2">
            {adminQuickLinks.map((link) => {
              const Icon = link.icon;

              return (
                <Link
                  className="grid grid-cols-[36px_minmax(0,1fr)_16px] items-center gap-3 rounded-md border border-slate-200 p-3 hover:border-[var(--primary)] hover:bg-teal-50"
                  href={link.href}
                  key={link.href}
                >
                  <span className="grid size-9 place-items-center rounded-md bg-slate-100 text-[var(--primary)]">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-slate-950">
                      {link.label}
                    </span>
                    <span className="mt-1 block truncate text-xs font-bold text-slate-500">
                      {link.helper}
                    </span>
                  </span>
                  <ArrowRight size={15} className="text-slate-400" />
                </Link>
              );
            })}
          </div>
        </section>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              className="rounded-md border border-slate-200 bg-white p-4"
              key={metric.label}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-2 font-mono text-3xl font-black text-slate-950">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {metric.helper}
                  </p>
                </div>
                <span className={`grid size-10 place-items-center rounded-md ${metric.tone}`}>
                  <Icon size={20} />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6">
          <AdminQueue
            draftsCount={drafts.length}
            openProgramsCount={openPrograms.length}
            partnerSubmissionCount={submissions.length}
            upcomingProgramsCount={upcomingPrograms.length}
          />
          <RecentPrograms programs={recentPrograms} />
        </div>
        <AdminMiniCalendar programs={programs} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ProgramDraftForm onSubmit={createDraft} />
        <AdminLinks />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminList
          empty="아직 파트너 제출이 없습니다."
          items={submissions}
          title="파트너 제출"
        />
        <AdminList
          empty="아직 저장한 초안이 없습니다."
          items={drafts}
          title="프로그램 초안"
        />
      </section>

      <section className="mt-6">
        <AnnouncementSourceMonitor />
      </section>

      <section className="mt-6">
        <ProgramLeadQueue onCreateDraft={createDraftFromLead} />
      </section>
    </div>
  );
}

function AdminQueue({
  openProgramsCount,
  upcomingProgramsCount,
  partnerSubmissionCount,
  draftsCount,
}: {
  openProgramsCount: number;
  upcomingProgramsCount: number;
  partnerSubmissionCount: number;
  draftsCount: number;
}) {
  const queueItems = [
    {
      href: "/host/programs",
      label: "모집중 프로그램",
      value: `${openProgramsCount}개`,
      helper: "공개 화면 노출과 신청 링크를 확인합니다.",
      icon: CheckCircle2,
    },
    {
      href: "/host/programs",
      label: "모집 예정",
      value: `${upcomingProgramsCount}개`,
      helper: "오픈 전 문구와 접수 기간을 검수합니다.",
      icon: CalendarDays,
    },
    {
      href: "/partners/apply",
      label: "파트너 접수",
      value: `${partnerSubmissionCount}건`,
      helper: "새 운영사 신청이 들어오면 초안으로 전환합니다.",
      icon: Users,
    },
    {
      href: "/host/programs",
      label: "저장된 초안",
      value: `${draftsCount}건`,
      helper: "외부 공고 승인 후 생성된 프로그램 후보입니다.",
      icon: FileText,
    },
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">운영 큐</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            레거시 대시보드의 오늘 할 일 영역을 누비오 검수 흐름에 맞췄습니다.
          </p>
        </div>
        <BarChart3 className="text-[var(--primary)]" size={22} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {queueItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-md bg-slate-50 p-4 hover:bg-teal-50"
              href={item.href}
              key={item.label}
            >
              <span className="grid size-10 place-items-center rounded-md bg-white text-[var(--primary)] ring-1 ring-slate-200">
                <Icon size={19} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-slate-950">
                    {item.label}
                  </span>
                  <span className="font-mono text-lg font-black text-slate-950">
                    {item.value}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {item.helper}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RecentPrograms({ programs }: { programs: Program[] }) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">최근 프로그램</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            공개 화면과 호스트 스튜디오에서 함께 확인할 주요 프로그램입니다.
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          href="/host/programs"
        >
          프로그램 관리
          <ArrowRight size={15} />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-black text-slate-500">
              <th className="px-5 py-3">프로그램</th>
              <th className="px-5 py-3">지역</th>
              <th className="px-5 py-3">상태</th>
              <th className="px-5 py-3">신청자</th>
              <th className="px-5 py-3 text-right">공개 화면</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((program) => (
              <tr
                className="border-b border-slate-100 align-top last:border-0"
                key={program.id}
              >
                <td className="px-5 py-4">
                  <p className="font-black text-slate-950">{program.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">
                    {program.summary}
                  </p>
                </td>
                <td className="px-5 py-4 font-bold text-slate-700">
                  {program.region} · {program.city}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-black ring-1 ${
                      programStatusTone[program.status]
                    }`}
                  >
                    {statusLabels[program.status]}
                  </span>
                </td>
                <td className="px-5 py-4 font-mono text-sm font-black text-slate-950">
                  {program.applicants.toLocaleString("ko-KR")}명
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    href={`/programs/${program.id}`}
                  >
                    보기
                    <ArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminMiniCalendar({ programs }: { programs: Program[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const firstDayOfWeek = firstDay.getDay();
  const calendarDays: Array<{
    date: number;
    currentMonth: boolean;
    today: boolean;
  }> = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let index = firstDayOfWeek - 1; index >= 0; index -= 1) {
    calendarDays.push({
      date: prevMonthLastDay - index,
      currentMonth: false,
      today: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push({
      date: day,
      currentMonth: true,
      today: day === today.getDate(),
    });
  }

  while (calendarDays.length < 42) {
    calendarDays.push({
      date: calendarDays.length - daysInMonth - firstDayOfWeek + 1,
      currentMonth: false,
      today: false,
    });
  }

  function programsForDay(day: number) {
    const target = new Date(year, month, day);

    return programs
      .filter((program) => {
        const recruitStart = new Date(program.recruitStart);
        const recruitEnd = new Date(program.recruitEnd);
        const activityStart = new Date(program.activityStart);
        const activityEnd = new Date(program.activityEnd);

        return (
          (target >= recruitStart && target <= recruitEnd) ||
          (target >= activityStart && target <= activityEnd)
        );
      })
      .slice(0, 2);
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <CalendarDays className="text-[var(--primary)]" size={20} />
            운영 캘린더
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            모집 기간과 활동 기간을 작게 표시합니다.
          </p>
        </div>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
          {year}년 {month + 1}월
        </p>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-black text-slate-400">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <span className="py-1" key={day}>
            {day}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const dayPrograms = day.currentMonth ? programsForDay(day.date) : [];

          return (
            <div
              className={`h-14 rounded-md border p-1 text-xs ${
                day.currentMonth
                  ? "border-slate-100 bg-white text-slate-700"
                  : "border-transparent bg-slate-50 text-slate-300"
              } ${day.today ? "ring-2 ring-[var(--primary)]" : ""}`}
              key={`${day.date}-${index}`}
            >
              <span className="font-black">{day.date}</span>
              <div className="mt-1 grid gap-0.5">
                {dayPrograms.map((program) => (
                  <span
                    className="h-1.5 rounded-full bg-[var(--primary)]"
                    key={program.id}
                    title={program.title}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-2 text-xs font-bold text-slate-500">
        <p className="rounded-md bg-slate-50 px-3 py-2">
          점 표시는 해당 날짜에 모집 또는 활동 기간이 걸친 프로그램입니다.
        </p>
      </div>
    </section>
  );
}

function ProgramDraftForm({
  onSubmit,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <Plus className="text-[var(--primary)]" size={20} />
        프로그램 초안 등록
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        외부 공고나 파트너 접수를 검수한 뒤, 운영자가 빠르게 초안을 남깁니다.
      </p>
      <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
        <input
          className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:border-[var(--primary)]"
          name="title"
          placeholder="프로그램명"
          required
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:border-[var(--primary)]"
            name="region"
            placeholder="지역"
            required
          />
          <input
            className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:border-[var(--primary)]"
            name="subsidy"
            placeholder="지원금/혜택"
            required
          />
        </div>
        <textarea
          className="min-h-28 rounded-md border border-slate-200 p-3 font-semibold outline-none focus:border-[var(--primary)]"
          name="summary"
          placeholder="요약"
          required
        />
        <button
          className="h-11 rounded-md bg-[var(--primary)] text-sm font-black text-white hover:bg-[var(--primary-strong)]"
          type="submit"
        >
          초안 저장
        </button>
      </form>
    </section>
  );
}

function AdminLinks() {
  const links = [
    ["/", "공개 프로그램 목록"],
    ["/reviews", "후기 게시판"],
    ["/announcements", "실시간 공고"],
    ["/partners/apply", "파트너 등록 폼"],
    ["/host", "호스트 운영 콘솔"],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black text-slate-950">운영 링크</h2>
      <p className="mt-1 text-sm font-bold text-slate-500">
        검수 중 자주 확인하는 공개/운영 화면입니다.
      </p>
      <div className="mt-4 grid gap-2">
        {links.map(([href, label]) => (
          <Link
            className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-700 hover:bg-teal-50 hover:text-[var(--primary)]"
            href={href}
            key={href}
          >
            {label}
            <ArrowRight size={15} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function AdminList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Submission[];
  empty: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div
              className="rounded-md bg-slate-50 p-3 text-sm"
              key={`${item.title ?? item.programTitle ?? index}`}
            >
              <p className="font-black text-slate-950">
                {item.title ?? item.programTitle ?? item.organization ?? "제목 없음"}
              </p>
              <p className="mt-1 line-clamp-2 text-slate-600">
                {item.summary ?? item.description ?? item.region ?? "내용 없음"}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}

function readStorageArray(key: string): Submission[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as Submission[];
  } catch {
    return [];
  }
}
