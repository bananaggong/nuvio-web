import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  ExternalLink,
  MapPin,
  Play,
} from "lucide-react";
import {
  BoseongOriginalCarousel,
  type BoseongOriginalSlide,
} from "@/components/boseong-original-carousel";
import { formatDate } from "@/lib/format";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  getSectionContent,
  type PublishedVillagePageSection,
} from "@/lib/village-page-content";
import { channelPath, channelProgramPath } from "@/lib/channel-routing";
import type { Program, Review, VillageMediaContent } from "@/lib/types";
import type { Village } from "@/lib/village-types";

const boseongAssets = {
  logo: "/boseong/jeonchecha-logo.png",
  logoLarge: "/boseong/jeonchecha-logo-large.png",
  hero: "/boseong/hero-illustration.png",
  teaTime: "/boseong/home-tea-time.png",
  map: "/boseong/map-illustration.png",
  aboutIcons: [
    "/boseong/about-icon-0.png",
    "/boseong/about-icon-1.png",
    "/boseong/about-icon-2.png",
    "/boseong/about-icon-3.png",
    "/boseong/about-icon-4.png",
  ],
};

const boseongNav = [
  { label: "전체차LAB", href: "/boseong/about", width: 117 },
  { label: "전체차 오리지널", href: "/boseong/programs", width: 164 },
  { label: "전체차 이야기", href: "/boseong/media", width: 141 },
  { label: "전체차 후기", href: "/boseong/reviews", width: 119 },
  { label: "전체차 소식", href: "/boseong/notice", width: 119 },
];

const visibleBoseongNav = boseongNav.filter((item) =>
  item.href.includes("/reviews") ? launchFeatureFlags.reviews : true,
);

const mediaCategoryLabels: Record<VillageMediaContent["category"], string> = {
  original: "자체 콘텐츠",
  broadcast: "방송출연",
  archive: "아카이브",
};

const boseongReviewFilterOptions = [
  { key: "all", label: "전체", href: "/boseong/reviews" },
  {
    key: "talent-for-stay",
    label: "숙재받",
    href: "/boseong/reviews?program=talent-for-stay",
    programIds: [1013],
    terms: ["숙재받"],
  },
  {
    key: "local-salon",
    label: "로컬살롱",
    href: "/boseong/reviews?program=local-salon",
    programIds: [1014],
    terms: ["로컬살롱"],
  },
  {
    key: "tea-lab",
    label: "차실험",
    href: "/boseong/reviews?program=tea-lab",
    programIds: [1015],
    terms: ["차실험", "차 실험", "차실험실"],
  },
] as const;

type BoseongReviewFilterKey = (typeof boseongReviewFilterOptions)[number]["key"];

const originalProgramDisplay: Record<
  string,
  {
    activityRange: string;
    location: string;
    status: "모집" | "마감";
    summary: string;
    title: string;
  }
> = {
  "talent-for-stay": {
    activityRange: "2025년 8월 7일 - 2025년 11월 21일",
    location: "전남 보성군",
    status: "모집",
    summary:
      "준비물은 당신의 재능뿐입니다.\n재능을 나누고 사람을 만나고 보성을 담아가세요.",
    title: "숙박비는\n재능으로 받습니다.",
  },
  "local-salon": {
    activityRange: "2025년 8월 7일 - 2025년 11월 21일",
    location: "전남 보성군",
    status: "마감",
    summary:
      "차를 좋아한다는 것만으로 이렇게 친해질 수 있어요.\n낯선 사람과 차 한 잔을 나누다 보면 어느새\n보성의 밤이 깊어집니다.",
    title: "로컬살롱",
  },
  "tea-lab": {
    activityRange: "2025년 8월 7일 - 2025년 11월 21일",
    location: "전남 보성군",
    status: "모집",
    summary:
      "내가 좋아하는 향, 내가 좋아하는 맛,\n내가 고른 찻잎으로 나만의 차 한 잔을 완성합니다. 차 한\n잔에 나를 담아보세요.",
    title: "나를 담는 차실험",
  },
};

function normalizeBoseongReviewFilter(value?: string): BoseongReviewFilterKey {
  return boseongReviewFilterOptions.some((option) => option.key === value)
    ? (value as BoseongReviewFilterKey)
    : "all";
}

function matchesBoseongReviewFilter(
  review: Review,
  filter: BoseongReviewFilterKey,
): boolean {
  if (filter === "all") return true;

  const option = boseongReviewFilterOptions.find((item) => item.key === filter);
  if (!option || !("programIds" in option)) return true;
  if (
    typeof review.programId === "number" &&
    (option.programIds as readonly number[]).includes(review.programId)
  ) {
    return true;
  }

  const reviewText = [review.badge, review.title, review.author].filter(Boolean).join(" ");
  return option.terms.some((term) => reviewText.includes(term));
}

