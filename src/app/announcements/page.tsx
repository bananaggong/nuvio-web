import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, Clock, Megaphone } from "lucide-react";
import { announcements, getProgramById } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import type { AnnouncementType } from "@/lib/types";

export const metadata: Metadata = {
  title: "실시간 공지",
  description: "여행지원금 프로그램 변경, 조기마감, 오픈 소식을 확인하세요.",
};

const typeMeta: Record<AnnouncementType, { label: string; icon: typeof Megaphone; className: string }> = {
  close: {
    label: "조기마감",
    icon: AlertTriangle,
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
  change: {
    label: "변경",
    icon: Clock,
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  notice: {
    label: "공지",
    icon: Megaphone,
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  open: {
    label: "오픈",
    icon: CheckCircle2,
    className: "bg-teal-50 text-teal-700 ring-teal-200",
  },
};

export default function AnnouncementsPage() {
  return (
    <div>
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <BellRing size={18} />
            실시간 프로그램 정보
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
            조기마감과 변경사항을 놓치지 마세요.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            여행지원금 프로그램은 예산, 숙소, 운영 방식에 따라 일정이 바뀔 수
            있습니다. 중요한 변동은 공지로 빠르게 모아 보여드립니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-6 md:px-8">
        <div className="grid gap-3">
          {announcements.map((announcement) => {
            const meta = typeMeta[announcement.type];
            const Icon = meta.icon;
            const program = announcement.programId
              ? getProgramById(announcement.programId)
              : undefined;
            return (
              <Link
                className="block rounded-md border border-slate-200 bg-white p-4 shadow-sm hover:border-[var(--primary)]"
                href={`/announcements/${announcement.id}`}
                key={announcement.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-black ring-1 ${meta.className}`}
                    >
                      <Icon size={14} />
                      {meta.label}
                    </span>
                    <h2 className="mt-3 text-lg font-black leading-7 text-slate-950">
                      {announcement.title}
                    </h2>
                    {program ? (
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        연결 프로그램: {program.title}
                      </p>
                    ) : null}
                  </div>
                  <time className="min-w-fit text-xs font-bold text-slate-400">
                    {formatDateTime(announcement.date)}
                  </time>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
