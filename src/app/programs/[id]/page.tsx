import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Mail,
  Minus,
  MoreHorizontal,
  Phone,
  Plus,
  Share2,
  Star,
  Tag,
  Ticket,
} from "lucide-react";
import { JsonLdScript } from "@/components/json-ld";
import { ProgramScheduleCards } from "@/components/program-schedule-popover";
import { programs } from "@/lib/data";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { getPublicProgramByIdentifier } from "@/lib/public-program-db";
import { programPath } from "@/lib/program-routing";
import { listPublicProgramReviewsFromDb } from "@/lib/review-db";
import {
  breadcrumbJsonLd,
  createSeoMetadata,
  programJsonLd,
} from "@/lib/seo";
import type { Program, Review } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const dummyProgramSlug = "dummy-program-detail";

const dummyProgram: Program = {
  id: "dummy-program-detail",
  title: "여행 프로그램 이름 입력",
  slug: dummyProgramSlug,
  region: "지역",
  city: "입력하기",
  summary: "지역에서 머무르며 로컬을 경험하는 더미 프로그램입니다.",
  description:
    "누비오 프로그램 상세 페이지 UI 확인을 위해 만들어둔 더미 프로그램입니다.",
  theme: "local",
  categories: ["local", "short", "benefit"],
  hashtags: ["지역여행", "로컬체험", "자유신청"],
  periodKey: "week",
  activityStart: "2026-05-12",
  activityEnd: "2026-05-22",
  recruitStart: "2026-05-01",
  recruitEnd: "2026-06-15",
  target: "지역 여행과 로컬 체험에 관심 있는 누구나",
  capacity: "30 명",
  announcement: "신청 후 개별 안내",
  subsidyLabel: "1000,000 원",
  subsidyAmount: 1_000_000,
  fee: "1000,000 원",
  applicants: 0,
  status: "open",
  sourceName: "누비오",
  sourceUrl: "https://nuvio.kr",
  applyUrl: "#apply",
  phone: "0000-0000-0000",
  image:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  gallery: [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  ],
  badges: ["자유신청", "로컬체험", "여행지원"],
  body: [
    "지역의 일상과 자연을 천천히 경험하며 머무르는 여행 프로그램입니다.",
    "일정, 신청 방식, 후기 영역을 실제 콘텐츠로 교체하기 전까지 화면 구조를 확인할 수 있습니다.",
  ],
  dataSource: "seed",
};

const detailTabs = ["여행 소개", "일정 안내", "후기", "집결지 정보", "안내사항"];

const scheduleItems = [
  {
    day: "1일차",
    body: "여행 1일차 프로그램 일정에 관해 어떤 체험을 할 것이고 대략적으로 어떤 컨셉의 여행인지에 대한 간략한 소개글을 작성하세요. 최대로 작성 가능한 글자수 제한을 둬야합니다. 3줄안에 끝내야함.",
  },
  {
    day: "2일차",
    body: "여행 2일차 프로그램 일정에 관해 어떤 체험을 할 것이고 대략적으로 어떤 컨셉의 여행인지에 대한 간략한 소개글을 작성하세요. 최대로 작성 가능한 글자수 제한을 둬야합니다. 3줄안에 끝내야함.",
  },
];

const floatingSchedule = [
  "공항 도착",
  "숙소 이동",
  "오리엔테이션",
  "지역 산책",
  "자유 일정",
  "일정 마무리",
];

const boseongProgramReviewHrefs: Record<string, string> = {
  "1013": "/boseong/reviews?program=talent-for-stay",
  "1014": "/boseong/reviews?program=local-salon",
  "1015": "/boseong/reviews?program=tea-lab",
  "talent-for-stay": "/boseong/reviews?program=talent-for-stay",
  "local-salon": "/boseong/reviews?program=local-salon",
  "tea-lab": "/boseong/reviews?program=tea-lab",
};

