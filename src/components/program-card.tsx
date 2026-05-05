import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ExternalLink,
  FileText,
  MapPin,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { formatDate, formatWon, getDday } from "@/lib/format";
import type { Program } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function ProgramCard({ program }: { program: Program }) {
  if (program.dataSource === "external") {
    return <ExternalProgramCard program={program} />;
  }

  return (
    <article className="grid overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md sm:grid-cols-[180px_minmax(0,1fr)]">
      <Link
        aria-label={`${program.title} 상세 보기`}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100 sm:aspect-auto"
        href={`/programs/${program.id}`}
      >
        <Image
          alt={program.title}
          className="object-cover transition duration-300 hover:scale-105"
          fill
          sizes="(max-width: 640px) 100vw, 180px"
          src={program.image}
        />
      </Link>
      <div className="flex min-w-0 flex-col justify-between gap-4 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge program={program} />
            <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
              {getDday(program.recruitEnd, program.status)}
            </span>
          </div>
          <Link href={`/programs/${program.id}`}>
            <h3 className="mt-3 line-clamp-2 text-lg font-black leading-7 text-slate-950 hover:text-[var(--primary)]">
              {program.title}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {program.summary}
          </p>
        </div>

        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <Meta icon={<MapPin size={16} />} value={`${program.region} ${program.city}`} />
          <Meta icon={<CalendarDays size={16} />} value={`~${formatDate(program.recruitEnd)}`} />
          <Meta
            icon={<WalletCards size={16} />}
            strong
            value={
              program.subsidyAmount > 0
                ? formatWon(program.subsidyAmount)
                : program.subsidyLabel
            }
          />
          <Meta icon={<FileText size={16} />} value={program.sourceName} />
        </div>
      </div>
    </article>
  );
}

function ExternalProgramCard({ program }: { program: Program }) {
  return (
    <article className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md md:grid-cols-[180px_minmax(0,1fr)_auto]">
      <div className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-4">
        <p className="text-xs font-black text-slate-500">수집 공고</p>
        <p className="mt-2 text-sm font-black text-slate-950">{program.sourceName}</p>
        <p className="mt-3 text-xs font-bold text-slate-500">
          공고일 {program.sourcePublishedAt ? formatDate(program.sourcePublishedAt) : "원문 확인"}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge program={program} />
          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
            실제 공고 기반
          </span>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
            {program.region}
          </span>
        </div>
        <Link href={`/programs/${program.id}`}>
          <h3 className="mt-3 line-clamp-2 text-lg font-black leading-7 text-slate-950 hover:text-[var(--primary)]">
            {program.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
          {program.summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {program.hashtags.slice(0, 5).map((tag) => (
            <span
              className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs font-bold text-slate-600"
              key={tag}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-end md:items-center">
        <a
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white hover:bg-slate-800"
          href={program.sourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          원문
          <ExternalLink size={16} />
        </a>
      </div>
    </article>
  );
}

function Meta({
  icon,
  value,
  strong = false,
}: {
  icon: React.ReactNode;
  value: string;
  strong?: boolean;
}) {
  return (
    <span
      className={`flex min-w-0 items-center gap-1.5 ${
        strong ? "font-bold text-slate-800" : ""
      }`}
    >
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

export function SourceNotice() {
  return (
    <p className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-100">
      <ShieldCheck size={15} />
      외부 공고는 공식 원문 확인 전까지 후보 데이터로 표시됩니다.
    </p>
  );
}
