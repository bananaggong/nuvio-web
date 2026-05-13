import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  FileText,
  MapPin,
  Phone,
  ShieldCheck,
  Ticket,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { JsonLdScript } from "@/components/json-ld";
import { ProgramActions } from "@/components/program-actions";
import { StatusBadge } from "@/components/status-badge";
import { programs } from "@/lib/data";
import { formatDate, formatRange, formatWon, getDday } from "@/lib/format";
import {
  getPublicProgramByIdentifier,
  listPublicPrograms,
} from "@/lib/public-program-db";
import { programPath } from "@/lib/program-routing";
import {
  breadcrumbJsonLd,
  createSeoMetadata,
  programJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function generateStaticParams() {
  return programs.map((program) => ({ id: String(program.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const program = await getPublicProgramByIdentifier(id);
  if (!program) return {};

  return createSeoMetadata({
    title: program.title,
    description: program.summary,
    image: program.image,
    keywords: [
      program.region,
      program.city,
      program.theme,
      ...program.hashtags,
      ...program.badges,
    ],
    path: programPath(program),
  });
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await getPublicProgramByIdentifier(id);

  if (!program) notFound();

  const publicPrograms = await listPublicPrograms();
  const relatedPrograms = publicPrograms
    .filter(
      (item) =>
        item.id !== program.id &&
        (item.region === program.region || item.categories.includes(program.theme)),
    )
    .slice(0, 4);
  const isExternal = program.dataSource === "external";
  const canonicalPath = programPath(program);

  return (
    <div className="bg-white">
      <JsonLdScript
        data={[
          programJsonLd(program, canonicalPath),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: "프로그램", path: "/" },
            { name: program.title, path: canonicalPath },
          ]),
        ]}
      />
      <section className="border-b border-[var(--line)] bg-[var(--background)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge program={program} />
              <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
                {isExternal ? "공식 원문 확인" : getDday(program.recruitEnd, program.status)}
              </span>
              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                {program.sourceName}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
              {program.title}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-650">
              {program.description}
            </p>
            {isExternal ? (
              <p className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-800">
                이 항목은 공식 RSS/공고 소스에서 자동 수집한 후보입니다. 모집 기간,
                신청 자격, 지원 금액은 원문에서 최종 확인해야 합니다.
              </p>
            ) : null}
          </div>

          <aside className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            {isExternal ? (
              <div className="rounded-md bg-[var(--surface-muted)] p-4">
                <p className="text-xs font-black text-slate-500">데이터 출처</p>
                <p className="mt-2 text-lg font-black text-slate-950">
                  {program.sourceName}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  공고일{" "}
                  {program.sourcePublishedAt
                    ? formatDate(program.sourcePublishedAt)
                    : "원문 확인"}
                </p>
              </div>
            ) : (
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
                <Image
                  alt={program.title}
                  className="object-cover"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 380px"
                  src={program.image}
                />
              </div>
            )}
            <div className="mt-4 grid gap-2">
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white hover:bg-[var(--primary-strong)]"
                href={isExternal ? program.sourceUrl : `${canonicalPath}/apply`}
                rel={isExternal ? "noreferrer" : undefined}
                target={isExternal ? "_blank" : undefined}
              >
                <Ticket size={18} />
                {isExternal ? "원문에서 확인" : "신청하기"}
              </a>
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
          </aside>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <ProgramActions programId={program.id} title={program.title} />

          <section className="mt-8 grid gap-3 rounded-md border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <DetailRow
              label={isExternal ? "공고일" : "모집 기간"}
              value={
                isExternal
                  ? formatDate(program.recruitStart)
                  : `${formatDate(program.recruitStart)} - ${formatDate(program.recruitEnd)}`
              }
            />
            <DetailRow label="활동 기간" value={formatRange(program.activityStart, program.activityEnd)} />
            <DetailRow label="지역" value={`${program.region} ${program.city}`} />
            <DetailRow label="대상" value={program.target} />
            <DetailRow label="인원" value={program.capacity} />
            <DetailRow label="혜택" value={program.subsidyAmount > 0 ? formatWon(program.subsidyAmount) : program.subsidyLabel} />
            <DetailRow label="참가비" value={program.fee} />
            <DetailRow label="문의" value={program.phone} />
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-black text-slate-950">상세 안내</h2>
            <div className="mt-4 space-y-4 rounded-md border border-slate-200 bg-white p-5 text-base leading-8 text-slate-700">
              {program.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className="text-sm font-bold text-slate-500">
                출처: {program.sourceName}. NUVIO는 수집/정리된 정보를 제공하며,
                최종 조건은 공식 공고를 기준으로 확인해야 합니다.
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-black text-slate-950">분류 태그</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {program.badges.map((badge) => (
                <span
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-[var(--surface-muted)] px-3 py-2 text-sm font-bold text-slate-700"
                  key={badge}
                >
                  <ShieldCheck size={16} />
                  {badge}
                </span>
              ))}
            </div>
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-4">
            <h2 className="text-base font-black text-slate-950">비슷한 공고</h2>
            <div className="mt-3 space-y-3">
              {relatedPrograms.map((item) => (
                <Link
                  className="block rounded-md bg-white p-3 text-sm font-bold text-slate-800 hover:text-[var(--primary)]"
                  href={programPath(item)}
                  key={item.id}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-base font-black text-slate-950">핵심 정보</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              <InfoLine icon={<MapPin size={16} />} value={`${program.region} ${program.city}`} />
              <InfoLine icon={<CalendarDays size={16} />} value={formatDate(program.recruitStart)} />
              <InfoLine icon={<UsersRound size={16} />} value={program.capacity} />
              <InfoLine icon={<WalletCards size={16} />} value={program.subsidyLabel} />
              <InfoLine icon={<Phone size={16} />} value={program.phone} />
            </div>
          </section>

          <Link
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            href="/"
          >
            <ExternalLink size={17} />
            목록으로
          </Link>
        </aside>
      </div>
    </div>
  );
}

function InfoLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2 font-bold">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="truncate">{value}</span>
    </p>
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
