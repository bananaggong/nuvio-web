import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FileText,
  MapPin,
  Ticket,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { VillageSiteFooter, VillageSiteHeader } from "@/components/village-site-chrome";
import { formatDate, formatRange, formatWon, getDday } from "@/lib/format";
import { canonicalVillagePath } from "@/lib/village-routing";
import type { Program } from "@/lib/types";
import type { Village } from "@/lib/village-types";

export function VillageProgramPage({
  village,
  program,
}: {
  village: Village;
  program: Program;
}) {
  return (
    <div className="bg-white">
      <VillageSiteHeader primaryProgram={program} variant="light" village={village} />
      <section className="border-b border-slate-200 bg-[var(--background)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="order-2 min-w-0 lg:order-1">
            <Link
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              href={canonicalVillagePath(village.slug)}
            >
              <ArrowLeft size={16} />
              {village.name}
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <StatusBadge program={program} />
              <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
                {getDday(program.recruitEnd, program.status)}
              </span>
              <span
                className="rounded-md px-2.5 py-1 text-xs font-black text-white"
                style={{ backgroundColor: village.brandColor }}
              >
                {village.city}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
              {program.title}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-650">
              {program.description}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoLine icon={<MapPin size={18} />} label="마을" value={`${village.name} · ${program.region} ${program.city}`} />
              <InfoLine icon={<CalendarDays size={18} />} label="활동 기간" value={formatRange(program.activityStart, program.activityEnd)} />
              <InfoLine icon={<UsersRound size={18} />} label="모집 대상" value={program.target} />
              <InfoLine icon={<WalletCards size={18} />} label="지원 혜택" value={program.subsidyLabel} />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-200 shadow-sm">
              <Image
                alt={program.title}
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 420px"
                src={program.image}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-black text-slate-950">신청 정보</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailRow label="모집 기간" value={`${formatDate(program.recruitStart)} - ${formatDate(program.recruitEnd)}`} />
              <DetailRow label="선정 발표" value={program.announcement} />
              <DetailRow label="모집 인원" value={program.capacity} />
              <DetailRow label="참가비" value={program.fee} />
              <DetailRow label="지원자" value={`${program.applicants.toLocaleString("ko-KR")}명`} />
              <DetailRow label="지원금 예산" value={formatWon(program.subsidyAmount)} />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-black text-slate-950">상세 안내</h2>
            <div className="mt-4 space-y-4 rounded-md border border-slate-200 bg-white p-5 text-base leading-8 text-slate-700">
              {program.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className="text-sm font-bold text-slate-500">
                출처: {program.sourceName}. 세부 조건은 공식 모집 공고를 기준으로 확인해 주세요.
              </p>
            </div>
          </section>

          <section className="mt-8 grid gap-3 sm:grid-cols-3">
            {program.gallery.slice(0, 3).map((src, index) => (
              <div
                className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100"
                key={src}
              >
                <Image
                  alt={`${program.title} 이미지 ${index + 1}`}
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  src={src}
                />
              </div>
            ))}
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-slate-950">
              {village.name} 신청
            </h2>
            <div className="mt-4 grid gap-2">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-black text-white hover:opacity-90"
                href={`/programs/${program.id}/apply`}
                style={{ backgroundColor: village.brandColor }}
              >
                <Ticket size={18} />
                신청하기
              </Link>
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                href={program.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                <FileText size={18} />
                모집 공고
              </a>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-4">
            <h2 className="text-base font-black text-slate-950">마을 홈</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{village.summary}</p>
            <Link
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-black text-slate-700 hover:text-[var(--primary)]"
              href={canonicalVillagePath(village.slug)}
            >
              마을 페이지 보기
              <ExternalLink size={16} />
            </Link>
          </section>
        </aside>
      </div>
      <VillageSiteFooter primaryProgram={program} village={village} />
    </div>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="mt-0.5 text-[var(--primary)]">{icon}</div>
      <div>
        <div className="text-xs font-black text-slate-400">{label}</div>
        <div className="mt-1 text-sm font-bold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-black text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-800">{value}</dd>
    </div>
  );
}