export function BoseongFigmaHeader({
  activeHref,
  primaryProgram,
  village,
  variant = "inner",
}: {
  activeHref?: string;
  primaryProgram?: Program;
  variant?: "home" | "inner";
  village: Village;
}) {
  const applyHref = primaryProgram
    ? channelProgramPath(village.slug, primaryProgram.slug)
    : `${channelPath(village.slug)}/programs`;

  return (
    <header className="font-boseong relative z-40 border-b border-[#9d997e] bg-white text-[#171717]">
      <div className="flex h-8 items-center justify-center bg-[#4c8244] px-4 text-center text-xs font-extrabold text-white md:h-9 md:text-xl md:font-medium md:leading-[1.10696]">
        전남 보성군 청년마을 그린티모시레
      </div>
      <div
        className={`mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-6 md:relative md:block md:px-0 ${
          variant === "home" ? "md:h-[84px]" : "md:h-[76px]"
        }`}
      >
        <Link
          className="relative block h-[42px] w-[50px] shrink-0 md:absolute md:left-[66px] md:top-[13px] md:h-[56px] md:w-[67px]"
          href="/boseong"
        >
          <Image
            alt="전체차LAB"
            className="object-contain"
            fill
            priority
            sizes="67px"
            src={boseongAssets.logo}
          />
        </Link>

        <nav className="hidden items-end justify-end gap-[30px] text-xl font-semibold leading-[1.10696] tracking-normal text-[#393939] lg:absolute lg:left-[270px] lg:right-[26px] lg:top-[28px] lg:flex">
          {visibleBoseongNav.map((item) => (
            <Link
              className={`text-center hover:text-[#4c8244] ${
                activeHref === item.href ? "text-[#4c8244]" : ""
              }`}
              href={item.href}
              key={item.href}
              style={{ width: item.width }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          className="inline-flex h-10 items-center justify-center border border-[#4f813f] px-4 text-sm font-extrabold text-[#2f6b2e] hover:bg-[#4f813f] hover:text-white lg:hidden"
          href={applyHref}
        >
          신청
          <ArrowRight className="ml-2" size={15} />
        </Link>
      </div>
    </header>
  );
}

export function BoseongFigmaFooter({
  village,
}: {
  primaryProgram?: Program;
  village: Village;
}) {
  return (
    <footer className="font-boseong bg-[#e5e3da] text-[#151813]">
      <div className="mx-auto grid min-h-[340px] max-w-[1440px] items-center gap-8 px-6 py-14 md:min-h-[479px] md:grid-cols-[320px_1fr_160px] md:px-40">
        <Link className="relative block h-[120px] w-[142px] md:h-[206px] md:w-[242px]" href="/boseong">
          <Image
            alt="전체차LAB"
            className="object-contain"
            fill
            loading="eager"
            sizes="242px"
            src={boseongAssets.logoLarge}
          />
        </Link>

        <div className="text-lg font-extrabold leading-8 md:text-xl">
          <p>문의·신청·제안</p>
          <p>{village.contactEmail ?? "문의 준비 중"}</p>
          <p>{village.contactPhone ?? "061-000-2026"}</p>
        </div>

        <div className="flex items-center gap-3 md:self-start md:pt-2">
          <a
            aria-label="전체차LAB 인스타그램"
            className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#ffd76e] via-[#e6546d] to-[#5b5ce2] text-white"
            href={village.instagramUrl ?? "https://www.instagram.com/"}
            rel="noreferrer"
            target="_blank"
          >
            <InstagramMark />
          </a>
          <a
            aria-label="전체차LAB 카카오 채널"
            className="flex size-9 items-center justify-center rounded-full bg-[#f9df38] text-[#2b2018]"
            href={village.kakaoUrl ?? "https://pf.kakao.com/"}
            rel="noreferrer"
            target="_blank"
          >
            <KakaoTalkMark />
          </a>
        </div>
      </div>
    </footer>
  );
}

function InstagramMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect
        height="17"
        rx="5"
        stroke="currentColor"
        strokeWidth="2.2"
        width="17"
        x="3.5"
        y="3.5"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="17" cy="7" fill="currentColor" r="1.3" />
    </svg>
  );
}

function KakaoTalkMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-6"
      fill="none"
      viewBox="0 0 28 28"
    >
      <path
        d="M14 5C8.5 5 4 8.55 4 12.92c0 2.75 1.79 5.17 4.5 6.59l-.71 3.1c-.08.35.31.61.61.41l3.67-2.41c.62.11 1.26.17 1.93.17 5.52 0 10-3.55 10-7.86C24 8.55 19.52 5 14 5Z"
        fill="currentColor"
      />
    </svg>
  );
}

type BoseongHomeSectionFrame = (props: {
  children: ReactNode;
  label: string;
  sectionKey: string;
  visible: boolean;
}) => ReactNode;

type BoseongNotice = {
  date: string;
  href: string;
  title: string;
  type: string;
};

export function BoseongFigmaHomePage({
  media,
  pageSections,
  programs,
  reviews,
  sectionFrame,
  showHiddenSections = false,
  village,
}: {
  media: VillageMediaContent[];
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  reviews: Review[];
  sectionFrame?: BoseongHomeSectionFrame;
  showHiddenSections?: boolean;
  village: Village;
}) {
  const primaryProgram = programs[0];
  const heroSection = getSectionContent(pageSections, "home_hero", {
    alt: "녹차밭 옆에서 살아보는 진짜 보성",
    imageUrl: boseongAssets.hero,
  });
  const teaTimeSection = getSectionContent(pageSections, "home_tea_time", {
    alt: "차 한 잔으로 나를 살펴보는 시간",
    imageUrl: boseongAssets.teaTime,
    linkHref: "/boseong/media",
    linkLabel: "녹차밭 옆 이야기들",
    title: "녹차밭에서 피어나는 시간",
  });
  const mediaSection = getSectionContent(pageSections, "media_preview", {
    href: "/boseong/media",
    limit: 3,
    title: "전체차LAB 이야기",
  });
  const reviewSection = getSectionContent(pageSections, "reviews_preview", {
    href: "/boseong/reviews",
    limit: 8,
    title: "전체차LAB 후기",
  });
  const featuredMedia = media.slice(0, asNumber(mediaSection.limit, 3));
  const featuredReviews = reviews.slice(0, asNumber(reviewSection.limit, 8));
  const renderHomeSection = (sectionKey: string, children: ReactNode) => {
    const section = pageSections?.find((item) => item.sectionKey === sectionKey);
    const visible = section ? section.visible : true;
    const label = section?.label ?? sectionKey;
    const rendered = sectionFrame
      ? sectionFrame({ children, label, sectionKey, visible })
      : children;

    return <Fragment key={sectionKey}>{rendered}</Fragment>;
  };
  const renderedHomeSections = getOrderedHomeSectionKeys(pageSections).map((sectionKey) => {
    if (!showHiddenSections && !isPublishedSectionVisible(pageSections, sectionKey)) {
      return null;
    }

    if (sectionKey === "home_hero") {
      return renderHomeSection(
        sectionKey,
        <section className="mx-auto max-w-[1440px]">
          <Image
            alt={asString(heroSection.alt, "녹차밭 옆에서 살아보는 진짜 보성")}
            className="h-auto w-full"
            height={967}
            priority
            sizes="100vw"
            src={asString(heroSection.imageUrl, boseongAssets.hero)}
            width={1440}
          />
        </section>,
      );
    }

    if (sectionKey === "home_tea_time") {
      return renderHomeSection(
        sectionKey,
        <div>
          <section className="relative mx-auto mt-[35px] flex max-w-[1440px] items-center justify-between gap-4 px-6 py-9 md:h-[115px] md:px-0 md:py-0">
            <h1 className="text-2xl font-bold md:absolute md:left-[67px] md:top-[51px] md:text-[44px] md:leading-[1.10696]">
              {asCleanString(teaTimeSection.title, "녹차밭에서 피어나는 시간")}
            </h1>
            <span className="hidden border-t border-[#c6c6c6] md:absolute md:left-[532px] md:top-[67px] md:block md:w-[579px]" />
            <Link
              className="text-sm !font-semibold text-[#414840] hover:text-[#4f813f] md:absolute md:left-[1137px] md:top-[55px] md:!text-[32px] md:leading-[1.10696]"
              href={asString(teaTimeSection.linkHref, "/boseong/media")}
            >
              {asCleanString(teaTimeSection.linkLabel, "녹차밭 옆 이야기들")}
            </Link>
          </section>

          <section className="mx-auto mt-[35px] max-w-[1440px] bg-white px-0">
            <Image
              alt={asString(teaTimeSection.alt, "차 한 잔으로 나를 살펴보는 시간")}
              className="h-auto w-full"
              height={515}
              sizes="100vw"
              src={asString(teaTimeSection.imageUrl, boseongAssets.teaTime)}
              width={1024}
            />
          </section>
        </div>,
      );
    }

    if (sectionKey === "original_carousel") {
      return renderHomeSection(
        sectionKey,
        <HomeOriginalCta
          pageSections={pageSections}
          programs={programs}
        />,
      );
    }

    if (sectionKey === "media_preview") {
      return renderHomeSection(
        sectionKey,
        <BoseongHomeSection
          exact
          href={asString(mediaSection.href, "/boseong/media")}
          title={asString(mediaSection.title, "전체차LAB 이야기")}
        >
          <div className="grid gap-5 md:ml-[30px] md:grid-cols-[445px_445px_445px] md:gap-[23px]">
            {featuredMedia.map((item) => (
              <BoseongMediaPreviewCard
                content={item}
                exact
                key={item.id}
                thumbnailMode="aspectVideo"
              />
            ))}
          </div>
        </BoseongHomeSection>,
      );
    }

    if (sectionKey === "reviews_preview" && launchFeatureFlags.reviews) {
      return renderHomeSection(
        sectionKey,
        <BoseongHomeSection
          exact
          href={asString(reviewSection.href, "/boseong/reviews")}
          title={asString(reviewSection.title, "전체차LAB 후기")}
        >
          <div className="grid grid-cols-2 gap-0 md:mx-auto md:w-[1280px] md:grid-cols-[repeat(4,320px)]">
            {featuredReviews.map((review, index) => (
              <BoseongReviewTile exact index={index} key={review.id} review={review} />
            ))}
          </div>
        </BoseongHomeSection>,
      );
    }

    return null;
  });

  return (
    <div className="font-boseong bg-white text-[#141414]">
      <BoseongFigmaHeader
        primaryProgram={primaryProgram}
        variant="home"
        village={village}
      />

      <main>{renderedHomeSections}</main>

      <BoseongFigmaFooter primaryProgram={primaryProgram} village={village} />
    </div>
  );
}

