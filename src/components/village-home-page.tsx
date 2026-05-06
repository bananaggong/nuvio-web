import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Phone,
  Plus,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { VillageSiteFooter, VillageSiteHeader } from "@/components/village-site-chrome";
import { formatDate, getDday } from "@/lib/format";
import { villagePath, villageProgramPath } from "@/lib/village-routing";
import {
  buildVillageNotices,
  getVillageApplyLabel,
  getVillageEnglishLabel,
  getVillageHeroTitle,
  sectionTypeLabels,
} from "@/lib/village-template";
import type { Program, Review } from "@/lib/types";
import type { Village, VillageSection } from "@/lib/village-types";

export function VillageHomePage({
  village,
  programs,
  reviews,
}: {
  village: Village;
  programs: Program[];
  reviews: Review[];
}) {
  const primaryProgram = programs[0];
  const homePath = villagePath(village.slug);
  const notices = buildVillageNotices(village, programs);
  const featuredPrograms = programs.slice(0, 4);
  const activitySections = village.sections.slice(0, 4);

  return (
    <div className="bg-[#f6f4ee] text-[#171717]">
      <VillageSiteHeader
        primaryProgram={primaryProgram}
        variant="dark"
        village={village}
      />

      <section className="relative overflow-hidden bg-[#e8e3d4]">
        <Image
          alt={`${village.name} 대표 이미지`}
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src={village.heroImage}
        />
        <div className="absolute inset-0 bg-[#12110f]/45" />
        <div className="relative mx-auto flex min-h-[430px] max-w-7xl flex-col items-center justify-center px-5 py-16 text-center text-white md:min-h-[520px] md:px-8">
          <p className="text-sm font-black uppercase">
            2026 {getVillageEnglishLabel(village)}
          </p>
          <h1 className="mt-5 font-serif text-5xl font-black leading-tight md:text-7xl">
            {getVillageHeroTitle(village)}
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-bold leading-8 text-white/90">
            {village.tagline}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/76 md:text-base">
            {village.summary}
          </p>
        </div>
      </section>

      <section className="bg-[#efa92f] px-5 py-5 text-center md:px-8">
        <p className="text-lg font-black text-black">
          {getVillageApplyLabel(village)}
        </p>
        <Link
          className="mt-3 inline-flex h-10 items-center justify-center bg-[#242421] px-6 text-sm font-black text-white hover:bg-black"
          href={primaryProgram ? villageProgramPath(village.slug, primaryProgram.slug) : `${homePath}#programs`}
        >
          바로 신청하기
        </Link>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8" id="programs">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl font-black md:text-4xl">
            진행중인 프로그램
          </h2>
          <Link
            className="hidden items-center gap-2 text-sm font-black hover:text-[#0f766e] md:inline-flex"
            href={`${homePath}/programs`}
          >
            더보기
            <Plus size={18} />
          </Link>
        </div>

        {featuredPrograms.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {featuredPrograms.map((program) => (
              <FeaturedProgramCard
                key={`${program.id}-${program.slug}`}
                program={program}
                village={village}
              />
            ))}
          </div>
        ) : (
          <EmptyProgram village={village} />
        )}
      </section>

      <section className="border-y border-[#dfddd5] bg-white px-5 py-14 md:px-8" id="story">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-serif text-3xl font-black md:text-4xl">
                보성 청년마을 둘러보기
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                {village.description}
              </p>
            </div>
            <Link
              className="hidden items-center gap-2 text-sm font-black hover:text-[#0f766e] md:inline-flex"
              href={`${homePath}/about`}
            >
              더보기
              <Plus size={18} />
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {activitySections.map((section) => (
              <ActivityTile key={section.id} section={section} village={village} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8" id="reviews">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl font-black md:text-4xl">
            참여 후기
          </h2>
          <Link
            className="hidden items-center gap-2 text-sm font-black hover:text-[#0f766e] md:inline-flex"
            href={`${homePath}/reviews`}
          >
            더보기
            <Plus size={18} />
          </Link>
        </div>

        {reviews.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 3).map((review) => (
              <Link
                className="border border-[#dfddd5] bg-white px-6 py-6 hover:border-[#0f766e]"
                href={`${homePath}/reviews/${review.id}`}
                key={review.id}
              >
                <p className="text-xs font-black text-slate-500">
                  {formatDate(review.date)}
                </p>
                <h3 className="mt-3 line-clamp-2 text-xl font-black leading-7">
                  {review.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                  {review.excerpt}
                </p>
                <p className="mt-5 text-sm font-black" style={{ color: village.brandColor }}>
                  {review.author}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[#cfc9b9] bg-white px-6 py-10 text-center">
            <p className="font-black">아직 공개된 참여 후기가 없습니다.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              기수 활동 후기가 등록되면 이곳에 모아 보여줍니다.
            </p>
          </div>
        )}
      </section>

      <section
        className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]"
        id="notice"
      >
        <Link
          className="group relative min-h-[360px] overflow-hidden bg-slate-900 text-white"
          href={`${homePath}#guide`}
        >
          <Image
            alt={`${village.name} 둘러보기`}
            className="object-cover transition duration-500 group-hover:scale-105"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            src={village.heroImage}
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-x-0 bottom-0 bg-black/70 px-6 py-5">
            <span className="inline-flex items-center gap-2 text-base font-black">
              {village.name} 이용안내
              <ArrowRight size={18} />
            </span>
          </div>
        </Link>

        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-serif text-3xl font-black md:text-4xl">
              공지사항
            </h2>
            <Link
              className="inline-flex items-center gap-2 text-sm font-black hover:text-[#0f766e]"
              href={`${homePath}/notice`}
            >
              더보기
              <Plus size={18} />
            </Link>
          </div>
          <div className="divide-y divide-[#dedbd1] border-y border-[#dedbd1] bg-[#f6f4ee]">
            {notices.map((notice) => (
              <Link
                className="grid gap-3 px-1 py-4 text-sm hover:bg-white md:grid-cols-[minmax(0,1fr)_112px]"
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

      <section className="relative overflow-hidden bg-[#2b2b28] px-5 py-16 md:px-8" id="guide">
        <Image
          alt=""
          aria-hidden
          className="object-cover opacity-18"
          fill
          sizes="100vw"
          src={village.heroImage}
        />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <GuideBox
            icon={<Clock3 size={20} />}
            title="프로그램 운영 시간"
            body="기수별 일정에 따라 사전 안내된 시간에 운영합니다."
            detail="선정자에게 OT, 숙소 위치, 준비물, 공지방 입장 안내를 순차 발송합니다."
          />
          <GuideBox
            icon={<CalendarDays size={20} />}
            title="신청 및 선정 안내"
            body="신청 후 운영진 검토를 거쳐 선정 여부를 개별 안내합니다."
            detail="유료 프로그램은 입금 확인 후 참여 확정 및 소통방 입장이 진행됩니다."
          />
          <GuideBox
            icon={<MapPin size={20} />}
            title="오시는 길"
            body={village.address ?? `${village.region} ${village.city}`}
            detail="세부 집결지와 숙소 위치는 선정자에게 별도 안내합니다."
          />
          <GuideBox
            icon={<Phone size={20} />}
            title="문의"
            body={village.contactPhone ?? "운영 사무국 문의"}
            detail={village.contactEmail ?? "카카오 채널 또는 공식 연락처를 통해 문의해 주세요."}
          />
        </div>
      </section>

      <VillageSiteFooter primaryProgram={primaryProgram} village={village} />
    </div>
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
    <article className="border border-[#ddd8ca] bg-white">
      <Link
        className="relative block aspect-[4/5] overflow-hidden bg-[#ece8dd]"
        href={villageProgramPath(village.slug, program.slug)}
      >
        <Image
          alt={program.title}
          className="object-cover transition duration-500 hover:scale-105"
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          src={program.image}
        />
      </Link>
      <div className="px-5 py-6 text-center">
        <div className="mb-3 flex justify-center gap-2">
          <StatusBadge program={program} />
          <span className="rounded-full bg-[#242421] px-3 py-1 text-xs font-black text-white">
            {getDday(program.recruitEnd, program.status)}
          </span>
        </div>
        <p className="text-sm font-black" style={{ color: village.brandColor }}>
          {program.city}
        </p>
        <Link href={villageProgramPath(village.slug, program.slug)}>
          <h3 className="mt-2 line-clamp-2 text-xl font-black leading-7 hover:text-[#0f766e]">
            {program.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
          {program.summary}
        </p>
      </div>
    </article>
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
    <article className="border border-[#dfddd5] bg-[#fbfaf6] px-5 py-6 text-center">
      <p className="text-xs font-black uppercase text-slate-500">
        {sectionTypeLabels[section.type]}
      </p>
      <h3 className="mt-3 font-serif text-2xl font-black">{section.title}</h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
        {section.body}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {section.items.slice(0, 3).map((item) => (
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

function GuideBox({
  body,
  detail,
  icon,
  title,
}: {
  body: string;
  detail: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border border-black/20 bg-white px-8 py-8">
      <div className="flex items-center gap-3 text-[#0f766e]">
        {icon}
        <h3 className="font-serif text-2xl font-black text-slate-950">{title}</h3>
      </div>
      <p className="mt-5 text-base font-black leading-7 text-slate-950">{body}</p>
      <p className="mt-3 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">
        {detail}
      </p>
    </section>
  );
}

function EmptyProgram({ village }: { village: Village }) {
  return (
    <div className="border border-dashed border-[#cfc9b9] bg-white px-6 py-10 text-center">
      <p className="font-black">{village.name}의 공개 프로그램을 준비 중입니다.</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        모집 일정이 확정되면 이 영역에서 바로 신청할 수 있습니다.
      </p>
    </div>
  );
}