export function generateStaticParams() {
  if (!isDemoModeEnabled()) return [];

  const seedParams = programs.flatMap((program) => {
    const params = [{ id: String(program.id) }];
    if (program.slug) params.push({ id: program.slug });
    return params;
  });

  return [...seedParams, { id: dummyProgramSlug }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const program = await getProgramForDetail(id);
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
  const program = await getProgramForDetail(id);

  if (!program) notFound();

  const canonicalPath = programPath(program);
  const locationLabel = `${program.region}, ${program.city}`;
  const applyHref = program.applyUrl || `${canonicalPath}/apply`;
  const programReviews = await getProgramReviewsForDetail(program);
  const reviewListHref = getProgramReviewListHref(program);

  return (
    <div className="font-pretendard bg-white text-[#2B1E17]">
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

      <section
        aria-label="프로그램 대표 이미지"
        className="group flex h-[30.278vw] min-h-[300px] w-full items-center justify-between bg-[#778695] px-[1.806vw] max-md:h-[240px] max-md:min-h-[240px]"
      >
        <CarouselArrow ariaLabel="이전 이미지">
          <ChevronLeft aria-hidden="true" className="size-10 stroke-[1.5]" />
        </CarouselArrow>
        <CarouselArrow ariaLabel="다음 이미지">
          <ChevronRight aria-hidden="true" className="size-10 stroke-[1.5]" />
        </CarouselArrow>
      </section>

      <div className="relative mx-auto grid w-[71.597vw] grid-cols-[minmax(0,48.056vw)_20.625vw] items-start gap-[2.917vw] pt-10 max-md:block max-md:w-[90vw] max-md:pt-7">
        <article className="flex w-[48.056vw] min-w-0 flex-col gap-[18px] max-md:w-full">
          <header className="flex h-[121px] w-full items-start justify-between pb-10 max-md:h-auto max-md:min-h-[100px]">
            <div className="flex w-[188px] flex-col items-start gap-2">
              <h1 className="whitespace-nowrap text-xl font-semibold leading-[1.253] text-[#5B3A29]">
                {program.title}
              </h1>
              <p className="whitespace-nowrap text-xs font-normal leading-[1.6] text-[#6D7A8A]">
                {locationLabel}
              </p>
              <span className="inline-flex whitespace-nowrap rounded-md bg-[#F7B267] px-1.5 py-[3px] text-xs font-semibold leading-[1.253] text-[#FCFCFC]">
                {program.badges[0] ?? "자유신청"}
              </span>
            </div>
            <div className="flex w-[65px] items-center justify-between text-[#CAC4BC]">
              <IconButton ariaLabel="공유하기">
                <Share2 aria-hidden="true" className="size-5" />
              </IconButton>
              <IconButton ariaLabel="저장하기">
                <Bookmark aria-hidden="true" className="size-5" />
              </IconButton>
            </div>
          </header>

          <nav
            aria-label="프로그램 상세 메뉴"
            className="flex h-[33px] w-full items-center gap-[21px] overflow-x-auto border-y-[0.5px] border-[#F5E1D3] pt-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:gap-4"
          >
            {detailTabs.map((tab, index) => (
              <a
                aria-current={index === 0 ? "page" : undefined}
                className={`relative inline-flex h-[27px] shrink-0 items-center justify-center whitespace-nowrap text-xs ${
                  index === 0
                    ? "pb-3 font-semibold leading-[1.253] text-[#5B3A29] after:absolute after:bottom-[-1px] after:left-0 after:h-0.5 after:w-full after:bg-[#FE701E]"
                    : "pb-2 font-normal leading-[1.6] text-[#CAC4BC]"
                }`}
                href={`#detail-section-${index}`}
                key={tab}
              >
                {tab}
              </a>
            ))}
          </nav>

          <section
            className="flex h-[886px] w-full flex-col pb-[30px] max-md:h-[118vw] max-md:min-h-[420px] max-md:pb-0"
            id="detail-section-0"
          >
            <div
              aria-label="여행 소개 이미지 영역"
              className="h-[856px] w-full bg-[#D9D9D9] max-md:h-[118vw] max-md:min-h-[420px]"
            />
          </section>

          <section
            className="flex min-h-[496px] w-full flex-col gap-[18px] pb-10"
            id="detail-section-1"
          >
            <SectionTitle title="여행 일정" />
            <ProgramScheduleCards items={scheduleItems} popupItems={floatingSchedule} />
          </section>

          <ParticipantReviewSection
            reviewListHref={reviewListHref}
            reviews={programReviews}
          />

          <section
            className="flex min-h-[932px] w-[694.53px] flex-col items-center gap-7 pb-10 max-md:w-full"
            id="detail-section-3"
          >
            <SectionTitle title="집결지 정보" />

            <div className="flex w-full flex-col items-start gap-[34px] px-3">
              <div className="flex w-[120px] flex-col items-start gap-2 text-sm font-medium leading-[1.253] text-[#6D7A8A]">
                <p>집결지 장소 주소 입력</p>
                <p>주차 안내 입력</p>
                <p>
                  이동수단 안내 입력
                  <br />
                  (버스노선)
                  <br />
                  (지하철 노선)
                  <br />
                  (다른 교통수단)
                </p>
              </div>
              <div className="flex w-full flex-col items-start gap-[9px]">
                <p className="flex items-center gap-[11px] text-sm font-medium leading-[1.253] text-[#6D7A8A]">
                  <Phone aria-hidden="true" className="size-5 text-[#FF9A3D]" />
                  {program.phone}
                </p>
                <p className="flex items-center gap-[11px] text-sm font-medium leading-[1.253] text-[#6D7A8A]">
                  <Mail aria-hidden="true" className="size-5 text-[#FF9A3D]" />
                  aaa@aaaaaa.com
                </p>
              </div>
            </div>

            <div
              aria-label="지도 영역"
              className="h-[243px] w-[662px] bg-[#D9D9D9] max-md:w-full"
            />

            <section
              className="flex w-[694.53px] flex-col items-center gap-7 max-md:w-full"
              id="detail-section-4"
            >
              <SectionTitle title="안내사항" />
              <div className="flex w-full flex-col">
                <GuideButton label="신청안내" />
                <div className="flex w-full flex-col gap-3 border-b border-[#F5E1D3] px-2 pb-1">
                  <button
                    className="flex h-[47px] w-full items-center justify-between border-0 bg-transparent py-[17px] text-sm font-normal leading-[1.253] text-[#5B3A29]"
                    type="button"
                  >
                    환불규정
                    <ChevronUp aria-hidden="true" className="h-4 w-[15px]" />
                  </button>
                  <div
                    aria-label="환불규정 내용 영역"
                    className="h-[188px] w-[677px] bg-[#D9D9D9] max-md:w-full"
                  />
                </div>
              </div>
            </section>
          </section>
        </article>

        <aside className="sticky top-[86px] flex w-[20.625vw] min-w-0 flex-col items-start gap-[11px] self-start max-md:static max-md:mt-[34px] max-md:w-full">
          <section
            className="flex h-[333px] w-[297px] flex-col items-center gap-[17px] rounded-md border border-[#F5E1D3] bg-[#FCFCFC] p-4 max-md:w-full"
            id="apply"
          >
            <div className="grid min-h-[35px] grid-cols-[123.5px_123.5px] items-center rounded-[7px] border-[0.5px] border-[#F5E1D3] max-md:w-full max-md:grid-cols-2">
              <div className="flex items-center justify-center gap-1 p-2">
                <strong className="text-xs font-medium leading-[1.253] text-[#5B3A29]">
                  일정
                </strong>
                <span className="text-xs font-normal leading-[1.6] text-[#6D7A8A]">
                  2026.5.12-5.22
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 border-l-[0.5px] border-[#F5E1D3] p-2">
                <strong className="text-xs font-medium leading-[1.253] text-[#5B3A29]">
                  모집
                </strong>
                <span className="text-xs font-normal leading-[1.6] text-[#6D7A8A]">
                  {program.capacity}
                </span>
              </div>
            </div>
            <p className="-mt-3.5 mr-[13px] w-full text-right text-xs font-normal leading-[1.6] text-[#6D7A8A]">
              ~2026년 5월 1일
            </p>

            <div className="-mt-[3px] flex w-full items-center justify-between">
              <span className="text-xs font-medium leading-[1.253] text-[#F7B267]">
                자유신청
              </span>
              <strong className="text-center text-sm font-semibold leading-[1.253] text-[#7A8B52]">
                D-20
              </strong>
            </div>
            <h2 className="-mt-[13px] self-start text-base font-medium leading-[1.253] text-[#5B3A29]">
              여행 프로그램 이름
            </h2>

            <div className="flex w-full items-start gap-1.5">
              <strong className="text-base font-medium leading-[1.253] text-[#5B3A29]">
                {program.fee}
              </strong>
              <span className="text-xs font-normal leading-[1.6] text-[#CAC4BC]">
                /명
              </span>
            </div>

            <div className="flex w-full flex-col items-center gap-[7px] rounded-[5px] bg-[#F3F3F3] p-1.5">
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-normal leading-[1.6] text-[#6D7A8A]">
                  신청 인원
                </span>
                <div className="flex items-center gap-[17px]">
                  <QuantityButton ariaLabel="인원 줄이기">
                    <Minus aria-hidden="true" className="size-2" />
                  </QuantityButton>
                  <b className="text-xs font-normal leading-[1.6] text-[#6D7A8A]">00</b>
                  <QuantityButton ariaLabel="인원 늘리기">
                    <Plus aria-hidden="true" className="size-2" />
                  </QuantityButton>
                </div>
              </div>
              <div className="flex w-full items-center justify-between border-t border-[#F5E1D3] pt-1.5">
                <strong className="text-base font-medium leading-[1.253] text-[#5B3A29]">
                  총액
                </strong>
                <strong className="text-base font-medium leading-[1.253] text-[#5B3A29]">
                  {program.fee}
                </strong>
              </div>
            </div>

            <a
              className="-mt-px flex h-[29px] w-full items-center justify-center rounded bg-[#FE701E] text-xs font-medium leading-[1.253] text-[#FFF6EC]"
              href={applyHref}
            >
              신청하기
            </a>
          </section>

          <div className="flex w-[297px] flex-col gap-[9px] max-md:w-full">
            <BenefitRow icon={<Ticket aria-hidden="true" className="size-3.5" />} label="쿠폰" value="받기" />
            <BenefitRow
              icon={<Tag aria-hidden="true" className="size-[13px]" />}
              label="프로모션"
              value="확인하기"
            />
          </div>
        </aside>

      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex h-5 w-full items-center gap-2">
      <h2 className="whitespace-nowrap text-base font-semibold leading-[1.253] text-[#5B3A29]">
        {title}
      </h2>
      <span aria-hidden="true" className="h-px min-w-px flex-1 bg-[#F5E1D3]" />
    </div>
  );
}

function ParticipantReviewSection({
  reviewListHref,
  reviews,
}: {
  reviewListHref: string;
  reviews: Review[];
}) {
  const rankedReviews = rankProgramReviews(reviews);
  const reviewImages = rankedReviews
    .flatMap((review) => review.images)
    .filter(isRenderableImage)
    .slice(0, 6);
  const visibleReviews = rankedReviews.slice(0, 3);
  const ratingText = reviews.length > 0 ? "5.0" : "0.00";
  const countText = String(reviews.length).padStart(2, "0");

  return (
    <section
      className="flex min-h-[1076px] w-full flex-col items-center gap-4 pb-10"
      id="detail-section-2"
    >
      <SectionTitle title="참여자 리뷰" />

      <div className="flex h-6 w-full items-center gap-2">
        <Star aria-hidden="true" className="size-6 fill-[#FE701E] text-[#FE701E]" />
        <strong className="text-base font-semibold leading-[1.253] text-[#5B3A29]">
          {ratingText}
        </strong>
        <span className="text-sm font-medium leading-[1.253] text-[#CAC4BC]">
          ({countText})
        </span>
      </div>

      <div
        aria-label="리뷰 이미지 모음"
        className="flex h-[108px] w-full items-center gap-[5px] overflow-hidden overflow-y-hidden border-b border-[#F5E1D3] pl-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:overflow-x-auto"
      >
        {reviewImages.length > 0
          ? reviewImages.map((imageUrl, index) => (
              <div
                className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-md bg-[#D9D9D9]"
                key={`${imageUrl}-${index}`}
              >
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="100px"
                  src={imageUrl}
                />
              </div>
            ))
          : Array.from({ length: 6 }, (_, index) => (
              <div
                aria-hidden="true"
                className="h-[100px] w-[100px] shrink-0 rounded-md bg-[#D9D9D9]"
                key={index}
              />
            ))}
        <Link
          className="flex w-[52px] shrink-0 flex-col items-center gap-1 border-0 bg-transparent p-0 text-xs font-normal leading-[1.6] text-[#5B3A29]"
          href={reviewListHref}
        >
          <span className="flex size-[20.5px] items-center justify-center rounded-full border border-[#F5E1D3] text-[#FE701E]">
            <ChevronRight aria-hidden="true" className="size-[14px]" />
          </span>
          <span className="whitespace-nowrap">전체보기</span>
        </Link>
      </div>

      <div className="flex w-[688px] flex-col max-md:w-full">
        {visibleReviews.length > 0 ? (
          visibleReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              reviewListHref={reviewListHref}
            />
          ))
        ) : (
          <div className="flex min-h-[173px] w-[688px] items-center justify-center border-b border-[#F5E1D3] px-8 py-4 text-sm text-[#6D7A8A] max-md:w-full max-md:px-4">
            아직 등록된 참가자 리뷰가 없습니다.
          </div>
        )}
      </div>

      <Link
        className="flex h-[29px] w-full items-center justify-center rounded bg-[#FFF6EC] p-0 text-xs font-medium leading-[1.253] text-[#FF9A3D]"
        href={reviewListHref}
      >
        참여자 리뷰 전체보기
      </Link>
    </section>
  );
}

function ReviewCard({
  review,
  reviewListHref,
}: {
  review: Review;
  reviewListHref: string;
}) {
  const images = review.images.filter(isRenderableImage).slice(0, 5);
  const detailHref = getReviewDetailHref(review, reviewListHref);
  const reviewBody = getReviewBody(review);

  return (
    <section
      className={`flex w-[688px] flex-col items-start border-b border-[#F5E1D3] px-8 py-4 max-md:w-full max-md:px-4 ${
        images.length === 0 ? "min-h-[173px]" : "min-h-[293px]"
      }`}
    >
      <div className="grid w-full grid-cols-[20px_minmax(0,1fr)_22px] items-start gap-[5px] pb-1.5 pr-1.5">
        <span aria-hidden="true" className="size-5 rounded-full bg-[#D9D9D9]" />
        <strong className="flex min-h-5 items-center text-sm font-semibold leading-[1.253] text-[#2B1E17]">
          {review.author}
        </strong>
        <span
          aria-hidden="true"
          className="flex size-[22px] items-center justify-center border-0 bg-transparent p-0 text-[#CAC4BC]"
        >
          <MoreHorizontal aria-hidden="true" className="size-[22px]" />
        </span>
      </div>
      <div className="flex w-full items-center px-[3px]">
        <Star aria-hidden="true" className="mr-0.5 size-[9px] fill-[#FE701E] text-[#FE701E]" />
        <strong className="text-xs font-normal leading-[1.6] text-[#FE701E]">5.0</strong>
        <time
          className="ml-auto text-xs font-normal leading-[1.6] text-[#D9D9D9]"
          dateTime={review.date}
        >
          {formatReviewDate(review.date)}
        </time>
      </div>
      <p className="mt-2 line-clamp-3 max-h-[58px] w-[624px] overflow-hidden px-2 text-xs font-normal leading-[1.6] text-[#2B1E17] max-md:w-full">
        {reviewBody}
      </p>
      <Link
        className="mt-2 inline-flex self-end border-0 bg-transparent p-0 pb-3 text-xs font-normal leading-[1.6] text-[#6D7A8A]"
        href={detailHref}
      >
        펼치기
        <ChevronDown aria-hidden="true" className="size-[9px]" />
      </Link>
      {images.length > 0 ? (
        <div className="group/gallery relative flex items-center gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:w-full max-md:overflow-x-auto">
          {images.map((imageUrl, index) => (
            <div
              className="relative size-[120px] shrink-0 overflow-hidden rounded-md bg-[#D9D9D9]"
              key={`${imageUrl}-${index}`}
            >
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="120px"
                src={imageUrl}
              />
            </div>
          ))}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[-11px] top-[50px] flex h-[20.5px] w-[645.53px] items-center justify-between text-white opacity-0 transition-opacity group-hover/gallery:opacity-100 group-focus-within/gallery:opacity-100 max-md:hidden"
          >
            <ChevronLeft className="size-[20.5px]" />
            <ChevronRight className="size-[20.5px]" />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function IconButton({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="inline-flex size-[21px] items-center justify-center border-0 bg-transparent p-0"
      type="button"
    >
      {children}
    </button>
  );
}

function CarouselArrow({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="pointer-events-none inline-flex size-12 items-center justify-center border-0 bg-transparent p-0 text-white opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
      type="button"
    >
      {children}
    </button>
  );
}

function GuideButton({ label }: { label: string }) {
  return (
    <button
      className="flex h-[52px] w-full items-center justify-between border-0 border-b border-[#F5E1D3] bg-transparent px-2 py-[17px] text-sm font-normal leading-[1.253] text-[#5B3A29]"
      type="button"
    >
      {label}
      <ChevronDown aria-hidden="true" className="h-4 w-[15px]" />
    </button>
  );
}

function QuantityButton({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="inline-flex size-3 items-center justify-center rounded-full border border-[#CAC4BC] bg-transparent p-0 text-[#CAC4BC]"
      type="button"
    >
      {children}
    </button>
  );
}

function BenefitRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex h-[33px] w-[297px] items-center gap-2 rounded-[3px] border border-[#F5E1D3] bg-[#FCFCFC] p-1.5 max-md:w-full">
      <span className="flex-1 text-xs font-semibold leading-[1.253] text-[#5B3A29]">
        {label}
      </span>
      <button
        className="flex h-[21px] items-center gap-[3px] rounded-[3px] border-0 bg-[#FF9A3D] px-[7px] py-px text-xs font-normal leading-[1.6] text-[#FCFCFC]"
        type="button"
      >
        {icon}
        {value}
      </button>
    </div>
  );
}

async function getProgramReviewsForDetail(program: Program): Promise<Review[]> {
  try {
    return await listPublicProgramReviewsFromDb(program.id, 120);
  } catch {
    return [];
  }
}

function getProgramReviewListHref(program: Program): string {
  return (
    boseongProgramReviewHrefs[String(program.id)] ??
    boseongProgramReviewHrefs[program.slug] ??
    "/reviews"
  );
}

function rankProgramReviews(reviews: Review[]): Review[] {
  return [...reviews].sort((left, right) => {
    const scoreDiff = getReviewDisplayScore(right) - getReviewDisplayScore(left);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(right.date).getTime() - new Date(left.date).getTime();
  });
}

function getReviewDisplayScore(review: Review): number {
  const imageScore = Math.min(review.images.filter(isRenderableImage).length, 3) * 40;
  const textScore = Math.min(getReviewBody(review).length, 200);
  const participantScore = review.programId ? 80 : 0;

  return participantScore + imageScore + textScore;
}

function getReviewBody(review: Review): string {
  return (review.body || review.excerpt || "").trim();
}

function getReviewDetailHref(review: Review, fallbackHref: string): string {
  return review.villageSlug
    ? `/${review.villageSlug}/reviews/${review.id}`
    : fallbackHref;
}

function formatReviewDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function isRenderableImage(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/");
}

async function getProgramForDetail(id: string): Promise<Program | null> {
  if (
    isDemoModeEnabled() &&
    (id === dummyProgramSlug || id === String(dummyProgram.id))
  ) {
    return dummyProgram;
  }

  return (await getPublicProgramByIdentifier(id)) ?? null;
}