export function BoseongFigmaAboutPage({
  pageSections,
  programs,
  sectionFrame,
  showHiddenSections = false,
  village,
}: {
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  sectionFrame?: BoseongHomeSectionFrame;
  showHiddenSections?: boolean;
  village: Village;
}) {
  const aboutHeader = getSectionContent(pageSections, "about_header", {
    brand: "전체차 LAB",
    kicker: "녹차밭 옆에서 살아보는",
    title: "진짜 보성",
  });
  const aboutGrid = getSectionContent(pageSections, "about_grid", {
    introBody: "전체차(全體茶)는 차(茶)로 모든 것을 담는다는 뜻입니다.",
    introTitle: "보성 청년마을, 전체차LAB",
    rows: [],
  });
  const renderAboutSection = (sectionKey: string, children: ReactNode) => {
    const section = pageSections?.find((item) => item.sectionKey === sectionKey);
    const visible = section ? section.visible : true;
    const label = section?.label ?? sectionKey;

    if (!showHiddenSections && !visible) {
      return null;
    }

    const rendered = sectionFrame
      ? sectionFrame({ children, label, sectionKey, visible })
      : children;

    return <Fragment key={sectionKey}>{rendered}</Fragment>;
  };

  return (
    <div className="font-boseong bg-white text-[#141414]">
      <BoseongFigmaHeader
        activeHref="/boseong/about"
        primaryProgram={programs[0]}
        village={village}
      />

      <main>
        {renderAboutSection(
          "about_header",
          <section className="relative flex min-h-[520px] items-center justify-center bg-[#dcd7d7] px-6 text-center text-white md:h-[832px] md:min-h-0">
          <h1 className="flex flex-col text-3xl font-semibold leading-tight md:absolute md:left-[621px] md:top-[363px] md:w-[719px] md:items-end md:text-right md:text-[74.4394px] md:leading-[1.10696]">
            <span className="md:whitespace-nowrap">
              {asString(aboutHeader.kicker, "녹차밭 옆에서 살아보는")}
            </span>
            <span>{asString(aboutHeader.title, "진짜 보성")}</span>
            <span className="mt-8 md:mt-[52px]">
              {asString(aboutHeader.brand, "전체차 LAB")}
            </span>
          </h1>
          </section>,
        )}

        {renderAboutSection(
          "about_grid",
          <>
            <section className="relative mx-auto max-w-[1440px] px-6 py-20 text-center md:h-[342px] md:px-0 md:py-0">
          <h2 className="text-2xl font-semibold text-[#1b1b1b] md:absolute md:left-0 md:top-[108px] md:w-full md:text-[47px] md:leading-[1.10696]">
            {asString(aboutGrid.introTitle, "보성 청년마을, 전체차LAB")}
          </h2>
          <p className="mt-4 text-base font-medium text-[#414840] md:absolute md:left-0 md:top-[209px] md:mt-0 md:w-full md:text-[36px] md:leading-[1.10696]">
            {asString(
              aboutGrid.introBody,
              "전체차(全體茶)는 차(茶)로 모든 것을 담는다는 뜻입니다.",
            )}
          </p>
            </section>

            <section className="relative mx-auto max-w-[1440px] px-6 md:h-[808px] md:px-0">
          <Image
            alt="전체차LAB 보성 지도"
            className="h-auto w-full md:absolute md:left-[103px] md:top-0 md:h-[762px] md:w-[1234px]"
            height={762}
            priority
            sizes="(max-width: 1234px) 100vw, 1234px"
            src={boseongAssets.map}
            width={1234}
          />
            </section>

            <section className="relative mx-auto max-w-[1440px] px-6 py-12 text-center md:h-[211px] md:px-0 md:py-0">
          <p className="whitespace-pre-line text-base font-medium leading-8 text-[#414840] md:absolute md:left-0 md:top-[60px] md:w-full md:text-[36px] md:leading-[1.10696]">
            {"차를 매개로 청년의 삶과  지역의 미래를 연결하는 \n실험이 보성 회천면에서 시작됩니다."}
          </p>
            </section>

            <section>
              <AboutGrid content={aboutGrid} />
            </section>
          </>,
        )}
      </main>

      <BoseongFigmaFooter primaryProgram={programs[0]} village={village} />
    </div>
  );
}

