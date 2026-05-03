"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Megaphone,
  MessageSquareText,
  Plus,
  Shield,
} from "lucide-react";
import { announcements, programs, reviews } from "@/lib/data";

type Submission = Record<string, string>;

export function AdminDashboard() {
  const [submissions] = useState<Submission[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(
      window.localStorage.getItem("nuvio:partner-submissions") ?? "[]",
    ) as Submission[];
  });
  const [drafts, setDrafts] = useState<Submission[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(
      window.localStorage.getItem("nuvio:admin-program-drafts") ?? "[]",
    ) as Submission[];
  });

  function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft = Object.fromEntries(form.entries()) as Submission;
    const next = [{ ...draft, createdAt: new Date().toISOString() }, ...drafts];
    setDrafts(next);
    window.localStorage.setItem("nuvio:admin-program-drafts", JSON.stringify(next));
    event.currentTarget.reset();
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <section className="rounded-md border border-slate-200 bg-slate-950 p-5 text-white">
        <p className="inline-flex items-center gap-2 text-sm font-black text-teal-200">
          <Shield size={18} />
          운영자 콘솔
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">프로그램과 커뮤니티를 관리합니다.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          MVP에서는 서버 DB 대신 시드 데이터와 브라우저 임시 제출 데이터를 보여줍니다.
          다음 단계에서 이 화면을 실제 DB CRUD와 승인 워크플로우에 연결합니다.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <Metric icon={ClipboardList} label="프로그램" value={programs.length} />
        <Metric icon={MessageSquareText} label="후기" value={reviews.length} />
        <Metric icon={Megaphone} label="공지" value={announcements.length} />
        <Metric icon={BarChart3} label="파트너 접수" value={submissions.length} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <Plus className="text-[var(--primary)]" size={20} />
            프로그램 초안 등록
          </h2>
          <form className="mt-5 grid gap-3" onSubmit={createDraft}>
            <input
              className="h-11 rounded-md border border-slate-200 px-3 font-semibold"
              name="title"
              placeholder="프로그램명"
              required
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="h-11 rounded-md border border-slate-200 px-3 font-semibold"
                name="region"
                placeholder="지역"
                required
              />
              <input
                className="h-11 rounded-md border border-slate-200 px-3 font-semibold"
                name="subsidy"
                placeholder="지원금/혜택"
                required
              />
            </div>
            <textarea
              className="min-h-28 rounded-md border border-slate-200 p-3 font-semibold"
              name="summary"
              placeholder="요약"
              required
            />
            <button className="h-11 rounded-md bg-[var(--primary)] text-sm font-black text-white" type="submit">
              초안 저장
            </button>
          </form>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black text-slate-950">운영 링크</h2>
          <div className="mt-4 grid gap-2">
            {[
              ["/", "공개 프로그램 목록"],
              ["/reviews", "후기 게시판"],
              ["/announcements", "실시간 공지"],
              ["/partners/apply", "파트너 등록 폼"],
            ].map(([href, label]) => (
              <Link
                className="rounded-md bg-[var(--surface-muted)] p-3 text-sm font-bold text-slate-700 hover:text-[var(--primary)]"
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminList title="파트너 제출" empty="아직 파트너 제출이 없습니다." items={submissions} />
        <AdminList title="프로그램 초안" empty="아직 저장한 초안이 없습니다." items={drafts} />
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <Icon className="text-[var(--primary)]" size={20} />
      <div className="mt-3 font-mono text-3xl font-black text-slate-950">{value}</div>
      <div className="text-sm font-bold text-slate-500">{label}</div>
    </div>
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
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div className="rounded-md bg-[var(--surface-muted)] p-3 text-sm" key={`${item.title ?? item.programTitle ?? index}`}>
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
