"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { ChannelHomeBlockView } from "@/components/channel-home-block-view";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import {
  channelGuestHref,
  channelHomeLabel,
  channelMenuMeta,
  getVisibleChannelMenuItems,
  isChannelMenuSection,
  type ChannelMenuItem,
} from "@/lib/channel-menu";
import {
  getChannelHomeBlocks,
  isChannelHomeBlockSection,
} from "@/lib/channel-home-blocks";
import { villagePath, villageProgramPath } from "@/lib/village-routing";
import type { Program, Review, VillageMediaContent } from "@/lib/types";
import type { Village } from "@/lib/village-types";

type ChannelGuestHomePageProps = {
  media?: VillageMediaContent[];
  programs: Program[];
  reviews: Review[];
  village: Village;
};

type ProgramCardModel = {
  activityStart: string;
  href: string;
  id: string;
  image?: string;
  period: string;
  recruitStart: string;
  recruitEnd: string;
  status: Program["status"];
  summary: string;
  title: string;
};

type ProgramStatusFilter = "all" | "open" | "upcoming" | "closed";

type GalleryCardModel = {
  caption: string;
  count?: number;
  id: string;
  image?: string;
  kind?: "image" | "video";
};

type StoryCardModel = {
  date: string;
  id: string;
  image?: string;
  title: string;
};

type NoticeModel = {
  date: string;
  href: string;
  title: string;
  variant?: "fixed" | "new";
};

const text = {
  all: "\uC804\uCCB4",
  banner: "\uC124\uC815\uB41C \uBC30\uB108 \uC774\uBBF8\uC9C0",
  boardType: "\uAC8C\uC2DC\uD310\uD615",
  channel: "\uCC44\uB110",
  channelHome: "\uCC44\uB110 \uD648",
  closed: "\uB9C8\uAC10",
  ddayFallback: "D+ 00",
  fallbackGallery:
    "\uC0AC\uC9C4\uACFC \uC601\uC0C1\uC744 \uBAA8\uC544 \uBCF4\uC5EC\uC8FC\uB294 \uCC44\uB110 \uAC24\uB7EC\uB9AC\uC785\uB2C8\uB2E4. \uC9E7\uC740 \uCEA1\uC158\uACFC \uD568\uAED8 \uD604\uC7A5\uC758 \uBD84\uC704\uAE30\uB97C \uC804\uB2EC\uD569\uB2C8\uB2E4.",
  fallbackPeriod: "\uD504\uB85C\uADF8\uB7A8 \uAE30\uAC04",
  fallbackProgramSummary:
    "\uD504\uB85C\uADF8\uB7A8 \uC18C\uAC1C\uB97C \uAC04\uB2E8\uD788 \uC801\uC5B4\uC8FC\uC138\uC694.",
  fallbackProgramTitle: "\uD504\uB85C\uADF8\uB7A8 \uC81C\uBAA9 \uC785\uB825",
  fallbackReview:
    "\uC219\uC18C\uC640 \uC77C\uC815, \uD568\uAED8\uD55C \uC0AC\uB78C\uB4E4\uC5D0 \uB300\uD55C \uAE30\uB85D\uC744 \uB0A8\uACA8\uC8FC\uC138\uC694. \uCC44\uB110\uC5D0 \uB0A8\uAE34 \uD6C4\uAE30\uB294 \uB2E4\uC74C \uCC38\uC5EC\uC790\uC5D0\uAC8C \uC88B\uC740 \uC548\uB0B4\uAC00 \uB429\uB2C8\uB2E4.",
  fixed: "\uACE0\uC815",
  freeType: "\uC790\uC720\uD615",
  gallery: "\uAC24\uB7EC\uB9AC",
  galleryType: "\uAC24\uB7EC\uB9AC\uD615",
  homeAria: "\uB204\uBE44\uC624 \uD648\uC73C\uB85C",
  login: "\uB85C\uADF8\uC778",
  magazine: "\uB9E4\uAC70\uC9C4",
  magazineType: "\uB9E4\uAC70\uC9C4\uD615",
  message: "\uBA54\uC2DC\uC9C0",
  nickname: "\uB2C9\uB124\uC784",
  new: "\uC2E0\uADDC",
  notice: "\uACF5\uC9C0",
  notification: "\uC54C\uB9BC",
  open: "\uC624\uD508",
  program: "\uD504\uB85C\uADF8\uB7A8",
  review: "\uD6C4\uAE30",
  reviewTitle: "\uD574\uB2F9 \uD504\uB85C\uADF8\uB7A8 \uBA85",
  save: "\uC800\uC7A5",
  search: "\uC5B4\uB514\uB85C \uB5A0\uB0A0\uAE4C\uC694?",
  seeAll: "\uC804\uCCB4\uBCF4\uAE30",
  seeAllPlus: "\uC804\uCCB4\uBCF4\uAE30+",
  story: "\uC774\uC57C\uAE30",
  storyTitle: "\uBA54\uC778 \uCF58\uD150\uCE20 \uC81C\uBAA9",
  upcoming: "\uC608\uC815",
} as const;