export function BoseongFigmaProgramsPage({
  pageSections,
  programs,
  sectionFrame,
  showHiddenSections = false,
  village,
}: {
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  sectionFrame?: BoseongHomeSectionFrame;
  showHiddenSections?: boolean;
  village: Village;
}) {
  const programsSection = getSectionContent(pageSections, "programs_index", {
    limit: 12,
    subtitle: "오직 전체차LAB에서만 피어나는 경험을 만나보세요.",
    title: "전체차LAB 오리지널",
  });
  const visible = isPublishedSectionVisible(pageSections, "programs_index");
  const label =
    pageSections?.find((item) => item.sectionKey === "programs_index")?.label ??
    "전체차LAB 오리지널";

  if (!showHiddenSections && !visible) {
    return (
      <div className="font-boseong bg-white text-[#141414]">
        <BoseongFigmaHeader
          activeHref="/boseong/programs"
          primaryProgram={programs[0]}
          village={village}
        />
        <BoseongFigmaFooter primaryProgram={programs[0]} village={village} />
      </div>
    );
  }

  const rendered = (
    <BoseongFigmaListFrame
      activeHref="/boseong/programs"
      primaryProgram={programs[0]}
      subtitle={asString(
        programsSection.subtitle,
        "오직 전체차LAB에서만 피어나는 경험을 만나보세요.",
      )}
      title={asString(programsSection.title, "전체차LAB 오리지널")}
      village={village}
    >
      <div className="mx-auto max-w-[948px] divide-y-[4px] divide-[#b3df00] border-b-[4px] border-[#b3df00]">
        {programs.slice(0, asNumber(programsSection.limit, programs.length)).map((program) => (
          <OriginalProgramRow key={`${program.id}-${program.slug}`} program={program} village={village} />
        ))}
      </div>
    </BoseongFigmaListFrame>
  );

  return sectionFrame ? (
    <Fragment>
      {sectionFrame({
        children: rendered,
        label,
        sectionKey: "programs_index",
        visible,
      })}
    </Fragment>
  ) : (
    rendered
  );
}

export function BoseongFigmaMediaIndexPage({
  media,
  pageSections,
  programs,
  sectionFrame,
  showHiddenSections = false,
  village,
}: {
  media: VillageMediaContent[];
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  sectionFrame?: BoseongHomeSectionFrame;
  showHiddenSections?: boolean;
  village: Village;
}) {
  const mediaSection = getSectionContent(pageSections, "media_index", {
    href: "/boseong/media",
    limit: 9,
    subtitle:
      "보성을 경험하는 새로운 방식, 전체차LAB의 이야기를 만나보세요.",
    title: "전체차LAB 이야기",
  });
  const visible = isPublishedSectionVisible(pageSections, "media_index");
  const label =
    pageSections?.find((item) => item.sectionKey === "media_index")?.label ??
    "전체차LAB 이야기";

  if (!showHiddenSections && !visible) {
    return (
      <div className="font-boseong bg-white text-[#141414]">
        <BoseongFigmaHeader
          activeHref="/boseong/media"
          primaryProgram={programs[0]}
          village={village}
        />
        <BoseongFigmaFooter primaryProgram={programs[0]} village={village} />
      </div>
    );
  }

  const rendered = (
    <BoseongFigmaListFrame
      activeHref="/boseong/media"
      compact
      primaryProgram={programs[0]}
      subtitle={asString(
        mediaSection.subtitle,
        "보성을 경험하는 새로운 방식, 전체차LAB의 이야기를 만나보세요.",
      )}
      title={asString(mediaSection.title, "전체차LAB 이야기")}
      village={village}
    >
      <div className="mx-auto grid max-w-[1380px] gap-y-12 md:grid-cols-[repeat(3,445px)] md:gap-x-6">
        {media.slice(0, asNumber(mediaSection.limit, 9)).map((content) => (
          <BoseongMediaPreviewCard
            content={content}
            exact
            key={content.id}
            thumbnailMode="aspectVideo"
          />
        ))}
      </div>
    </BoseongFigmaListFrame>
  );

  return sectionFrame ? (
    <Fragment>
      {sectionFrame({
        children: rendered,
        label,
        sectionKey: "media_index",
        visible,
      })}
    </Fragment>
  ) : (
    rendered
  );
}

export function BoseongFigmaMediaAspectIndexPage({
  media,
  programs,
  village,
}: {
  media: VillageMediaContent[];
  programs: Program[];
  village: Village;
}) {
  return (
    <BoseongFigmaListFrame
      activeHref="/boseong/media"
      compact
      primaryProgram={programs[0]}
      subtitle="16:9 썸네일 비율을 우선한 미디어 카드 실험입니다."
      title="전체차LAB 이야기"
      village={village}
    >
      <div className="mx-auto grid max-w-[1380px] gap-y-12 md:grid-cols-[repeat(3,445px)] md:gap-x-6">
        {media.slice(0, 9).map((content) => (
          <BoseongMediaPreviewCard
            content={content}
            exact
            key={content.id}
            thumbnailMode="aspectVideo"
          />
        ))}
      </div>
    </BoseongFigmaListFrame>
  );
}

