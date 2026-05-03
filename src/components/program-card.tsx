import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, UsersRound, WalletCards } from "lucide-react";
import { formatDate, formatWon, getDday } from "@/lib/format";
import type { Program } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function ProgramCard({ program }: { program: Program }) {
  return (
    <article className="group grid overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md sm:grid-cols-[180px_1fr]">
      <Link
        aria-label={`${program.title} 상세 보기`}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100 sm:aspect-auto"
        href={`/programs/${program.id}`}
      >
        <Image
          alt={program.title}
          className="object-cover transition duration-300 group-hover:scale-105"
          fill
          sizes="(max-width: 640px) 100vw, 180px"
          src={program.image}
        />
      </Link>
      <div className="flex min-w-0 flex-col justify-between gap-4 p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/programs/${program.id}`}>
                <h3 className="line-clamp-2 text-base font-black leading-6 text-slate-950 group-hover:text-[var(--primary-strong)]">
                  {program.title}
                </h3>
              </Link>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                {program.summary}
              </p>
            </div>
            <StatusBadge program={program} />
          </div>

          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <span className="flex items-center gap-1.5">
              <MapPin size={16} />
              {program.region} {program.city}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays size={16} />~{formatDate(program.recruitEnd)}
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <WalletCards size={16} />
              {program.subsidyAmount > 0
                ? `${formatWon(program.subsidyAmount)} 지원`
                : program.subsidyLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <UsersRound size={16} />
              지원자 {program.applicants.toLocaleString("ko-KR")}명
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {program.hashtags.slice(0, 3).map((tag) => (
              <span
                className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs font-bold text-slate-600"
                key={tag}
              >
                #{tag}
              </span>
            ))}
          </div>
          <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
            {getDday(program.recruitEnd, program.status)}
          </span>
        </div>
      </div>
    </article>
  );
}
