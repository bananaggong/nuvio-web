import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Baby,
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
import { ProgramActions } from "@/components/program-actions";
import { StatusBadge } from "@/components/status-badge";
import { announcements, getProgramById, programs, reviews } from "@/lib/data";
import { formatDate, formatRange, formatWon, getDday } from "@/lib/format";

export function generateStaticParams() {
  return programs.map((program) => ({ id: String(program.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const program = getProgramById(Number(id));
  if (!program) return {};

  return {
    title: `${program.title} 여행지원금`,
    description: program.summary,
    openGraph: {
      title: program.title,
      description: program.summary,
      images: [{ url: program.image }],
    },
  };
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = getProgramById(Number(id));

  if (!program) notFound();

  const relatedPrograms = programs
    .filter(
      (item) =>
        item.id !== program.id &&
        (item.region === program.region || item.categories.includes(program.theme)),
    )
    .slice(0, 3);
  const relatedReviews = reviews.filter((review) => review.programId === program.id);
  const relatedAnnouncements = announcements.filter(
    (announcement) => announcement.programId === program.id,
  );

  return (
    <div className="bg-white">
      <section className="border-b border-[var(--line)] bg-[var(--background)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:px-8 lg:grid-cols-[1fr_420px]">
          <div className="order-2 lg:order-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge program={program} />
              <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
                {getDday(program.recruitEnd, program.status)}
              </span>
              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                #{program.hashtags[0]}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
              {program.title}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-650">
              {program.description}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoLine icon={<MapPin size={18} />} label="지역" value={`${program.region} ${program.city}`} />
              <InfoLine icon={<CalendarDays size={18} />} label="활동기간" value={formatRange(program.activityStart, program.activityEnd)} />
              <InfoLine icon={<UsersRound size={18} />} label="모집대상" value={program.target} />
              <InfoLine icon={<WalletCards size={18} />} label="최대혜택" value={program.subsidyLabel} />
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
            <div className="mt-3 grid grid-cols-3 gap-2">
              {program.gallery.slice(0, 3).map((src, index) => (
                <div
                  className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100"
                  key={src}
                >
                  <Image
                    alt={`${program.title} 이미지 ${index + 1}`}
                    className="object-cover"
                    fill
                    sizes="140px"
                    src={src}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:px-8 lg:grid-cols-[1fr_340px]">
        <article className="min-w-0">
          <ProgramActions programId={program.id} title={program.title} />

          <div className="mt-8 grid gap-3 rounded-md border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <DetailRow label="모집기간" value={`${formatDate(program.recruitStart)} - ${formatDate(program.recruitEnd)}`} />
            <DetailRow label="선정발표" value={program.announcement} />
            <DetailRow label="모집인원" value={program.capacity} />
            <DetailRow label="참가비" value={program.fee} />
            <DetailRow label="지원자" value={`${program.applicants.toLocaleString("ko-KR")}명`} />
            <DetailRow label="지원금 환산" value={formatWon(program.subsidyAmount)} />
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-black text-slate-950">프로그램 속성</h2>
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
              {program.categories.includes("family") ? (
                <span className="inline-flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">
                  <Baby size={16} />
                  아이 동반 추천
                </span>
              ) : null}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-black text-slate-950">상세 안내</h2>
            <div className="mt-4 space-y-4 rounded-md border border-slate-200 bg-white p-5 text-base leading-8 text-slate-700">
              {program.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className="text-sm font-bold text-slate-500">
                출처: {program.sourceName}. NUVIO는 정부기관을 대표하지 않으며,
                신청 전 공식 공고의 세부 조건을 반드시 확인해 주세요.
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-black text-slate-950">연결된 소식</h2>
            <div className="mt-3 grid gap-3">
              {relatedAnnouncements.length > 0 ? (
                relatedAnnouncements.map((announcement) => (
                  <Link
                    className="rounded-md border border-slate-200 bg-white p-4 hover:border-[var(--primary)]"
                    href={`/announcements/${announcement.id}`}
                    key={announcement.id}
                  >
                    <p className="text-sm font-black text-[var(--primary)]">공지</p>
                    <p className="mt-1 font-bold text-slate-900">{announcement.title}</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  아직 연결된 공지가 없습니다.
                </p>
              )}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-black text-slate-950">후기/팁</h2>
            <div className="mt-3 grid gap-3">
              {relatedReviews.length > 0 ? (
                relatedReviews.map((review) => (
                  <Link
                    className="rounded-md border border-slate-200 bg-white p-4 hover:border-[var(--primary)]"
                    href={`/reviews/${review.id}`}
                    key={review.id}
                  >
                    <p className="text-sm font-black text-[var(--accent)]">{review.author}</p>
                    <p className="mt-1 font-bold text-slate-900">{review.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {review.excerpt}
                    </p>
                  </Link>
                ))
              ) : (
                <Link
                  className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm font-bold text-slate-600 hover:border-[var(--primary)]"
                  href="/reviews"
                >
                  첫 후기를 남겨보세요.
                </Link>
              )}
            </div>
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-black text-slate-950">신청 액션</h2>
            <div className="mt-4 grid gap-2">
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white hover:bg-[var(--primary-strong)]"
                href={`/programs/${program.id}/apply`}
              >
                <Ticket size={18} />
                신청하기
              </a>
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                href={program.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                <FileText size={18} />
                모집공고
              </a>
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                href={`tel:${program.phone}`}
              >
                <Phone size={18} />
                전화문의
              </a>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              외부 신청 페이지로 이동합니다. 신청 전 개인정보 처리, 환급 조건,
              마감 시간을 확인하세요.
            </p>
          </div>

          <div className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-4">
            <h2 className="text-base font-black text-slate-950">비슷한 프로그램</h2>
            <div className="mt-3 space-y-3">
              {relatedPrograms.map((item) => (
                <Link
                  className="block rounded-md bg-white p-3 text-sm font-bold text-slate-800 hover:text-[var(--primary)]"
                  href={`/programs/${item.id}`}
                  key={item.id}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>

          <Link
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            href="/"
          >
            <ExternalLink size={17} />
            전체 프로그램 보기
          </Link>
        </aside>
      </div>
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