export function BoseongFigmaReviewsPage({
  pageSections,
  programs,
  reviewFilter,
  reviews,
  sectionFrame,
  showHiddenSections = false,
  village,
}: {
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  reviewFilter?: string;
  reviews: Review[];
  sectionFrame?: BoseongHomeSectionFrame;
  showHiddenSections?: boolean;
  village: Village;
}) {
  const activeFilter = normalizeBoseongReviewFilter(reviewFilter);
  const visibleReviews = reviews.filter((review) =>
    matchesBoseongReviewFilter(review, activeFilter),
  );
  const reviewsSection = getSectionContent(pageSections, "reviews_index", {
    limit: 20,
    subtitle: "보성에서 시간이 머무른 마음을 담았습니다.",
    title: "전체차LAB 후기",
  });
  const visible = isPublishedSectionVisible(pageSections, "reviews_index");
  const label =
    pageSections?.find((item) => item.sectionKey === "reviews_index")?.label ??
    "전체차LAB 후기";

  if (!showHiddenSections && !visible) {
    return (
      <div className="font-boseong bg-white text-[#141414]">
        <BoseongFigmaHeader
          activeHref="/boseong/reviews"
          primaryProgram={programs[0]}
          village={village}
        />
        <BoseongFigmaFooter primaryProgram={programs[0]} village={village} />
      </div>
    );
  }

  const rendered = (
    <BoseongFigmaListFrame
      activeHref="/boseong/reviews"
      primaryProgram={programs[0]}
      subtitle={asString(
        reviewsSection.subtitle,
        "보성에서 시간이 머무른 마음을 담았습니다.",
      )}
      title={asString(reviewsSection.title, "전체차LAB 후기")}
      village={village}
    >
      <div className="mx-auto mb-[22px] flex max-w-[1328px] flex-wrap gap-6 text-[#535353]">
        {boseongReviewFilterOptions.map((option) => {
          const isActive = option.key === activeFilter;

          return (
            <Link
              className={`pb-2 !text-[26px] !font-semibold leading-none transition hover:text-[#171717] ${
                isActive ? "border-b-2 border-[#55883f] text-[#171717]" : ""
              }`}
              href={option.href}
              key={option.key}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
      <div className="mx-auto grid max-w-[1328px] grid-cols-2 gap-[6px] md:grid-cols-4">
        {visibleReviews.slice(0, asNumber(reviewsSection.limit, 20)).map((review, index) => (
          <BoseongReviewTile exact index={index} key={review.id} review={review} />
        ))}
      </div>
    </BoseongFigmaListFrame>
  );

  return sectionFrame ? (
    <Fragment>
      {sectionFrame({
        children: rendered,
        label,
        sectionKey: "reviews_index",
        visible,
      })}
    </Fragment>
  ) : (
    rendered
  );
}

export function BoseongFigmaNoticePage({
  notices,
  pageSections,
  programs,
  sectionFrame,
  showHiddenSections = false,
  village,
}: {
  notices: BoseongNotice[];
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  sectionFrame?: BoseongHomeSectionFrame;
  showHiddenSections?: boolean;
  village: Village;
}) {
  const noticeSection = getSectionContent(pageSections, "notice_index", {
    limit: 20,
    subtitle: "신청, 일정, 운영 안내를 한곳에서 확인하세요.",
    title: "전체차LAB 소식",
  });
  const visible = isPublishedSectionVisible(pageSections, "notice_index");
  const label =
    pageSections?.find((item) => item.sectionKey === "notice_index")?.label ??
    "전체차LAB 소식";

  if (!showHiddenSections && !visible) {
    return (
      <div className="font-boseong bg-white text-[#141414]">
        <BoseongFigmaHeader
          activeHref="/boseong/notice"
          primaryProgram={programs[0]}
          village={village}
        />
        <BoseongFigmaFooter primaryProgram={programs[0]} village={village} />
      </div>
    );
  }

  const rendered = (
    <BoseongFigmaListFrame
      activeHref="/boseong/notice"
      primaryProgram={programs[0]}
      subtitle={asString(
        noticeSection.subtitle,
        "신청, 일정, 운영 안내를 한곳에서 확인하세요.",
      )}
      title={asString(noticeSection.title, "전체차LAB 소식")}
      village={village}
    >
      <div className="mx-auto max-w-[948px] divide-y-[4px] divide-[#b3df00] border-y-[4px] border-[#b3df00]">
        {notices.slice(0, asNumber(noticeSection.limit, 20)).map((notice) => (
          <Link
            className="grid gap-3 px-4 py-6 text-[#171717] transition hover:bg-[#f6f9ec] md:grid-cols-[150px_minmax(0,1fr)_140px] md:items-center"
            href={notice.href}
            key={`${notice.type}-${notice.title}`}
          >
            <span className="text-[18px] font-extrabold text-[#55883f]">
              [{notice.type}]
            </span>
            <span className="min-w-0 text-[24px] font-extrabold leading-[1.25]">
              {notice.title}
            </span>
            <span className="text-left text-[18px] font-bold text-[#535353] md:text-right">
              {formatDate(notice.date)}
            </span>
          </Link>
        ))}
      </div>
    </BoseongFigmaListFrame>
  );

  return sectionFrame ? (
    <Fragment>
      {sectionFrame({
        children: rendered,
        label,
        sectionKey: "notice_index",
        visible,
      })}
    </Fragment>
  ) : (
    rendered
  );
}

export function BoseongFigmaMediaDetailPage({
  content,
  media,
  programs,
  village,
}: {
  content: VillageMediaContent;
  media: VillageMediaContent[];
  programs: Program[];
  village: Village;
}) {
  const related = media.filter((item) => item.id !== content.id).slice(0, 3);
  const isPortrait = content.provider === "instagram";

  return (
    <BoseongFigmaListFrame
      activeHref="/boseong/media"
      primaryProgram={programs[0]}
      subtitle={content.sourceName}
      title={content.title}
      village={village}
    >
      <article className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div
            className={
              isPortrait
                ? "relative mx-auto aspect-[9/16] max-h-[760px] w-full max-w-[430px] overflow-hidden bg-black"
                : "relative aspect-video overflow-hidden bg-black"
            }
          >
            {content.embedUrl ? (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
                referrerPolicy="strict-origin-when-cross-origin"
                src={content.embedUrl}
                title={content.title}
              />
            ) : (
              <Image
                alt={content.title}
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1120px) 100vw, 760px"
                src={content.thumbnail}
              />
            )}
          </div>
          <div className="border-x border-b border-[#dedbd1] bg-white px-6 py-7">
            <p className="text-sm font-bold text-[#63824a]">
              {formatDate(content.date)} · {mediaCategoryLabels[content.category]}
            </p>
            <p className="mt-5 text-lg font-bold leading-8">{content.summary}</p>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#414141]">
              {content.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <a
              className="mt-8 inline-flex h-11 items-center justify-center gap-2 border border-[#4f813f] px-4 text-sm font-extrabold text-[#2f6b2e] hover:bg-[#4f813f] hover:text-white"
              href={content.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              원문 보기
              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        <aside className="space-y-4">
          <Link
            className="flex items-center justify-between border border-[#dedbd1] bg-white px-4 py-4 text-sm font-extrabold hover:border-[#4f813f]"
            href="/boseong/media"
          >
            전체차 이야기 목록
            <ArrowRight size={15} />
          </Link>
          {related.length > 0 ? (
            <div className="border border-[#dedbd1] bg-white p-4">
              <h2 className="text-sm font-extrabold">다른 이야기</h2>
              <div className="mt-4 space-y-3">
                {related.map((item) => (
                  <Link
                    className="block text-sm font-bold leading-6 text-[#414141] hover:text-[#4f813f]"
                    href={`/boseong/media/${item.id}`}
                    key={item.id}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </article>
    </BoseongFigmaListFrame>
  );
}

function BoseongFigmaListFrame({
  activeHref,
  children,
  compact = true,
  hideTitle = false,
  primaryProgram,
  subtitle,
  title,
  village,
}: {
  activeHref?: string;
  children: React.ReactNode;
  compact?: boolean;
  hideTitle?: boolean;
  primaryProgram?: Program;
  subtitle: string;
  title: string;
  village: Village;
}) {
  return (
    <div className="font-boseong bg-white text-[#141414]">
      <BoseongFigmaHeader
        activeHref={activeHref}
        primaryProgram={primaryProgram}
        village={village}
      />
      <main>
        <section
          className={`mx-auto max-w-[1440px] px-6 text-center md:px-20 ${
            hideTitle
              ? "pb-10 pt-8 md:pb-10 md:pt-9"
              : compact
                ? "pb-8 pt-12 md:pb-8 md:pt-14"
                : "pb-14 pt-20 md:pb-20 md:pt-28"
          }`}
        >
          {hideTitle ? null : (
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] md:text-[36px]">
              {title}
            </h1>
          )}
          <p
            className={`text-base font-medium text-[#4f4f4f] ${
              hideTitle ? "md:text-[30px] md:leading-[1.2]" : "mt-6 md:text-xl"
            }`}
          >
            {subtitle}
          </p>
        </section>
        <section
          className={`px-6 pb-28 md:px-[30px] ${
            compact ? "md:pt-4" : "md:pt-[52px]"
          }`}
        >
          {children}
        </section>
      </main>
      <BoseongFigmaFooter primaryProgram={primaryProgram} village={village} />
    </div>
  );
}

function HomeOriginalCta({
  pageSections,
  programs,
}: {
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
}) {
  const hrefBySlug = (slug: string) => {
    const program = programs.find((item) => item.slug === slug);

    return program ? channelProgramPath("boseong", program.slug) : "/boseong/programs";
  };

  const content = getSectionContent(pageSections, "original_carousel", {
    heading: "JEONCHECHA ORIGINAL",
    slides: [],
  });
  const defaultSlides: BoseongOriginalSlide[] = [
    {
      body:
        "보성에 머무는 시간 동안 나의 재능을 지역과 나누고,\n숙소와 마을을 자연스럽게 오가는 체류 프로그램입니다.",
      hashtags: "#재능교환 #보성살이 #숙박비는재능으로",
      href: hrefBySlug("talent-for-stay"),
      title: "숙박비는\n재능으로 받습니다.",
    },
    {
      body:
        "차를 좋아한다는 것만으로 이렇게 가까워질 수 있어요.\n낯선 사람과 차 한 잔을 나누다 보면 어느새 보성의 밤이 깊어집니다.",
      hashtags: "#차담 #보성여행 #차한잔의인연",
      href: hrefBySlug("local-salon"),
      title: "로컬살롱",
    },
    {
      body:
        "내가 좋아하는 향, 내가 좋아하는 맛,\n내가 고른 찻잎으로 나만의 차 한 잔을 만듭니다.\n차 한 잔에 나를 담아보세요.",
      hashtags: "#나만의차 #차블렌딩 #차실험실",
      href: hrefBySlug("tea-lab"),
      title: "나를 담는\n차실험",
    },
  ];
  const slides = normalizeOriginalSlides(content.slides, hrefBySlug, defaultSlides);

  return (
    <section className="relative mt-[35px] overflow-hidden bg-[#b3df00] md:h-[907px] md:bg-transparent">
      <div className="mx-auto max-w-[1440px] px-6 pb-14 pt-10 md:relative md:h-full md:px-0 md:py-0">
        <p className="pointer-events-none select-none text-[44px] font-black leading-none tracking-[-0.06em] text-[#b3df00] [text-shadow:0_-1px_0_#000] md:absolute md:left-[76px] md:top-[43px] md:z-10 md:text-[108px] md:leading-[76px]">
          {asString(content.heading, "JEONCHECHA ORIGINAL")}
        </p>
        <div className="absolute inset-x-0 bottom-0 top-[119px] hidden bg-[#b3df00] md:block" />
        <BoseongOriginalCarousel logoSrc={boseongAssets.logo} slides={slides} />
      </div>
    </section>
  );
}

function BoseongHomeSection({
  children,
  exact = false,
  href,
  title,
}: {
  children: React.ReactNode;
  exact?: boolean;
  href: string;
  title: string;
}) {
  if (exact) {
    const isReviews = title.includes("후기");

    return (
      <section className="mx-auto mt-[35px] max-w-[1440px]">
        <div className="relative h-[110px]">
          <h2 className="absolute left-[56px] top-[65px] text-[44px] font-extrabold leading-[31px]">
            {title}
          </h2>
          <div
            className={`absolute right-[56px] top-[51px] flex h-[59px] items-center justify-end ${
              isReviews ? "left-[370px]" : "left-[408px]"
            }`}
          >
            <Link
              className="text-sm !font-semibold leading-[1.10696] text-[#414840] hover:text-[#4f813f] md:!text-[32px]"
              href={href}
            >
              + 더보기
            </Link>
          </div>
        </div>
        <div className="mt-[35px]">{children}</div>
        {isReviews ? <div className="hidden h-[120px] md:block" /> : null}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] px-6 py-16 md:px-40">
      <div className="mb-10 flex items-center justify-between">
        <h2 className="text-2xl font-extrabold md:text-[28px]">{title}</h2>
        <Link className="text-sm font-bold hover:text-[#4f813f]" href={href}>
          + 더보기
        </Link>
      </div>
      {children}
    </section>
  );
}

function BoseongMediaPreviewCard({
  content,
  exact = false,
  thumbnailMode = "fixed",
}: {
  content: VillageMediaContent;
  exact?: boolean;
  thumbnailMode?: "fixed" | "aspectVideo";
}) {
  const shouldPreserveThumbnailRatio = content.provider === "youtube";
  const useAspectVideoThumb = thumbnailMode === "aspectVideo";

  return (
    <article
      className={`group bg-white ${
        exact ? `${useAspectVideoThumb ? "md:w-[445px]" : "md:h-[671px] md:w-[445px]"}` : ""
      }`}
    >
      <Link
        className={`relative block overflow-hidden ${
          shouldPreserveThumbnailRatio && !useAspectVideoThumb ? "bg-[#050505]" : "bg-[#d9d9d9]"
        } ${
          useAspectVideoThumb
            ? "aspect-video border-b-2 border-[#b1d014]"
            : exact
              ? "h-[320px] border-b-2 border-[#b1d014] md:h-[487px]"
              : "aspect-[1.16]"
        }`}
        href={`/boseong/media/${content.id}`}
      >
        {shouldPreserveThumbnailRatio && !useAspectVideoThumb ? (
          <Image
            alt=""
            aria-hidden="true"
            className="z-0 scale-110 object-cover opacity-45 blur-md"
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            src={content.thumbnail}
          />
        ) : null}
        <Image
          alt={content.title}
          className={
            shouldPreserveThumbnailRatio && !useAspectVideoThumb
              ? "z-10 object-contain"
              : "object-cover transition duration-500 group-hover:scale-105"
          }
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          src={content.thumbnail}
        />
        {exact ? null : (
          <span className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-[#4f813f]">
            <Play size={16} fill="currentColor" />
          </span>
        )}
      </Link>
      <div className={exact ? "relative h-[159px] border-x border-b border-[#d9d9d9] px-[29px] pt-4" : "py-5"}>
        {exact ? null : (
          <p className="text-xs font-extrabold text-[#55883f]">
            {mediaCategoryLabels[content.category]}
          </p>
        )}
        <Link href={`/boseong/media/${content.id}`}>
          <h3
            className={
              exact
                ? "line-clamp-3 max-w-[240px] text-[29px] font-semibold leading-[1.10696] hover:text-[#4f813f]"
                : "mt-3 line-clamp-2 text-lg font-extrabold leading-6 hover:text-[#4f813f]"
            }
          >
            {content.title}
          </h3>
        </Link>
        {exact ? (
          <span className="absolute right-4 top-[86px] flex size-11 items-center justify-center text-[#d9d9d9]">
            {content.provider === "instagram" ? (
              <Camera size={34} strokeWidth={2.4} />
            ) : (
              <span className="flex h-[34px] w-11 items-center justify-center rounded-md bg-[#d9d9d9] text-white">
                <Play size={17} fill="currentColor" />
              </span>
            )}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function BoseongReviewTile({
  exact = false,
  index,
  review,
}: {
  exact?: boolean;
  index: number;
  review: Review;
}) {
  const mobileDark = (Math.floor(index / 2) + (index % 2)) % 2 === 1;
  const desktopDark = (Math.floor(index / 4) + (index % 4)) % 2 === 1;
  const colorClass = exact
    ? `${mobileDark ? "bg-[#102c06] text-white" : "bg-[#cfe597] text-[#000000]"} ${
        desktopDark
          ? "md:bg-[#102c06] md:text-white"
          : "md:bg-[#cfe597] md:text-[#000000]"
      }`
    : index % 2 === 1
      ? "bg-[#102c06] text-white"
      : "bg-[#cfe597] text-[#000000]";

  return (
    <Link
      className={`relative block transition hover:brightness-95 ${
        exact ? "h-[180px] md:h-[320px]" : "aspect-square p-6"
      } ${colorClass}`}
      href={`/boseong/reviews/${review.id}`}
    >
      {exact ? (
        <>
          <p className="absolute left-[26px] top-[116px] text-[16px] font-bold leading-[1.10696] md:top-[206px] md:text-[24px]">
            #{review.badge ?? "전체차LAB 후기"}
          </p>
          <h3 className="absolute left-[26px] top-[145px] line-clamp-1 max-w-[260px] text-[13px] font-medium leading-[1.10696] md:top-[247px] md:text-[18px]">
            {review.title}
          </h3>
        </>
      ) : (
        <>
          <p className="text-sm font-extrabold">#{review.badge ?? "전체차LAB 후기"}</p>
          <h3 className="mt-4 line-clamp-3 text-base font-extrabold leading-6">
            {review.title}
          </h3>
          <p className="mt-4 text-xs font-bold opacity-70">{review.author}</p>
        </>
      )}
    </Link>
  );
}

function OriginalProgramRow({
  program,
  village,
}: {
  program: Program;
  village: Village;
}) {
  const display = originalProgramDisplay[program.slug] ?? {
    activityRange: `${formatDate(program.activityStart)} - ${formatDate(program.activityEnd)}`,
    location: `${program.region} ${program.city}`,
    status: program.status === "closed" || program.status === "earlyClosed" ? "마감" : "모집",
    summary: program.summary,
    title: program.title,
  };
  const isOpen = display.status === "모집";

  return (
    <article className="grid gap-6 py-8 md:h-[238px] md:grid-cols-[213px_213px_minmax(0,1fr)] md:items-center md:gap-x-5 md:px-5 md:py-0">
      <div>
        <span
          className={`inline-flex h-[22px] items-center justify-center rounded-[4px] border px-[9px] text-[11px] font-extrabold leading-none ${
            isOpen
              ? "border-[#4f813f] bg-[#4f813f] text-white"
              : "border-[#cfd8bd] bg-[#eef3e4] text-[#5d7140]"
          }`}
        >
          {display.status}
        </span>
        <h2 className="mt-[18px] max-w-[210px] whitespace-pre-line text-[25px] font-extrabold leading-[1.16] tracking-normal text-[#171717] md:text-[28px] md:leading-[1.16]">
          {display.title}
        </h2>
        <Link
          className="mt-[17px] inline-flex h-[24px] items-center justify-center rounded-[3px] border border-[#4f813f] px-[13px] text-[11px] font-extrabold leading-none text-[#2f6b2e] hover:bg-[#4f813f] hover:text-white md:h-[25px]"
          href={channelProgramPath(village.slug, program.slug)}
        >
          신청하기
        </Link>
      </div>
      <div className="h-[213px] w-full bg-[#d9d9d9] md:w-[213px]" aria-hidden="true" />
      <div className="grid content-center gap-[29px] text-[#5d7140] md:min-h-[213px]">
        <p className="max-w-[460px] whitespace-pre-line text-[19px] font-extrabold leading-[1.48] text-[#222222] md:text-[21px] md:leading-[1.42]">
          {display.summary}
        </p>
        <div className="space-y-[8px] text-[20px] font-extrabold leading-[1.25] text-[#5d7140] md:text-[22px]">
          <p className="flex items-center gap-[14px]">
            <MapPin className="shrink-0 fill-[#5d7140] text-[#5d7140]" size={24} strokeWidth={3} />
            {display.location}
          </p>
          <p className="flex items-center gap-[14px]">
            <CalendarDays className="shrink-0 text-[#5d7140]" size={24} strokeWidth={3} />
            {display.activityRange}
          </p>
        </div>
      </div>
    </article>
  );
}

function isPublishedSectionVisible(
  sections: PublishedVillagePageSection[] | undefined,
  sectionKey: string,
): boolean {
  const section = sections?.find((item) => item.sectionKey === sectionKey);
  return section ? section.visible : true;
}

function getOrderedHomeSectionKeys(
  sections: PublishedVillagePageSection[] | undefined,
): string[] {
  const fallback = [
    "home_hero",
    "home_tea_time",
    "original_carousel",
    "media_preview",
    "reviews_preview",
  ];

  if (!sections || sections.length === 0) {
    return fallback;
  }

  const knownKeys = new Set(fallback);
  const orderedKeys = sections
    .filter((section) => section.pageKey === "home" && knownKeys.has(section.sectionKey))
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((section) => section.sectionKey);

  for (const key of fallback) {
    if (!orderedKeys.includes(key)) {
      orderedKeys.push(key);
    }
  }

  return orderedKeys;
}

function normalizeOriginalSlides(
  value: unknown,
  hrefBySlug: (slug: string) => string,
  fallback: BoseongOriginalSlide[],
): BoseongOriginalSlide[] {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }

  const slides = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;

      const record = item as Record<string, unknown>;
      const title = asString(record.title);
      const body = asString(record.body);

      if (!title || !body) return undefined;

      const programSlug = asString(record.programSlug);

      return {
        body,
        hashtags: asString(record.hashtags),
        href: asString(record.href) || (programSlug ? hrefBySlug(programSlug) : "/boseong/programs"),
        title,
      } satisfies BoseongOriginalSlide;
    })
    .filter((slide): slide is BoseongOriginalSlide => Boolean(slide));

  return slides.length > 0 ? slides : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asCleanString(value: unknown, fallback = ""): string {
  const text = asString(value);

  return text && !/[\uFFFD\u00C2\u00BF]/.test(text) ? text : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function AboutGrid({ content }: { content?: Record<string, unknown> }) {
  const defaultRows = [
    {
      bodyTop: 275,
      title: "보성의 차 문화를 \n실험하는 청년마을 ",
      body:
        "전체차LAB은 \n전남 보성군 회천면 양동·영천마을에 \n뿌리를 두고 있습니다. \n보성의 차 문화를 매개로 청년들이 지역에 \n머물며 콘텐츠, 제품, 경험을 즐겁게 실험하며 \n지역에서 새로운 청년의 삶을 만들고 있습니다.",
      icon: {
        height: 146,
        left: 505,
        src: boseongAssets.aboutIcons[0],
        top: 82,
        width: 86,
      },
    },
    {
      bodyTop: 275,
      title: "연고도 없던\n보성에 반하다",
      body:
        "도심에서 각자의 삶을 살던 2030 청년들이\n연고도 경험도 없던 보성의 매력에 반해\n귀촌을 선택했습니다.\n비슷한 성향의 사람들과 오순도순 모여\n살고 싶다는 바람으로 차를 매개로\n청년의 삶과 지역의 미래를 연결하는\n마을을 그리기 시작했어요.",
      icon: {
        height: 128,
        left: 765,
        src: boseongAssets.aboutIcons[1],
        top: 494,
        width: 206,
      },
    },
    {
      bodyTop: 231,
      title: "그린티모시레",
      body:
        "그린티는 녹차,\n모시레는 전남 방언으로 마을을 뜻합니다. \n보성의 녹차마을에 뿌리를 내리고\n활동을 이어가겠다는 다짐을 담아 만든 청년단체로,\n2025년부터 전체차LAB을 운영하고 있습니다.",
      icon: {
        height: 119,
        left: 81,
        src: boseongAssets.aboutIcons[2],
        top: 490,
        width: 240,
      },
    },
    {
      bodyTop: 231,
      title: "보성 회천면 곳곳에서",
      body:
        "마을 빈집과 창고를 리모델링해 \n우리만의 공간을 만들었습니다.\n숙소 공간 초록, 게스트만을 위한 작은 찻집\n머문 공간, 그리고 재료와 영감을 제공하는\n57ha 녹차밭까지\n보성 회천면 곳곳이 전체차LAB의 현장입니다.",
      icon: {
        height: 138,
        left: 1201,
        src: boseongAssets.aboutIcons[3],
        top: 494,
        width: 195,
      },
    },
    {
      bodyTop: 275,
      title: "차를 더 새롭게,\n보성을 더 색다르게",
      body:
        "지역에서 살아가는 청년들의 이야기를 \n영상 콘텐츠로 기록하고, 청년 로컬 크리에이터가 머물고 \n활동할 수 있는 프로그램을 운영합니다. \n차를 더 새롭게, \n보성을 더 색다르게 즐기는 방법을 지금도 실험 중입니다.",
      icon: {
        height: 129,
        left: 381,
        src: boseongAssets.aboutIcons[4],
        top: 494,
        width: 289,
      },
    },
  ];
  const rows = normalizeAboutRows(content?.rows, defaultRows);

  return (
    <div className="mx-auto w-full md:w-[1440px]">
      {rows.map((row, index) => {
        const flip = index % 2 === 1;

        return (
          <section
            className="relative grid min-h-[520px] bg-[#fdfdfd] md:h-[664px] md:min-h-0 md:w-[1440px] md:grid-cols-[724px_716px]"
            key={row.title}
          >
            {flip ? <div className="bg-[#d9d9d9]" /> : null}
            <div className="flex items-start px-8 py-16 md:px-0 md:py-0">
              <div
                className={
                  flip
                    ? "md:absolute md:left-[814px] md:top-[120px] md:w-[517px] md:text-right"
                    : "md:absolute md:left-[115px] md:top-[120px] md:w-[609px]"
                }
              >
                <h2 className="whitespace-pre-line text-2xl font-semibold leading-tight text-[#414840] md:text-[36px] md:leading-[1.22]">
                  {row.title}
                </h2>
                <p
                  className={`mt-8 whitespace-pre-line text-base font-medium leading-8 md:absolute md:left-0 md:mt-0 md:w-full md:text-[26px] md:leading-[1.38] ${
                    flip ? "text-[#000000]" : "text-[#414840]"
                  }`}
                  style={{ top: row.bodyTop - 120 }}
                >
                  {row.body}
                </p>
              </div>
            </div>
            {flip ? null : <div className="bg-[#d9d9d9]" />}
            <Image
              alt=""
              aria-hidden
              className="pointer-events-none absolute hidden md:block"
              height={row.icon.height}
              loading="eager"
              src={row.icon.src}
              style={{
                height: row.icon.height,
                left: row.icon.left,
                top: row.icon.top,
                width: row.icon.width,
              }}
              width={row.icon.width}
            />
          </section>
        );
      })}
    </div>
  );
}

function normalizeAboutRows(
  value: unknown,
  fallback: Array<{
    body: string;
    bodyTop: number;
    icon: {
      height: number;
      left: number;
      src: string;
      top: number;
      width: number;
    };
    title: string;
  }>,
): typeof fallback {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }

  return fallback.map((row, index) => {
    const item = value[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return row;
    }

    const record = item as Record<string, unknown>;

    return {
      ...row,
      body: asString(record.body, row.body),
      icon: {
        ...row.icon,
        src: asString(record.iconSrc, row.icon.src),
      },
      title: asString(record.title, row.title),
    };
  });
}
