import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Quote } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { VillageSiteFooter, VillageSiteHeader } from "@/components/village-site-chrome";
import { formatDate, getDday } from "@/lib/format";
import { villagePath, villageProgramPath } from "@/lib/village-routing";
import {
  buildVillageNotices,
  sectionTypeLabels,
} from "@/lib/village-template";
import type { Program, Review } from "@/lib/types";
import type { Village, VillageSection } from "@/lib/village-types";

export function VillageProgramsIndexPage({
  programs,
  village,
}: {
  programs: Program[];
  village: Village;
}) {
  const primaryProgram = programs[0];

  return (
    <VillagePageFrame
      eyebrow="Programs"
      primaryProgram={primaryProgram}
      subtitle={`${village.name}에서 운영하는 모집, 체류, 체험 프로그램만 모았습니다.`}
      title="프로그램"
      village={village}
    >
      {programs.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <ProgramListCard
              key={`${program.id}-${program.slug}`}
              program={program}
              village={village}
            />
          ))}
        </div>
      ) : (
        <EmptyBlock text="아직 공개된 프로그램이 없습니다." village={village} />
      )}
    </VillagePageFrame>
  );
}

export function VillageReviewsIndexPage({
  programs,
  reviews,
  village,
}: {
  programs: Program[];
  reviews: Review[];
  village: Village;
}) {
  return (
    <VillagePageFrame
      eyebrow="Reviews"
      primaryProgram={programs[0]}
      subtitle={`${village.name} 참여자들이 남긴 후기와 운영 기록을 모았습니다.`}
      title="참여 후기"
      village={village}
    >
      {reviews.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {reviews.map((review) => (
            <ReviewListCard key={review.id} review={review} village={village} />
          ))}
        </div>
      ) : (
        <EmptyBlock text="아직 공개된 참여 후기가 없습니다." village={village} />
      )}
    </VillagePageFrame>
  );
}

export function VillageAboutIndexPage({
  programs,
  village,
}: {
  programs: Program[];
  village: Village;
}) {
  return (
    <VillagePageFrame
      eyebrow="About"
      primaryProgram={programs[0]}
      subtitle={village.description}
      title={`${village.name} 둘러보기`}
      village={village}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {village.sections.map((section) => (
          <SectionCard key={section.id} section={section} village={village} />
        ))}
      </div>
    </VillagePageFrame>
  );
}

export function VillageNoticeIndexPage({
  programs,
  village,
}: {
  programs: Program[];
  village: Village;
}) {
  const notices = buildVillageNotices(village, programs);

  return (
    <VillagePageFrame
      eyebrow="Notice"
      primaryProgram={programs[0]}
      subtitle={`${village.name} 신청, 선정, 숙소, 후기 제출 관련 안내만 모았습니다.`}
      title="알림마당"
      village={village}
    >
      <div className="divide-y divide-[#dedbd1] border-y border-[#dedbd1]">
        {notices.map((notice) => (
          <Link
            className="grid gap-3 px-1 py-5 hover:bg-white md:grid-cols-[120px_minmax(0,1fr)_140px]"
            href={notice.href}
            key={`${notice.type}-${notice.title}`}
          >
            <span className="font-black" style={{ color: village.brandColor }}>
              [{notice.type}]
            </span>
            <span className="min-w-0 font-bold">{notice.title}</span>
            <span className="text-left text-sm text-slate-500 md:text-right">
              {formatDate(notice.date)}
            </span>
          </Link>
        ))}
      </div>
    </VillagePageFrame>
  );
}

