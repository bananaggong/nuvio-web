import Image from "next/image";
import Link from "next/link";
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
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatRange, getDday } from "@/lib/format";
import { villagePath, villageProgramPath } from "@/lib/village-routing";
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
  { label: "전체차LAB", href: "/boseong", width: 117 },
  { label: "전체차 오리지널", href: "/boseong/programs", width: 164 },
  { label: "전체차 이야기", href: "/boseong/media", width: 141 },
  { label: "전체차 후기", href: "/boseong/reviews", width: 119 },
  { label: "전체차 소식", href: "/boseong/notice", width: 119 },
];

const mediaCategoryLabels: Record<VillageMediaContent["category"], string> = {
  original: "자체 콘텐츠",
  broadcast: "방송출연",
  archive: "아카이브",
};

export function BoseongFigmaHeader({
  primaryProgram,
  village,
  variant = "inner",
}: {
  primaryProgram?: Program;
  variant?: "home" | "inner";
  village: Village;
}) {
  const applyHref = primaryProgram
    ? villageProgramPath(village.slug, primaryProgram.slug)
    : `${villagePath(village.slug)}/programs`;

  return (
    <header className="font-boseong relative z-40 border-b border-[#e2dfd2] bg-white text-[#171717]">
      <div className="flex h-11 items-center justify-center bg-[#4f813f] px-4 text-center text-sm font-extrabold text-white md:h-[63px] md:text-[34px] md:font-medium md:leading-[24px]">
        전남 보성군 청년마을 그린티모시레
      </div>
      <div
        className={`mx-auto flex h-24 max-w-[1440px] items-center justify-between gap-6 px-6 md:relative md:block md:px-0 ${
          variant === "home" ? "md:h-[210px]" : "md:h-[174px]"
        }`}
      >
        <Link
          className="relative block h-[62px] w-[74px] shrink-0 md:absolute md:left-[66px] md:top-[35px] md:h-[104px] md:w-[122px]"
          href="/boseong"
        >
          <Image
            alt="전체차LAB"
            className="object-contain"
            fill
            priority
            sizes="122px"
            src={boseongAssets.logo}
          />
        </Link>

        <nav className="hidden items-center justify-end gap-[38px] text-[18px] font-extrabold leading-[18px] tracking-[-0.01em] text-[#2c2c2c] lg:absolute lg:left-[386px] lg:right-[26px] lg:top-[78px] lg:flex">
          {boseongNav.map((item) => (
            <Link
              className="text-center hover:text-[#4f813f]"
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
    <footer className="font-boseong bg-[#e9e6dc] text-[#151813]">
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
          <p>{village.contactEmail ?? "hello@nuvio.kr"}</p>
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
            <Camera size={18} />
          </a>
          <a
            aria-label="전체차LAB 카카오 채널"
            className="flex size-9 items-center justify-center rounded-full bg-[#f9df38] text-sm font-black text-[#2b2018]"
            href={village.kakaoUrl ?? "https://pf.kakao.com/"}
            rel="noreferrer"
            target="_blank"
          >
            ch
          </a>
        </div>
      </div>
    </footer>
  );
}

export function BoseongFigmaHomePage({
  media,
  programs,
  reviews,
  village,
}: {
  media: VillageMediaContent[];
  programs: Program[];
  reviews: Review[];
  village: Village;
}) {
  const primaryProgram = programs[0];
  const featuredMedia = media.slice(0, 3);
  const featuredReviews = reviews.slice(0, 8);

  return (
    <div className="font-boseong bg-white text-[#141414]">
      <BoseongFigmaHeader
        primaryProgram={primaryProgram}
        variant="home"
        village={village}
      />

      <main>
        <section className="mx-auto max-w-[1440px]">
          <Image
            alt="녹차밭 옆에서 살아보는 진짜 보성"
            className="h-auto w-full"
            height={967}
            priority
            sizes="100vw"
            src={boseongAssets.hero}
            width={1440}
          />
        </section>

        <section className="relative mx-auto mt-[35px] flex max-w-[1440px] items-center justify-between gap-4 px-6 py-9 md:h-[115px] md:px-0 md:py-0">
          <h1 className="text-2xl font-extrabold md:absolute md:left-[67px] md:top-[51px] md:text-[44px] md:leading-[31px]">
            녹차밭에서 피어나는 시간
          </h1>
          <span className="hidden border-t border-[#c6c6c6] md:absolute md:left-[532px] md:top-[67px] md:block md:w-[579px]" />
          <Link
            className="text-sm font-bold text-[#444] hover:text-[#4f813f] md:absolute md:left-[1137px] md:top-[55px] md:text-[32px] md:font-semibold md:leading-[23px]"
            href="/boseong/media"
          >
            녹차밭 옆 이야기들
          </Link>
        </section>

        <section className="mx-auto mt-[35px] max-w-[1440px] bg-white px-0">
          <Image
            alt="차 한 잔으로 나를 살펴보는 시간"
            className="h-auto w-full"
            height={515}
            sizes="100vw"
            src={boseongAssets.teaTime}
            width={1024}
          />
        </section>

        <HomeOriginalCta programs={programs} />

        <BoseongHomeSection
          exact
          href="/boseong/media"
          title="전체차LAB 이야기"
        >
          <div className="grid gap-5 md:ml-[30px] md:grid-cols-[445px_445px_445px] md:gap-[23px]">
            {featuredMedia.map((item) => (
              <BoseongMediaPreviewCard content={item} exact key={item.id} />
            ))}
          </div>
        </BoseongHomeSection>

        <BoseongHomeSection
          exact
          href="/boseong/reviews"
          title="전체차LAB 후기"
        >
          <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
            {featuredReviews.map((review, index) => (
              <BoseongReviewTile exact index={index} key={review.id} review={review} />
            ))}
          </div>
        </BoseongHomeSection>
      </main>

      <BoseongFigmaFooter primaryProgram={primaryProgram} village={village} />
    </div>
  );
}

export function BoseongFigmaAboutPage({
  programs,
  village,
}: {
  programs: Program[];
  village: Village;
}) {
  return (
    <div className="font-boseong bg-white text-[#141414]">
      <BoseongFigmaHeader primaryProgram={programs[0]} village={village} />

      <main>
        <section className="relative flex min-h-[520px] items-center justify-center bg-[#d7d2d2] px-6 text-center text-white md:h-[832px] md:min-h-0">
          <div className="md:absolute md:left-[621px] md:top-[363px] md:w-[719px] md:text-left">
            <p className="text-3xl font-semibold leading-tight md:text-[74px] md:leading-[1.1]">
              녹차밭 옆에서 살아보는
            </p>
            <h1 className="mt-5 text-3xl font-semibold leading-tight md:text-[74px] md:leading-[1.1]">
              진짜 보성
            </h1>
            <p className="mt-16 text-3xl font-semibold md:text-[74px] md:leading-[1.1]">
              전체차 LAB
            </p>
          </div>
        </section>

        <section className="relative mx-auto max-w-[1440px] px-6 py-20 text-center md:h-[342px] md:px-0 md:py-0">
          <h2 className="text-2xl font-semibold md:absolute md:left-0 md:top-[108px] md:w-full md:text-[47px] md:leading-[33px]">
            보성 청년마을, 전체차LAB
          </h2>
          <p className="mt-4 text-base font-medium text-[#424242] md:absolute md:left-0 md:top-[209px] md:mt-0 md:w-full md:text-[36px] md:leading-[25px]">
            전체차(全體茶)는 차(茶)로 모든 것을 담는다는 뜻입니다.
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
          <p className="text-base font-medium leading-8 text-[#4a4a4a] md:absolute md:left-0 md:top-[60px] md:w-full md:text-[36px] md:leading-[65px]">
            차를 매개로 청년의 삶과 지역의 미래를 연결하는
            <br />
            실험이 보성 회천면에서 시작됩니다.
          </p>
        </section>

        <section>
          <AboutGrid />
        </section>
      </main>

      <BoseongFigmaFooter primaryProgram={programs[0]} village={village} />
    </div>
  );
}

export function BoseongFigmaProgramsPage({
  programs,
  village,
}: {
  programs: Program[];
  village: Village;
}) {
  return (
    <BoseongFigmaListFrame
      primaryProgram={programs[0]}
      subtitle="오직 전체차LAB에서만 피어나는 경험을 만나보세요."
      title="전체차LAB 오리지널"
      village={village}
    >
      <div className="mx-auto max-w-[1110px] divide-y divide-[#b3df00] border-y border-[#b3df00]">
        {programs.map((program) => (
          <OriginalProgramRow key={`${program.id}-${program.slug}`} program={program} village={village} />
        ))}
      </div>
    </BoseongFigmaListFrame>
  );
}

export function BoseongFigmaMediaIndexPage({
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
      primaryProgram={programs[0]}
      subtitle="보성을 경험하는 새로운 방식, 전체차LAB의 이야기를 만나보세요."
      title="전체차LAB 이야기"
      village={village}
    >
      <div className="mx-auto grid max-w-[1380px] gap-y-6 md:grid-cols-[repeat(3,445px)] md:gap-x-6">
        {media.slice(0, 9).map((content) => (
          <BoseongMediaPreviewCard
            content={content}
            figmaList
            key={content.id}
          />
        ))}
      </div>
    </BoseongFigmaListFrame>
  );
}

export function BoseongFigmaReviewsPage({
  programs,
  reviews,
  village,
}: {
  programs: Program[];
  reviews: Review[];
  village: Village;
}) {
  return (
    <BoseongFigmaListFrame
      primaryProgram={programs[0]}
      subtitle="보성에서 시간이 머무른 마음을 담았습니다."
      title="전체차LAB 후기"
      village={village}
    >
      <div className="mx-auto mb-[22px] flex max-w-[1328px] flex-wrap gap-4 text-sm font-bold text-[#535353]">
        {["전체", "숙재받", "로컬살롱", "차실험"].map((label, index) => (
          <span
            className={index === 0 ? "border-b-2 border-[#55883f] pb-2 text-[#171717]" : "pb-2"}
            key={label}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="mx-auto grid max-w-[1328px] grid-cols-2 gap-[6px] md:grid-cols-4">
        {reviews.slice(0, 20).map((review, index) => (
          <BoseongReviewTile exact index={index} key={review.id} review={review} />
        ))}
      </div>
    </BoseongFigmaListFrame>
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
  children,
  primaryProgram,
  subtitle,
  title,
  village,
}: {
  children: React.ReactNode;
  primaryProgram?: Program;
  subtitle: string;
  title: string;
  village: Village;
}) {
  return (
    <div className="font-boseong bg-white text-[#141414]">
      <BoseongFigmaHeader primaryProgram={primaryProgram} village={village} />
      <main>
        <section className="mx-auto max-w-[1440px] px-6 pb-14 pt-20 text-center md:px-20 md:pb-20 md:pt-28">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] md:text-[36px]">
            {title}
          </h1>
          <p className="mt-6 text-base font-medium text-[#4f4f4f] md:text-xl">
            {subtitle}
          </p>
        </section>
        <section className="px-6 pb-28 md:px-[30px] md:pt-[52px]">
          {children}
        </section>
      </main>
      <BoseongFigmaFooter primaryProgram={primaryProgram} village={village} />
    </div>
  );
}

function HomeOriginalCta({ programs }: { programs: Program[] }) {
  const hrefBySlug = (slug: string) => {
    const program = programs.find((item) => item.slug === slug);

    return program ? villageProgramPath("boseong", program.slug) : "/boseong/programs";
  };

  const slides: BoseongOriginalSlide[] = [
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

  return (
    <section className="relative mt-[35px] overflow-hidden bg-[#b3df00] md:h-[907px] md:bg-transparent">
      <div className="mx-auto max-w-[1440px] px-6 pb-14 pt-10 md:relative md:h-full md:px-0 md:py-0">
        <p className="pointer-events-none select-none text-[44px] font-black leading-none tracking-[-0.06em] text-[#b3df00] [text-shadow:0_-1px_0_#000] md:absolute md:left-[76px] md:top-[43px] md:z-10 md:text-[108px] md:leading-[76px]">
          JEONCHECHA ORIGINAL
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
            className={`absolute right-[56px] top-[51px] flex h-[59px] items-center justify-end border-t border-[#c6c6c6] ${
              isReviews ? "left-[370px]" : "left-[408px]"
            }`}
          >
            <Link className="text-sm font-bold hover:text-[#4f813f]" href={href}>
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
  figmaList = false,
}: {
  content: VillageMediaContent;
  exact?: boolean;
  figmaList?: boolean;
}) {
  if (figmaList) {
    const isInstagram = content.provider === "instagram";

    return (
      <article className="group w-full border-b-2 border-[#b3df00] bg-white md:h-[666px] md:w-[445px]">
        <Link
          aria-label={content.title}
          className="block h-[320px] bg-[#d9d9d9] md:h-[486px]"
          href={`/boseong/media/${content.id}`}
        />
        <div className="relative min-h-[150px] pt-[18px] md:h-[178px]">
          <p className="text-[12px] font-extrabold leading-[16px] text-[#55883f]">
            {mediaCategoryLabels[content.category]}
          </p>
          <Link href={`/boseong/media/${content.id}`}>
            <h3 className="mt-[7px] line-clamp-3 max-w-[330px] text-[18px] font-extrabold leading-[22px] hover:text-[#4f813f]">
              {content.title}
            </h3>
          </Link>
          <span className="absolute bottom-[17px] right-[10px] flex size-[22px] items-center justify-center rounded-full bg-[#d9d9d9] text-white">
            {isInstagram ? <Camera size={13} /> : <Play size={12} fill="currentColor" />}
          </span>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group border-b-2 border-[#b3df00] bg-white ${
        exact ? "md:h-[671px] md:w-[445px]" : ""
      }`}
    >
      <Link
        className={`relative block overflow-hidden bg-[#d9d9d9] ${
          exact ? "aspect-square" : "aspect-[1.16]"
        }`}
        href={`/boseong/media/${content.id}`}
      >
        <Image
          alt={content.title}
          className="object-cover transition duration-500 group-hover:scale-105"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          src={content.thumbnail}
        />
        <span className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-[#4f813f]">
          <Play size={16} fill="currentColor" />
        </span>
      </Link>
      <div className="py-5">
        <p className="text-xs font-extrabold text-[#55883f]">
          {mediaCategoryLabels[content.category]}
        </p>
        <Link href={`/boseong/media/${content.id}`}>
          <h3 className="mt-3 line-clamp-2 text-lg font-extrabold leading-6 hover:text-[#4f813f]">
            {content.title}
          </h3>
        </Link>
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
  const dark = index % 2 === 1;

  return (
    <Link
      className={`${exact ? "md:h-[320px]" : "aspect-square"} p-6 transition hover:brightness-95 ${
        dark ? "bg-[#092c05] text-white" : "bg-[#cbe98d] text-[#173314]"
      }`}
      href={`/boseong/reviews/${review.id}`}
    >
      <p className="text-sm font-extrabold">#{review.badge ?? "전체차LAB 후기"}</p>
      <h3 className="mt-4 line-clamp-3 text-base font-extrabold leading-6">
        {review.title}
      </h3>
      <p className="mt-4 text-xs font-bold opacity-70">{review.author}</p>
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
  return (
    <article className="grid gap-6 py-7 md:h-[276px] md:grid-cols-[300px_minmax(0,1fr)] md:gap-[44px] md:py-0">
      <div className="md:pt-[46px]">
        <StatusBadge program={program} />
        <h2 className="mt-4 max-w-[250px] text-[24px] font-extrabold leading-[1.18] md:text-[22px] md:leading-[28px]">
          {program.title}
        </h2>
        <Link
          className="mt-5 inline-flex h-[31px] items-center border border-[#4f813f] px-[13px] text-[14px] font-extrabold leading-none text-[#2f6b2e] hover:bg-[#4f813f] hover:text-white"
          href={villageProgramPath(village.slug, program.slug)}
        >
          자세히
        </Link>
      </div>
      <div className="grid content-start gap-[13px] text-[14px] font-bold leading-[18px] text-[#3e3e3e] md:pt-[46px]">
        <p className="max-w-[620px] text-[17px] font-extrabold leading-[22px] text-[#171717]">
          {program.summary}
        </p>
        <p className="mt-[4px] flex items-center gap-2">
          <MapPin className="text-[#4f813f]" size={14} />
          {program.region} {program.city}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="text-[#4f813f]" size={14} />
          {formatRange(program.activityStart, program.activityEnd)}
        </p>
        <p>
          모집 {formatDate(program.recruitStart)} - {formatDate(program.recruitEnd)}
          <span className="ml-3 font-extrabold text-[#4f813f]">
            {getDday(program.recruitEnd, program.status)}
          </span>
        </p>
      </div>
    </article>
  );
}

function AboutGrid() {
  const rows = [
    {
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

  return (
    <div className="mx-auto max-w-[1440px]">
      {rows.map((row, index) => {
        const flip = index % 2 === 1;

        return (
          <section
            className="relative grid min-h-[520px] md:h-[664px] md:min-h-0 md:grid-cols-[724px_716px]"
            key={row.title}
          >
            {flip ? <div className="bg-[#d9d9d9]" /> : null}
            <div className="flex items-start px-8 py-16 md:px-0 md:py-0">
              <div
                className={
                  flip
                    ? "md:ml-[90px] md:mt-[120px] md:w-[517px] md:text-right"
                    : "md:ml-[115px] md:mt-[120px] md:w-[609px]"
                }
              >
                <h2 className="whitespace-pre-line text-2xl font-semibold leading-tight md:text-[36px] md:leading-[44px]">
                  {row.title}
                </h2>
                <p
                  className={`whitespace-pre-line text-base font-medium leading-8 text-[#4a4a4a] md:text-[26px] md:leading-[36px] ${
                    row.title.includes("\n") ? "mt-[86px]" : "mt-[86px]"
                  }`}
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