const px = (value: number) =>
  `clamp(${value}px, ${(value / 14.4).toFixed(6)}vw, ${(value * 4 / 3).toFixed(6)}px)`;

const scaleRootStyle = {
  "--channel-font-11": px(11),
  "--channel-font-12": px(12),
  "--channel-font-14": px(14),
  "--channel-font-16": px(16),
  "--channel-font-20": px(20),
  "--channel-font-24": px(24),
} as CSSProperties;

const contentStyle = {
  maxWidth: `calc(100% - ${px(298)})`,
  width: px(1142),
} as CSSProperties;

const programFilterOptions: Array<{ label: string; value: ProgramStatusFilter }> = [
  { label: text.all, value: "all" },
  { label: text.open, value: "open" },
  { label: text.upcoming, value: "upcoming" },
  { label: text.closed, value: "closed" },
];

const programEmptyMessages: Record<ProgramStatusFilter, string> = {
  all: "아직 프로그램이 없어요",
  closed: "아직 마감된 프로그램이 없어요",
  open: "아직 오픈된 프로그램이 없어요",
  upcoming: "아직 예정된 프로그램이 없어요",
};

export function ChannelGuestHomePage({
  media = [],
  programs,
  village,
}: ChannelGuestHomePageProps) {
  const homeHref = villagePath(village.slug);
  const programCards = buildProgramCards(programs, village);
  const galleryCards = buildGalleryCards(media, programs).slice(0, 3);
  const stories = buildStoryCards(media, village).slice(0, 3);
  const notices = buildChannelNotices(village, programs).slice(0, 4);
  const visibleMenuItems = getVisibleChannelMenuItems(village);
  const homeBlocks = getChannelHomeBlocks(village);

  return (
    <div
      className="min-h-screen overflow-x-clip bg-white font-pretendard text-[#5B3A29]"
      style={scaleRootStyle}
    >
      <main className="mx-auto w-full max-w-[1920px]">
        {village.heroImage ? (
          <section
            className="relative flex items-center justify-center overflow-hidden bg-[#F3F3F3]"
            style={{ height: px(560) }}
          >
            <Image
              alt={`${village.name} banner`}
              className="object-contain object-center"
              fill
              priority
              sizes="100vw"
              src={village.heroImage}
            />
          </section>
        ) : null}

        <ChannelProfileHeader homeHref={homeHref} village={village} />

        <div
          className="mx-auto flex flex-col"
          style={{
            ...contentStyle,
            gap: px(40),
            paddingBottom: px(70),
            paddingTop: px(22),
          }}
        >
          {visibleMenuItems.map((item) => (
            <ChannelGuestMenuSection
              galleryCards={galleryCards}
              homeHref={homeHref}
              item={item}
              key={item.id}
              notices={notices}
              programs={programCards}
              stories={stories}
              village={village}
            />
          ))}
          {homeBlocks.map((block) => (
            <ChannelHomeBlockView block={block} key={block.id} px={px} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ChannelProfileHeader({
  homeHref,
  village,
}: {
  homeHref: string;
  village: Village;
}) {
  const menuItems = getVisibleChannelMenuItems(village);

  return (
    <section
      className="mx-auto flex items-end border-b border-[#6D7A8A]"
      style={{
        ...contentStyle,
        gap: px(39),
        minHeight: px(185.658),
        padding: `${px(22)} ${px(58)} 0`,
      }}
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-[#D9D9D9]"
        style={{
          height: px(128),
          marginBottom: px(22),
          width: px(128),
        }}
      >
        {village.profileImage ? (
          <Image
            alt={`${village.name} profile`}
            className="object-cover"
            fill
            sizes="170px"
            src={village.profileImage}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-semibold leading-[1] text-[#6D7A8A]"
            style={{ fontSize: px(24) }}
          >
            {(village.name || village.logoText || "N").slice(0, 1)}
          </span>
        )}
      </div>
      <div className="flex flex-col" style={{ gap: px(4) }}>
        <div className="flex items-end" style={{ gap: px(8) }}>
          <h1 className="text-[length:var(--channel-font-24)] font-medium leading-[1.253] text-[#0D0D0C]">
            {village.name}
          </h1>
          <span
            className="text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#6D7A8A]"
            style={{ paddingBottom: px(2) }}
          >
            {village.city || village.region}
          </span>
        </div>
        <p className="text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
          {village.tagline || village.summary}
        </p>
        <div className="flex items-center" style={{ gap: px(8) }}>
          <Image
            alt=""
            height={12}
            src={nuvioIcons.channelLink}
            style={{ height: px(12), width: px(12) }}
            width={12}
          />
          <span className="text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
            {village.region}
          </span>
          <span className="text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
            {village.slug}
          </span>
        </div>
        <div
          className="flex items-center"
          style={{
            gap: px(8),
            marginTop: px(4),
            paddingLeft: px(2),
          }}
        >
          <Image
            alt={text.notification}
            height={20}
            src={nuvioIcons.bell}
            style={{ height: px(20), width: px(19) }}
            width={19}
          />
          <Image
            alt={text.message}
            height={18}
            src={nuvioIcons.message}
            style={{ height: px(18), width: px(18) }}
            width={18}
          />
        </div>
        <nav
          className="flex items-end"
          style={{
            gap: px(40),
            paddingTop: px(14),
          }}
        >
          <ChannelTab active href={homeHref} label={channelHomeLabel} />
          {menuItems.map((item) => (
            <ChannelTab
              href={channelGuestHref(item.kind, village)}
              key={item.id}
              label={item.label || channelMenuMeta[item.kind].defaultLabel}
            />
          ))}
        </nav>
      </div>
    </section>
  );
}

function ChannelTab({
  active = false,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`flex items-center justify-center whitespace-nowrap text-[length:var(--channel-font-16)] font-semibold leading-[1.253] text-[#5B3A29] ${
        active ? "border-b-2 border-[#FF9A3D]" : ""
      }`}
      href={href}
      style={{
        height: px(36),
        paddingBottom: px(8),
        paddingTop: active ? px(5) : px(8),
      }}
    >
      {label}
    </Link>
  );
}

function ChannelGuestMenuSection({
  galleryCards,
  homeHref,
  item,
  notices,
  programs,
  stories,
  village,
}: {
  galleryCards: GalleryCardModel[];
  homeHref: string;
  item: ChannelMenuItem;
  notices: NoticeModel[];
  programs: ProgramCardModel[];
  stories: StoryCardModel[];
  village: Village;
}) {
  if (item.kind === "program") {
    return (
      <ChannelProgramSection
        homeHref={homeHref}
        programs={programs}
        title={item.label || channelMenuMeta.program.defaultLabel}
      />
    );
  }

  if (item.kind === "gallery") {
    return (
      <ChannelGallerySection
        homeHref={homeHref}
        items={galleryCards}
        title={item.label || channelMenuMeta.gallery.defaultLabel}
      />
    );
  }

  if (item.kind === "magazine") {
    return (
      <ChannelStorySection
        stories={stories}
        title={item.label || channelMenuMeta.magazine.defaultLabel}
      />
    );
  }

  if (item.kind === "board") {
    return (
      <ChannelNoticeSection
        notices={notices}
        title={item.label || channelMenuMeta.board.defaultLabel}
      />
    );
  }

  if (item.kind === "review") {
    return <span className="hidden" id={`channel-${village.slug}-reviews`} />;
  }

  return <span className="hidden" id={`channel-${village.slug}-free`} />;
}

function ChannelProgramSection({
  homeHref,
  programs,
  title,
}: {
  homeHref: string;
  programs: ProgramCardModel[];
  title: string;
}) {
  const [activeFilter, setActiveFilter] = useState<ProgramStatusFilter>("all");
  const visiblePrograms = useMemo(
    () => filterProgramCards(programs, activeFilter).slice(0, 4),
    [activeFilter, programs],
  );

  return (
    <section>
      <SectionHeading title={title} />
      <div
        className="flex items-center border-b border-[#6D7A8A]"
        style={{
          gap: px(10),
          height: px(48),
          marginTop: px(18),
          paddingBottom: px(12),
          paddingLeft: px(9),
        }}
      >
        {programFilterOptions.map((option) => (
          <button
            aria-pressed={activeFilter === option.value}
            className={`flex items-center justify-center rounded-full text-center text-[length:var(--channel-font-12)] font-bold leading-[1.6] ${
              activeFilter === option.value ? "bg-[#FF9A3D] text-[#F9F9F9]" : "bg-[#CAC4BC] text-[#F3F3F3]"
            }`}
            key={option.value}
            onClick={() => setActiveFilter(option.value)}
            style={{ height: px(30), width: px(70) }}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      {visiblePrograms.length > 0 ? (
        <div
          className="flex items-start"
          style={{
            gap: px(40),
            padding: `${px(30)} ${px(20)} 0`,
          }}
        >
          {visiblePrograms.map((program) => (
            <MiniProgramCard key={program.id} program={program} />
          ))}
          <MoreLink href={`${homeHref}/programs`} />
        </div>
      ) : (
        <ChannelProgramEmptyState
          homeHref={homeHref}
          message={programEmptyMessages[activeFilter]}
        />
      )}
    </section>
  );
}

function MiniProgramCard({ program }: { program: ProgramCardModel }) {
  const status = getProgramStatus(program.status);

  return (
    <Link className="block shrink-0" href={program.href} style={{ width: px(186) }}>
      <div
        className="relative overflow-hidden bg-[#D9D9D9]"
        style={{ borderRadius: px(8.65), height: px(232.5) }}
      >
        {program.image ? (
          <Image
            alt={program.title}
            className="object-cover"
            fill
            sizes="248px"
            src={program.image}
          />
        ) : null}
      </div>
      <div
        className="flex flex-col"
        style={{
          gap: px(13),
          paddingTop: px(12),
        }}
      >
        <div className="flex items-start" style={{ gap: px(13) }}>
          <span
            className="text-[length:var(--channel-font-12)] font-semibold leading-[1.253] text-[#FCFCFC]"
            style={{
              backgroundColor: status.badgeColor,
              borderRadius: px(6),
              padding: `${px(3)} ${px(6)}`,
            }}
          >
            {status.label}
          </span>
          <span className="min-w-0 flex-1 truncate text-[length:var(--channel-font-12)] font-semibold leading-[1.253] text-[#6D7A8A]">
            {getProgramDday(program.recruitEnd, program.status)}
          </span>
          <Image
            alt={text.save}
            height={19}
            src={nuvioIcons.bookmark}
            style={{ height: px(19), width: px(17) }}
            width={17}
          />
        </div>
        <h3 className="line-clamp-2 text-[length:var(--channel-font-16)] font-normal leading-[1.253] text-[#5B3A29]">
          {program.title}
        </h3>
        <p className="line-clamp-2 text-[length:var(--channel-font-12)] font-normal leading-[1.6] text-[#CAC4BC]">
          {program.summary}
        </p>
        <p className="text-[length:var(--channel-font-12)] font-normal leading-[1.6] text-[#6D7A8A]">
          {program.period}
        </p>
      </div>
    </Link>
  );
}

function ChannelGallerySection({
  homeHref,
  items,
  title,
}: {
  homeHref: string;
  items: GalleryCardModel[];
  title: string;
}) {
  return (
    <section>
      <SectionHeading title={title} />
      <div
        className="grid items-start"
        style={{
          gap: px(40),
          gridTemplateColumns: `repeat(3, minmax(0, ${px(290)})) ${px(112)}`,
          padding: `${px(26)} ${px(20)} 0`,
        }}
      >
        {items.map((item) => (
          <GalleryTile item={item} key={item.id} />
        ))}
        <MoreLink href={`${homeHref}/media?type=gallery`} tall />
      </div>
    </section>
  );
}

function GalleryTile({ item }: { item: GalleryCardModel }) {
  return (
    <article
      className="overflow-hidden bg-[#D9D9D9]"
      style={{ borderRadius: px(4), height: px(380), width: px(290) }}
    >
      <div className="relative overflow-hidden" style={{ height: px(299) }}>
        {item.image ? (
          <Image
            alt={item.caption}
            className="object-cover"
            fill
            sizes="387px"
            src={item.image}
          />
        ) : null}
        {item.kind === "video" ? (
          <span
            className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 border-y-transparent border-l-white"
            style={{
              borderBottomWidth: px(13),
              borderLeftWidth: px(22),
              borderTopWidth: px(13),
            }}
          />
        ) : null}
        {item.count ? (
          <span
            className="absolute text-[length:var(--channel-font-14)] font-semibold leading-[1.253] text-white"
            style={{ right: px(20), top: px(20) }}
          >
            +{item.count}
          </span>
        ) : null}
      </div>
      <p
        className="line-clamp-3 text-[length:var(--channel-font-12)] font-medium leading-[1.6] text-white"
        style={{ padding: px(16) }}
      >
        {item.caption}
      </p>
    </article>
  );
}

function ChannelStorySection({
  stories,
  title,
}: {
  stories: StoryCardModel[];
  title: string;
}) {
  return (
    <section>
      <SectionHeading title={title} />
      <div
        className="grid"
        style={{
          gap: px(40),
          gridTemplateColumns: `repeat(3, minmax(0, ${px(386)}))`,
          padding: `${px(26)} ${px(20)} 0`,
        }}
      >
        {stories.map((story) => (
          <article
            className="overflow-hidden bg-[#F9F9F9]"
            key={story.id}
            style={{ borderRadius: px(10), width: px(386) }}
          >
            <div className="relative overflow-hidden bg-[#D9D9D9]" style={{ height: px(368) }}>
              {story.image ? (
                <Image
                  alt={story.title}
                  className="object-cover"
                  fill
                  sizes="515px"
                  src={story.image}
                />
              ) : null}
            </div>
            <div style={{ padding: `${px(22)} ${px(24)}` }}>
              <h3 className="truncate text-[length:var(--channel-font-20)] font-semibold leading-[1.253] text-[#5B3A29]">
                {story.title}
              </h3>
              <p className="text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#CAC4BC]" style={{ marginTop: px(1) }}>
                {story.date}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChannelNoticeSection({
  notices,
  title,
}: {
  notices: NoticeModel[];
  title: string;
}) {
  return (
    <section>
      <SectionHeading title={title} />
      <div className="border-t border-[#F5E1D3]" style={{ margin: `${px(26)} ${px(20)} 0` }}>
        {notices.map((notice, index) => (
          <Link
            className="grid items-center border-b border-[#F5E1D3]"
            href={notice.href}
            key={`${notice.title}-${index}`}
            style={{
              gridTemplateColumns: `${px(84)} minmax(0, 1fr) ${px(160)}`,
              height: px(43),
              paddingRight: px(27),
            }}
          >
            <span
              className={`flex items-center justify-center text-[length:var(--channel-font-11)] font-semibold leading-[1.253] text-white ${
                notice.variant === "fixed" ? "bg-[#789157]" : notice.variant === "new" ? "bg-[#FF9A3D]" : ""
              }`}
              style={{ borderRadius: px(4), height: px(17), width: px(39) }}
            >
              {notice.variant === "fixed" ? text.fixed : notice.variant === "new" ? text.new : ""}
            </span>
            <span className="min-w-0 truncate text-[length:var(--channel-font-12)] font-medium leading-[1.253] text-[#5B3A29]">
              {notice.title}
            </span>
            <span className="text-right text-[length:var(--channel-font-12)] font-medium leading-[1.253] text-[#CAC4BC]">
              {formatNoticeDate(notice.date)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MoreLink({ href, tall = false }: { href: string; tall?: boolean }) {
  return (
    <Link
      className="flex flex-col items-center justify-center text-[length:var(--channel-font-12)] font-medium leading-[1.253] text-[#6D7A8A]"
      href={href}
      style={{
        gap: px(8),
        height: tall ? px(220) : px(214),
        width: px(112),
      }}
    >
      <span className="text-[length:var(--channel-font-24)] font-semibold leading-none text-[#FF9A3D]">
        +
      </span>
      {text.seeAll}
    </Link>
  );
}

function SectionHeading({
  actionHref,
  actionLabel,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  title: string;
}) {
  return (
    <div className="flex items-center" style={{ height: px(25), paddingLeft: px(16), paddingRight: px(16) }}>
      <h2 className="text-[length:var(--channel-font-20)] font-semibold leading-[1.253] text-[#5B3A29]">
        {title}
      </h2>
      {actionHref && actionLabel ? (
        <Link
          className="text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#CAC4BC]"
          href={actionHref}
          style={{ marginLeft: px(8) }}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function buildProgramCards(programs: Program[], village: Village): ProgramCardModel[] {
  return programs.map((program) => ({
    activityStart: program.activityStart,
    href: villageProgramPath(village.slug, program.slug),
    id: String(program.id),
    image: program.image,
    period: formatCompactPeriod(program.activityStart, program.activityEnd),
    recruitStart: program.recruitStart,
    recruitEnd: program.recruitEnd,
    status: program.status,
    summary: program.summary || text.fallbackProgramSummary,
    title: program.title || text.fallbackProgramTitle,
  }));
}

function filterProgramCards(
  cards: ProgramCardModel[],
  activeFilter: ProgramStatusFilter,
) {
  if (activeFilter === "all") return cards;
  if (activeFilter === "closed") {
    return cards.filter(
      (program) => program.status === "closed" || program.status === "earlyClosed",
    );
  }

  return cards.filter((program) => program.status === activeFilter);
}

function ChannelProgramEmptyState({
  homeHref,
  message,
}: {
  homeHref: string;
  message: string;
}) {
  return (
    <div
      className="border border-dashed border-[#D6D6D6]"
      style={{
        margin: `${px(30)} ${px(20)} 0`,
        minHeight: px(260),
      }}
    >
      <NuvioEmptyState
        actionHref={`${homeHref}/programs`}
        actionLabel="프로그램 찾아보기"
        className="h-full"
        message={message}
      />
    </div>
  );
}

function buildGalleryCards(
  media: VillageMediaContent[],
  programs: Program[],
): GalleryCardModel[] {
  const cards: GalleryCardModel[] = media.map((item, index) => ({
    caption: item.summary || text.fallbackGallery,
    count: index === 0 || index === 2 ? 3 : undefined,
    id: item.id,
    image: item.thumbnail,
    kind: index === 1 ? "video" : "image",
  }));
  const images = programs
    .flatMap((program) => [program.image, ...program.gallery])
    .filter(Boolean)
    .slice(0, 3);

  return cards.concat(
    Array.from({ length: Math.max(0, 3 - cards.length) }, (_, index) => ({
      caption: text.fallbackGallery,
      count: index === 1 ? undefined : 3,
      id: `gallery-fallback-${index}`,
      image: images[index],
      kind: index === 1 ? "video" : "image",
    })),
  );
}

function buildStoryCards(media: VillageMediaContent[], village: Village): StoryCardModel[] {
  const cards = media.map((item) => ({
    date: formatStoryDate(item.date),
    id: item.id,
    image: item.thumbnail,
    title: item.title || text.storyTitle,
  }));

  return cards.concat(
    village.sections
      .filter((section) => !isChannelMenuSection(section))
      .filter((section) => !isChannelHomeBlockSection(section))
      .slice(0, Math.max(0, 3 - cards.length))
      .map((section) => ({
        date: "0000. 00. 00",
        id: section.id,
        image: village.heroImage,
        title: section.title || text.storyTitle,
      })),
  );
}

function buildChannelNotices(village: Village, programs: Program[]): NoticeModel[] {
  const homeHref = villagePath(village.slug);
  const programNotices: NoticeModel[] = programs.slice(0, 3).map((program, index) => ({
    date: program.recruitStart,
    href: villageProgramPath(village.slug, program.slug),
    title: `${program.title} ${text.open} ${text.notice}`,
    variant: index === 0 ? "fixed" : ("new" as const),
  }));

  return programNotices.concat([
    {
      date: village.updatedAt,
      href: `${homeHref}/notice`,
      title: `${village.name} ${text.channelHome} ${text.notice}`,
      variant: undefined,
    },
  ]);
}

function getProgramStatus(status: Program["status"]) {
  if (status === "closed" || status === "earlyClosed") {
    return { badgeColor: "#6D7A8A", label: text.closed };
  }
  if (status === "upcoming") {
    return { badgeColor: "#F7B267", label: text.upcoming };
  }
  return { badgeColor: "#F7B267", label: text.open };
}

function getProgramDday(recruitEnd: string, status: Program["status"]) {
  if (status === "closed" || status === "earlyClosed") return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${recruitEnd}T23:59:59+09:00`);
  if (Number.isNaN(end.getTime())) return text.ddayFallback;

  const diff = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${String(diff).padStart(2, "0")}`;
  return `D+ ${String(Math.abs(diff)).padStart(2, "0")}`;
}

function formatCompactPeriod(start: string, end: string) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return text.fallbackPeriod;

  return `${startDate.getMonth() + 1}.${startDate.getDate()}-${endDate.getMonth() + 1}.${endDate.getDate()}`;
}

function formatStoryDate(value: string) {
  const date = toDate(value);
  if (!date) return "0000. 00. 00";
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, "0")}. ${String(date.getDate()).padStart(2, "0")}`;
}

function formatNoticeDate(value: string) {
  const date = toDate(value);
  if (!date) return "2000. 00. 00 00:00";
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, "0")}. ${String(date.getDate()).padStart(2, "0")} 00:00`;
}

function toDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
