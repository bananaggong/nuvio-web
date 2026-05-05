import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  ExternalLink,
  Globe2,
  Link2,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, getDday } from "@/lib/format";
import {
  canonicalVillagePath,
  villageProgramPath,
} from "@/lib/village-routing";
import type { Program } from "@/lib/types";
import type { Village, VillageSection } from "@/lib/village-types";

export function VillageHomePage({
  village,
  programs,
}: {
  village: Village;
  programs: Program[];
}) {
  const primaryProgram = programs[0];

  return (
    <div className="bg-white">
      <section className="relative min-h-[78vh] overflow-hidden text-white">
        <Image
          alt={`${village.name} 대표 이미지`}
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src={village.heroImage}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/75" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-5 pb-12 pt-24 md:px-8">
          <div className="max-w-3xl">
            <Link
              className="inline-flex items-center gap-2 rounded-md bg-white/12 px-3 py-2 text-sm font-black text-white backdrop-blur hover:bg-white/20"
              href="/villages"
            >
              <MapPin size={16} />
              {village.region} {village.city}
            </Link>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              {village.name}
            </h1>
            <p className="mt-4 max-w-3xl text-lg font-bold leading-8 text-white/90 md:text-xl">
              {village.tagline}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 md:text-base">
              {village.summary}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-black text-white shadow-sm"
                href={primaryProgram ? villageProgramPath(village.slug, primaryProgram.slug) : "#programs"}
                style={{ backgroundColor: village.brandColor }}
              >
                <Sparkles size={18} />
                프로그램 보기
              </Link>
              {village.kakaoUrl ? (
                <a
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/25 bg-white/12 px-4 text-sm font-black text-white backdrop-blur hover:bg-white/20"
                  href={village.kakaoUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <MessageCircle size={18} />
                  문의하기
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-[var(--background)]">
        <div className="mx-auto grid max-w-6xl gap-3 px-5 py-5 md:grid-cols-4 md:px-8">
          <HeroFact icon={<MapPin size={18} />} label="지역" value={`${village.region} ${village.city}`} />
          <HeroFact icon={<UsersRound size={18} />} label="운영 프로그램" value={`${programs.length}개 연결`} />
          <HeroFact icon={<CalendarDays size={18} />} label="마지막 업데이트" value={formatDate(village.updatedAt)} />
          <HeroFact
            icon={<Globe2 size={18} />}
            label="공개 주소"
            value={canonicalVillagePath(village.slug)}
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0">
          <div className="max-w-3xl">
            <p className="text-sm font-black" style={{ color: village.brandColor }}>
              Village Home
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight text-slate-950 md:text-4xl">
              신청 전 안내부터 참여 후 후기까지, 이 마을의 공식 기준점을 만듭니다.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              {village.description}
            </p>
          </div>

          <section className="mt-10" id="programs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  운영 프로그램
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  마을과 연결된 모집 페이지를 같은 흐름으로 보여줍니다.
                </p>
              </div>
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                href="/"
              >
                전체 프로그램
                <ArrowRight size={16} />
              </Link>
            </div>

            {programs.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {programs.map((program) => (
                  <VillageProgramCard
                    key={`${program.id}-${program.slug}`}
                    program={program}
                    village={village}
                  />
                ))}
              </div>
            ) : (
              <EmptyProgramBlock village={village} />
            )}
          </section>

          <section className="mt-12 grid gap-4 md:grid-cols-2">
            {village.sections.map((section) => (
              <VillageSectionBlock
                key={section.id}
                section={section}
                village={village}
              />
            ))}
          </section>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div
              className="flex size-12 items-center justify-center rounded-md text-lg font-black text-white"
              style={{ backgroundColor: village.brandColor }}
            >
              {village.logoText ?? village.name.slice(0, 2)}
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-950">
              마을 운영 정보
            </h2>
            <div className="mt-4 grid gap-3 text-sm">
              {village.address ? (
                <ContactLine icon={<MapPin size={16} />} label={village.address} />
              ) : null}
              {village.contactPhone ? (
                <ContactLine icon={<Phone size={16} />} label={village.contactPhone} />
              ) : null}
              {village.contactEmail ? (
                <ContactLine icon={<Link2 size={16} />} label={village.contactEmail} />
              ) : null}
            </div>
            <div className="mt-5 grid gap-2">
              {village.instagramUrl ? (
                <ExternalButton href={village.instagramUrl} icon={<Camera size={17} />} label="인스타그램" />
              ) : null}
              {village.kakaoUrl ? (
                <ExternalButton href={village.kakaoUrl} icon={<MessageCircle size={17} />} label="카카오 채널" />
              ) : null}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-5">
            <h2 className="text-base font-black text-slate-950">도메인 전략</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              <p className="rounded-md bg-white p-3 font-bold">
                기본: nuvio.kr/{village.slug}
              </p>
              <p className="rounded-md bg-white p-3 font-bold">
                확장: {village.subdomain ?? village.slug}.nuvio.kr
              </p>
              {village.customDomain ? (
                <p className="rounded-md bg-white p-3 font-bold">
                  커스텀: {village.customDomain}
                </p>
              ) : null}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function VillageProgramCard({
  village,
  program,
}: {
  village: Village;
  program: Program;
}) {
  return (
    <article className="grid overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm sm:grid-cols-[220px_minmax(0,1fr)]">
      <Link
        className="relative aspect-[4/3] bg-slate-100 sm:aspect-auto"
        href={villageProgramPath(village.slug, program.slug)}
      >
        <Image
          alt={program.title}
          className="object-cover"
          fill
          sizes="(max-width: 640px) 100vw, 220px"
          src={program.image}
        />
      </Link>
      <div className="min-w-0 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge program={program} />
          <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
            {getDday(program.recruitEnd, program.status)}
          </span>
        </div>
        <Link href={villageProgramPath(village.slug, program.slug)}>
          <h3 className="mt-3 line-clamp-2 text-xl font-black leading-7 text-slate-950 hover:text-[var(--primary)]">
            {program.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
          {program.summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {program.hashtags.slice(0, 4).map((tag) => (
            <span
              className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs font-bold text-slate-600"
              key={tag}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function EmptyProgramBlock({ village }: { village: Village }) {
  const programSection = village.sections.find((section) => section.type === "programs");

  return (
    <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-white p-5">
      <p className="font-black text-slate-950">연결된 공개 프로그램이 아직 없습니다.</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        호스트 콘솔에서 프로그램을 게시한 뒤 마을의 연결 프로그램 ID/slug에 추가하면 이 영역에 바로 표시됩니다.
      </p>
      {programSection ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {programSection.items.map((item) => (
            <span
              className="rounded-md px-2 py-1 text-xs font-black text-white"
              key={item}
              style={{ backgroundColor: village.accentColor }}
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VillageSectionBlock({
  section,
  village,
}: {
  section: VillageSection;
  village: Village;
}) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5">
      <p className="text-xs font-black uppercase tracking-[0.08em]" style={{ color: village.brandColor }}>
        {section.type}
      </p>
      <h3 className="mt-2 text-xl font-black text-slate-950">{section.title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
      {section.items.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {section.items.map((item) => (
            <li className="flex gap-2 text-sm font-bold text-slate-700" key={item}>
              <span
                className="mt-1 size-2 shrink-0 rounded-full"
                style={{ backgroundColor: village.accentColor }}
              />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function HeroFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-slate-200 bg-white p-4">
      <div className="text-[var(--primary)]">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-black text-slate-400">{label}</p>
        <p className="mt-1 truncate text-sm font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function ContactLine({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <p className="flex items-center gap-2 font-bold text-slate-700">
      <span className="text-slate-400">{icon}</span>
      <span className="min-w-0 break-words">{label}</span>
    </p>
  );
}

function ExternalButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {icon}
      {label}
      <ExternalLink size={15} />
    </a>
  );
}