export function VillageReviewDetailPage({
  programs,
  review,
  village,
}: {
  programs: Program[];
  review: Review;
  village: Village;
}) {
  return (
    <VillagePageFrame
      eyebrow="Review"
      primaryProgram={programs[0]}
      subtitle={`${village.name} 참여자가 남긴 활동 후기입니다.`}
      title={review.title}
      village={village}
    >
      <article className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border border-[#dfddd5] bg-white px-6 py-7 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-black text-white"
              style={{ backgroundColor: village.brandColor }}
            >
              <Quote size={14} />
              {review.badge ?? "후기"}
            </span>
            <span className="text-sm font-bold text-slate-500">
              {formatDate(review.date)}
            </span>
            <span className="text-sm font-bold text-slate-500">
              {review.author}
            </span>
          </div>
          <p className="mt-6 text-lg font-bold leading-9 text-slate-800">
            {review.excerpt}
          </p>
          <div className="mt-8 space-y-5 text-base leading-8 text-slate-700">
            {review.body.split("\n").filter(Boolean).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {review.images.length > 0 ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {review.images.slice(0, 4).map((src, index) => (
                <div className="relative aspect-[4/3] overflow-hidden bg-[#ece8dd]" key={src}>
                  <Image
                    alt={`${review.title} 이미지 ${index + 1}`}
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    src={src}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <aside className="space-y-3">
          <Link
            className="flex items-center justify-between border border-[#dfddd5] bg-white px-4 py-4 text-sm font-black hover:border-[#0f766e]"
            href={`${villagePath(village.slug)}/reviews`}
          >
            {village.name} 후기 목록
            <ArrowRight size={16} />
          </Link>
          <Link
            className="flex items-center justify-between border border-[#dfddd5] bg-white px-4 py-4 text-sm font-black hover:border-[#0f766e]"
            href={villagePath(village.slug)}
          >
            {village.name} 홈
            <ArrowRight size={16} />
          </Link>
        </aside>
      </article>
    </VillagePageFrame>
  );
}

function VillagePageFrame({
  children,
  eyebrow,
  primaryProgram,
  subtitle,
  title,
  village,
}: {
  children: React.ReactNode;
  eyebrow: string;
  primaryProgram?: Program;
  subtitle: string;
  title: string;
  village: Village;
}) {
  return (
    <div className="bg-[#f6f4ee] text-[#171717]">
      <VillageSiteHeader
        primaryProgram={primaryProgram}
        variant="dark"
        village={village}
      />
      <section className="border-b border-[#dfddd5] bg-white px-5 py-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase" style={{ color: village.brandColor }}>
            {eyebrow}
          </p>
          <h1 className="mt-3 font-serif text-4xl font-black leading-tight md:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            {subtitle}
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm font-black">
            <Link
              className="inline-flex items-center gap-2 border border-[#dedbd1] bg-[#f6f4ee] px-3 py-2 hover:bg-white"
              href={villagePath(village.slug)}
            >
              {village.name} 홈
              <ArrowRight size={15} />
            </Link>
            <Link
              className="inline-flex items-center gap-2 border border-[#dedbd1] bg-[#f6f4ee] px-3 py-2 hover:bg-white"
              href={`${villagePath(village.slug)}/programs`}
            >
              프로그램
            </Link>
            <Link
              className="inline-flex items-center gap-2 border border-[#dedbd1] bg-[#f6f4ee] px-3 py-2 hover:bg-white"
              href={`${villagePath(village.slug)}/reviews`}
            >
              참여 후기
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        {children}
      </section>
      <VillageSiteFooter primaryProgram={primaryProgram} village={village} />
    </div>
  );
}

function ProgramListCard({
  program,
  village,
}: {
  program: Program;
  village: Village;
}) {
  return (
    <article className="border border-[#ddd8ca] bg-white">
      <Link
        className="relative block aspect-[4/3] overflow-hidden bg-[#ece8dd]"
        href={villageProgramPath(village.slug, program.slug)}
      >
        <Image
          alt={program.title}
          className="object-cover transition duration-500 hover:scale-105"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          src={program.image}
        />
      </Link>
      <div className="px-5 py-6">
        <div className="flex flex-wrap gap-2">
          <StatusBadge program={program} />
          <span className="rounded-full bg-[#242421] px-3 py-1 text-xs font-black text-white">
            {getDday(program.recruitEnd, program.status)}
          </span>
        </div>
        <Link href={villageProgramPath(village.slug, program.slug)}>
          <h2 className="mt-4 line-clamp-2 text-2xl font-black leading-8 hover:text-[#0f766e]">
            {program.title}
          </h2>
        </Link>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {program.summary}
        </p>
        <div className="mt-5 grid gap-2 text-sm font-bold text-slate-700">
          <InfoLine icon={<MapPin size={16} />} text={`${program.region} ${program.city}`} />
          <InfoLine
            icon={<CalendarDays size={16} />}
            text={`${formatDate(program.activityStart)} - ${formatDate(program.activityEnd)}`}
          />
        </div>
      </div>
    </article>
  );
}

function ReviewListCard({
  review,
  village,
}: {
  review: Review;
  village: Village;
}) {
  return (
    <Link
      className="border border-[#dfddd5] bg-white px-6 py-6 hover:border-[#0f766e]"
      href={`${villagePath(village.slug)}/reviews/${review.id}`}
    >
      <div className="flex items-center justify-between gap-4">
        <span
          className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-black text-white"
          style={{ backgroundColor: village.brandColor }}
        >
          <Quote size={14} />
          {review.badge ?? "후기"}
        </span>
        <span className="text-sm text-slate-500">{formatDate(review.date)}</span>
      </div>
      <h2 className="mt-4 line-clamp-2 text-2xl font-black leading-8">
        {review.title}
      </h2>
      <p className="mt-3 line-clamp-4 text-sm leading-7 text-slate-600">
        {review.excerpt}
      </p>
      <p className="mt-5 text-sm font-black" style={{ color: village.brandColor }}>
        {review.author}
      </p>
    </Link>
  );
}

function SectionCard({
  section,
  village,
}: {
  section: VillageSection;
  village: Village;
}) {
  return (
    <article className="border border-[#dfddd5] bg-white px-6 py-6">
      <p className="text-xs font-black uppercase text-slate-500">
        {sectionTypeLabels[section.type]}
      </p>
      <h2 className="mt-3 font-serif text-3xl font-black">{section.title}</h2>
      <p className="mt-4 text-sm leading-7 text-slate-600">{section.body}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {section.items.map((item) => (
          <span
            className="border px-2.5 py-1 text-xs font-black"
            key={item}
            style={{ borderColor: village.accentColor, color: village.brandColor }}
          >
            {item}
          </span>
        ))}
      </div>
    </article>
  );
}

function EmptyBlock({ text, village }: { text: string; village: Village }) {
  return (
    <div className="border border-dashed border-[#cfc9b9] bg-white px-6 py-12 text-center">
      <p className="font-black">{text}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {village.name} 운영자가 게시하면 이 공간에 자동으로 모입니다.
      </p>
      <Link
        className="mt-5 inline-flex items-center gap-2 text-sm font-black"
        href={villagePath(village.slug)}
        style={{ color: village.brandColor }}
      >
        홈으로 돌아가기
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function InfoLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-2">
      <span className="text-[#0f766e]">{icon}</span>
      {text}
    </p>
  );
}
