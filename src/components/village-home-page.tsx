import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  PlayCircle,
  Plus,
  Quote,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { BoseongIntroSection } from "@/components/boseong-intro-section";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import {
  VillageSiteFooter,
  VillageSiteHeader,
} from "@/components/village-site-chrome";
import { BoseongFigmaHomePage } from "@/components/boseong-figma-site";
import { formatDate, getDday } from "@/lib/format";
import { villagePath, villageProgramPath } from "@/lib/village-routing";
import { buildVillageNotices, getVillageApplyLabel } from "@/lib/village-template";
import type { Program, Review, VillageMediaContent } from "@/lib/types";
import type { PublishedVillagePageSection } from "@/lib/village-page-cms";
import type { Village, VillageSection } from "@/lib/village-types";

const mediaCategoryLabels: Record<VillageMediaContent["category"], string> = {
  original: "자체 컨텐츠",
  broadcast: "방송출연",
  archive: "아카이브",
};

export function VillageHomePage({
  media = [],
  pageSections,
  programs,
  reviews,
  village,
}: {
  media?: VillageMediaContent[];
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  reviews: Review[];
  village: Village;
}) {
  const primaryProgram = programs[0];
  const homePath = villagePath(village.slug);
  const notices = buildVillageNotices(village, programs);
  const featuredPrograms = programs.slice(0, 3);
  const featuredMedia = media.slice(0, 3);
  const activitySections = village.sections.slice(0, 4);
  const isBoseong = village.slug === "boseong";
  const heroKicker = isBoseong
    ? "그린티모시레 · 보성청년마을"
    : `${village.region} ${village.city} 로컬 체류`;
  const metrics = isBoseong
    ? [
        { label: "숙재받", value: "8기" },
        { label: "로컬살롱", value: "4기" },
        { label: "참여 후기", value: `${reviews.length}건` },
        { label: "미디어", value: `${media.length}개` },
      ]
    : [
        { label: "체험활동", value: `${programs.length}개` },
        { label: "참여 후기", value: `${reviews.length}건` },
        { label: "미디어", value: `${media.length}개` },
        { label: "기록", value: `${village.sections.length}개` },
      ];

  if (isBoseong) {
    return (
      <BoseongFigmaHomePage
        media={media}
        pageSections={pageSections}
        programs={programs}
        reviews={reviews}
        village={village}
      />
    );
  }

  return (
    <div className="bg-[#f7f7f0] text-[#181a16]">
      <VillageSiteHeader
        primaryProgram={primaryProgram}
        variant="dark"
        village={village}
      />

      <section className="relative min-h-[520px] overflow-hidden bg-[#11130f] text-white">
        <Image
          alt={`${village.name} 보성 녹차밭`}
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src={village.heroImage}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/76 via-black/42 to-black/12" />
        <div className="relative mx-auto flex min-h-[520px] max-w-7xl flex-col justify-end px-5 pb-14 pt-28 md:px-8">
          <p className="text-sm font-black text-white/72">{heroKicker}</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-black leading-[1.02] md:text-7xl">
            {village.name}
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-white/86">
            {village.tagline}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 bg-white px-5 text-sm font-black text-[#11130f] hover:bg-[#6BAA50] hover:text-white"
              href={
                primaryProgram
                  ? villageProgramPath(village.slug, primaryProgram.slug)
                  : `${homePath}/programs`
              }
            >
              신청하기
              <ArrowRight size={16} />
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 border border-white/30 px-5 text-sm font-black text-white hover:bg-white/10"
              href={`${homePath}/media`}
            >
              미디어 보기
              <PlayCircle size={16} />
            </Link>
          </div>
        </div>
      </section>

      {isBoseong ? (
        <BoseongIntroSection />
      ) : (
        <section className="border-y border-[#252920] bg-[#11130f] px-5 py-6 text-white md:px-8">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-4">
            {metrics.map((metric) => (
              <Metric key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
        </section>
      )}

      <SectionShell
        actionHref={`${homePath}/programs`}
        actionLabel="더보기"
        title="체험활동"
      >
        {featuredPrograms.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">
            {featuredPrograms.map((program) => (
              <FeaturedProgramCard
                key={`${program.id}-${program.slug}`}
                program={program}
                village={village}
              />
            ))}
          </div>
        ) : (
          <EmptyBlock text="등록된 체험활동이 없습니다." village={village} />
        )}
      </SectionShell>

      <SectionShell
        actionHref={`${homePath}/media`}
        actionLabel="더보기"
        title="미디어"
        tone="white"
      >
        {featuredMedia.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">
            {featuredMedia.map((content) => (
              <MediaCard content={content} key={content.id} village={village} />
            ))}
          </div>
        ) : (
          <EmptyBlock text="등록된 미디어가 없습니다." village={village} />
        )}
      </SectionShell>

      <SectionShell
        actionHref={`${homePath}/reviews`}
        actionLabel="더보기"
        title="참여후기"
      >
        {reviews.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 3).map((review) => (
              <ReviewCard key={review.id} review={review} village={village} />
            ))}
          </div>
        ) : (
          <EmptyBlock text="등록된 참여후기가 없습니다." village={village} />
        )}
      </SectionShell>

      {!isBoseong ? (
        <SectionShell
          actionHref={`${homePath}/about`}
        actionLabel="전체 보기"
        title="전체차LAB 기록"
        tone="white"
      >
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {activitySections.map((section) => (
            <ActivityTile key={section.id} section={section} village={village} />
          ))}
        </div>
        </SectionShell>
      ) : null}

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:px-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="border-y border-[#d9d6c9]">
          <div className="grid gap-5 py-6 md:grid-cols-3">
            <GuideLine
              icon={<Clock3 size={18} />}
              label="운영"
              text="기수별 일정에 맞춰 OT, 체류, 활동, 후기 수집을 진행합니다."
            />
            <GuideLine
              icon={<CalendarDays size={18} />}
              label="신청"
              text={getVillageApplyLabel(village)}
            />
            <GuideLine
              icon={<MapPin size={18} />}
              label="장소"
              text={village.address ?? `${village.region} ${village.city}`}
            />
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">공지</h2>
            <Link
              className="inline-flex items-center gap-2 text-sm font-black"
              href={`${homePath}/notice`}
              style={{ color: village.brandColor }}
            >
              더보기
              <Plus size={16} />
            </Link>
          </div>
          <div className="divide-y divide-[#d9d6c9] border-y border-[#d9d6c9]">
            {notices.slice(0, 5).map((notice) => (
              <Link
                className="grid gap-2 py-4 text-sm hover:bg-white md:grid-cols-[minmax(0,1fr)_104px]"
                href={notice.href}
                key={`${notice.type}-${notice.title}`}
              >
                <span className="min-w-0 truncate font-bold">
                  [{notice.type}] {notice.title}
                </span>
                <span className="text-left text-slate-500 md:text-right">
                  {formatDate(notice.date)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <VillageSiteFooter primaryProgram={primaryProgram} village={village} />
    </div>
  );
}

function SectionShell({
  actionHref,
  actionLabel,
  children,
  title,
  tone = "cream",
}: {
  actionHref: string;
  actionLabel: string;
  children: React.ReactNode;
  title: string;
  tone?: "cream" | "white";
}) {
  return (
    <section
      className={
        tone === "white"
          ? "border-y border-[#d9d6c9] bg-white px-5 py-14 md:px-8"
          : "px-5 py-14 md:px-8"
      }
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex items-center justify-between gap-4">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            {title}
          </h2>
          <Link
            className="inline-flex items-center gap-2 text-sm font-black text-[#4E7C3A] hover:text-[#11130f]"
            href={actionHref}
          >
            {actionLabel}
            <Plus size={17} />
          </Link>
        </div>
        {children}
      </div>
    </section>
  );
}

function FeaturedProgramCard({
  program,
  village,
}: {
  program: Program;
  village: Village;
}) {
  return (
    <article className="border border-[#d9d6c9] bg-white">
      <Link
        className="relative block aspect-[16/10] overflow-hidden bg-[#e9e6d8]"
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
      <div className="px-5 py-5">
        <div className="flex flex-wrap gap-2">
          <StatusBadge program={program} />
          <span className="bg-[#11130f] px-3 py-1 text-xs font-black text-white">
            {getDday(program.recruitEnd, program.status)}
          </span>
        </div>
        <Link href={villageProgramPath(village.slug, program.slug)}>
          <h3 className="mt-4 line-clamp-2 text-xl font-black leading-7 hover:text-[#4E7C3A]">
            {program.title}
          </h3>
        </Link>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {program.summary}
        </p>
        <p className="mt-5 text-sm font-bold text-slate-500">
          {formatDate(program.activityStart)} - {formatDate(program.activityEnd)}
        </p>
      </div>
    </article>
  );
}

function MediaCard({
  content,
  village,
}: {
  content: VillageMediaContent;
  village: Village;
}) {
  return (
    <article className="border border-[#d9d6c9] bg-[#f7f7f0]">
      <Link
        className="relative block aspect-video overflow-hidden bg-[#11130f]"
        href={`${villagePath(village.slug)}/media/${content.id}`}
      >
        <Image
          alt={content.title}
          className="object-cover transition duration-500 hover:scale-105"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          src={content.thumbnail}
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 bg-black/76 px-2.5 py-1 text-xs font-black text-white">
          <PlayCircle size={14} />
          {mediaCategoryLabels[content.category]}
        </span>
      </Link>
      <div className="px-5 py-5">
        <p className="text-xs font-black text-slate-500">
          {formatDate(content.date)}
        </p>
        <Link href={`${villagePath(village.slug)}/media/${content.id}`}>
          <h3 className="mt-3 line-clamp-2 text-xl font-black leading-7 hover:text-[#4E7C3A]">
            {content.title}
          </h3>
        </Link>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
          {content.summary}
        </p>
      </div>
    </article>
  );
}

function ReviewCard({ review, village }: { review: Review; village: Village }) {
  return (
    <Link
      className="border border-[#d9d6c9] bg-white px-5 py-5 hover:border-[#4E7C3A]"
      href={`${villagePath(village.slug)}/reviews/${review.id}`}
    >
      <span
        className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-black text-white"
        style={{ backgroundColor: village.brandColor }}
      >
        <Quote size={14} />
        {review.badge ?? "후기"}
      </span>
      <h3 className="mt-4 line-clamp-2 text-xl font-black leading-7">
        {review.title}
      </h3>
      <p className="mt-3 line-clamp-4 text-sm leading-7 text-slate-600">
        {review.excerpt}
      </p>
      <p className="mt-5 text-sm font-black" style={{ color: village.brandColor }}>
        {review.author}
      </p>
    </Link>
  );
}

function ActivityTile({
  section,
  village,
}: {
  section: VillageSection;
  village: Village;
}) {
  return (
    <article className="border-l-4 bg-[#f7f7f0] px-5 py-5" style={{ borderColor: village.brandColor }}>
      <h3 className="text-xl font-black">{section.title}</h3>
      <p className="mt-3 line-clamp-4 text-sm leading-7 text-slate-600">
        {section.body}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {section.items.slice(0, 3).map((item) => (
          <span
            className="border border-[#d9d6c9] bg-white px-2.5 py-1 text-xs font-black text-slate-700"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black text-white/48">{label}</p>
      <p className="mt-1 text-3xl font-black text-[#A3FF5E]">{value}</p>
    </div>
  );
}

function GuideLine({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="grid gap-2">
      <p className="flex items-center gap-2 text-sm font-black text-[#4E7C3A]">
        {icon}
        {label}
      </p>
      <p className="text-sm font-bold leading-6 text-slate-700">{text}</p>
    </div>
  );
}

function EmptyBlock({ text }: { text: string; village: Village }) {
  const label = text.includes("후기")
    ? "참여 후기"
    : text.includes("미디어")
      ? "미디어"
      : "프로그램";

  return (
    <div className="border border-dashed border-[#cfc9b9] bg-white text-center">
      <NuvioEmptyState className="min-h-[240px]" label={label} />
    </div>
  );
}
