import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Mail,
  MoreHorizontal,
  Phone,
  Star,
  Tag,
  Ticket,
} from "lucide-react";
import { JsonLdScript } from "@/components/json-ld";
import { KakaoMap } from "@/components/kakao-map";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { ProgramDetailActions } from "@/components/program-detail-actions";
import { ProgramDetailNav } from "@/components/program-detail-nav";
import { ProgramDetailScale } from "@/components/program-detail-scale";
import { ProgramGalleryCarousel } from "@/components/program-gallery-carousel";
import { ProgramReservationCard } from "@/components/program-reservation-card";
import {
  ProgramScheduleCards,
} from "@/components/program-schedule-popover";
import { programs } from "@/lib/data";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  fallbackScheduleItems,
  getProgramGalleryImages,
  getProgramGuideDetails,
  getProgramIntroParagraphs,
  getProgramPlaceDetails,
  getProgramScheduleItems,
} from "@/lib/program-detail-view-model";
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
  contactEmail: "contact@nuvio.kr",
  image:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  gallery: [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
  ],
  badges: ["자유신청", "로컬체험", "여행지원"],
  body: [
    "지역의 일상과 자연을 천천히 경험하며 머무르는 여행 프로그램입니다.",
    "일정, 신청 방식, 안내 영역을 실제 콘텐츠로 교체하기 전까지 화면 구조를 확인할 수 있습니다.",
  ],
  itineraryDays: [
    {
      id: "day-1",
      image:
        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
      images: [
        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
      ],
      summary: "도착 후 로컬 오리엔테이션과 동네 산책을 진행합니다.",
      timetable: "14:00 집결 및 체크인\n16:00 오리엔테이션\n18:00 로컬 저녁",
      title: "1일차",
    },
    {
      id: "day-2",
      image:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",
      images: [
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",
      ],
      summary: "지역 크리에이터와 함께하는 체험과 자유 탐방 시간이 이어집니다.",
      timetable: "10:00 로컬 체험\n13:00 점심\n15:00 자유 탐방",
      title: "2일차",
    },
  ],
  placeInfo: {
    accommodationEnabled: true,
    accommodationMemo: "숙소 위치와 체크인 방법은 신청 확정 후 안내됩니다.",
    accommodationName: "로컬 스테이",
    meetingAddress: "서울특별시 중구 세종대로 110",
    meetingAddressDetail: "1층 안내데스크",
    meetingMemo: "시작 10분 전까지 도착해 주세요.",
    parkingGuide: "공용 주차장 이용 가능 여부는 현장 상황에 따라 달라질 수 있습니다.",
    transportGuide: "대중교통 이용을 권장합니다.",
  },
  dataSource: "seed",
};

const detailTabs = [
  { href: "#detail-section-intro", label: "여행 소개" },
  { href: "#detail-section-schedule", label: "일정 안내" },
  ...(launchFeatureFlags.reviews
    ? [{ href: "#detail-section-reviews", label: "후기" }]
    : []),
  { href: "#detail-section-place", label: "집결지 정보" },
  { href: "#detail-section-guide", label: "안내사항" },
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
  const programReviews = launchFeatureFlags.reviews
    ? await getProgramReviewsForDetail(program)
    : [];
  const reviewListHref = launchFeatureFlags.reviews
    ? getProgramReviewListHref(program)
    : "";
  const galleryImages = getProgramGalleryImages(program);
  const introParagraphs = getProgramIntroParagraphs(program, 8).filter(
    (paragraph) => program.body.length === 0 || paragraph !== program.description,
  );
  const scheduleCards = getProgramScheduleItems(program, galleryImages);
  const placeDetails = getProgramPlaceDetails(program);
  const guideDetails = getProgramGuideDetails(program);
  const contactEmail = program.contactEmail?.trim();

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

      <ProgramGalleryCarousel images={galleryImages} title={program.title} />

      <ProgramDetailScale>
      <div className="relative grid w-[1031px] grid-cols-[minmax(0,692px)_minmax(0,297px)] items-start gap-[42px] pt-10 max-md:block max-md:w-[90vw] max-md:pt-7">
        <article className="flex w-full min-w-0 flex-col gap-3 min-[1440px]:gap-[0.833vw] max-md:w-full">
          <header className="flex w-full items-start justify-between pb-1.5 min-[1440px]:pb-[0.417vw] max-md:pb-2">
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
            <ProgramDetailActions
              hostName={program.sourceName}
              programId={program.id}
              title={program.title}
            />
          </header>

          <ProgramDetailNav tabs={detailTabs} />

          <section
            className="flex min-h-[886px] w-full scroll-mt-[112px] flex-col pb-[30px] max-md:min-h-[420px] max-md:scroll-mt-[104px] max-md:pb-0"
            id="detail-section-intro"
          >
            <ProgramIntroArticle
              images={galleryImages}
              paragraphs={introParagraphs}
              title={program.title}
            />
          </section>

          <section
            className="flex min-h-[496px] w-full scroll-mt-[112px] flex-col gap-[18px] pb-10 max-md:scroll-mt-[104px]"
            id="detail-section-schedule"
          >
            <SectionTitle title="여행 일정" />
            <ProgramScheduleCards
              fallbackItems={fallbackScheduleItems}
              items={scheduleCards}
            />
          </section>

          {launchFeatureFlags.reviews ? (
            <ParticipantReviewSection
              reviewListHref={reviewListHref}
              reviews={programReviews}
            />
          ) : null}

          <section
            className="flex min-h-[932px] w-full scroll-mt-[112px] flex-col items-center gap-7 pb-10 max-md:w-full max-md:scroll-mt-[104px]"
            id="detail-section-place"
          >
            <SectionTitle title="집결지 정보" />

            <div className="flex w-full flex-col items-start gap-[28px] px-3">
              <dl className="grid w-full grid-cols-[92px_minmax(0,1fr)] gap-x-5 gap-y-4 text-sm leading-[1.55] max-md:grid-cols-1 max-md:gap-y-2">
                <dt className="font-semibold text-[#5B3A29]">집결지</dt>
                <dd className="break-keep text-[#6D7A8A]">
                  {placeDetails.meetingAddress}
                </dd>

                {placeDetails.meetingMemo ? (
                  <>
                    <dt className="font-semibold text-[#5B3A29]">추가 안내</dt>
                    <dd className="break-keep text-[#6D7A8A]">
                      {placeDetails.meetingMemo}
                    </dd>
                  </>
                ) : null}

                <dt className="font-semibold text-[#5B3A29]">주차 안내</dt>
                <dd className="break-keep text-[#6D7A8A]">
                  {placeDetails.parkingGuide}
                </dd>

                <dt className="font-semibold text-[#5B3A29]">이동수단</dt>
                <dd className="break-keep text-[#6D7A8A]">
                  {placeDetails.transportGuide}
                </dd>

                {placeDetails.accommodation ? (
                  <>
                    <dt className="font-semibold text-[#5B3A29]">숙소 안내</dt>
                    <dd className="break-keep text-[#6D7A8A]">
                      {placeDetails.accommodation}
                    </dd>
                  </>
                ) : null}
              </dl>
              <div className="flex w-full flex-col items-start gap-[9px]">
                <p className="flex items-center gap-[11px] text-sm font-medium leading-[1.253] text-[#6D7A8A]">
                  <Phone aria-hidden="true" className="size-5 text-[#FF9A3D]" />
                  {program.phone}
                </p>
                <p
                  className="flex items-center gap-[11px] text-sm font-medium leading-[1.253] text-[#6D7A8A]"
                >
                  <Mail aria-hidden="true" className="size-5 text-[#FF9A3D]" />
                  {contactEmail ? (
                    <a className="hover:text-[#FE701E]" href={`mailto:${contactEmail}`}>
                      {contactEmail}
                    </a>
                  ) : (
                    "문의 수신 이메일 미등록"
                  )}
                </p>
              </div>
            </div>

            <KakaoMap
              address={placeDetails.meetingMapAddress || placeDetails.meetingAddress}
              className="h-[243px] w-[662px] max-md:w-full"
              markerLabel={program.title}
            />

            <section
              className="flex w-full scroll-mt-[112px] flex-col items-center gap-7 max-md:w-full max-md:scroll-mt-[104px]"
              id="detail-section-guide"
            >
              <SectionTitle title="안내사항" />
              <div className="flex w-full flex-col">
                <GuideInfoRow label="신청안내" values={[guideDetails.applicationGuide]} />
                <GuideInfoRow label="포함사항" values={guideDetails.includedItems} />
                <GuideInfoRow label="불포함사항" values={guideDetails.excludedItems} />
                <GuideInfoRow label="준비물" values={guideDetails.preparationItems} />
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
                    className="flex w-full flex-col gap-2 rounded-md bg-[#F7F5F3] px-4 py-5 text-xs font-medium leading-[1.65] text-[#6D7A8A] max-md:w-full"
                  >
                    {guideDetails.refundRules.map((rule, index) => (
                      <p className="break-keep" key={`${rule}-${index}`}>
                        {rule}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </section>
        </article>

        <aside className="sticky top-[86px] flex w-full min-w-0 flex-col items-start gap-[11px] self-start min-[1440px]:gap-[0.764vw] max-md:static max-md:mt-[34px] max-md:w-full">
          <ProgramReservationCard applyHref={applyHref} program={program} />

          {launchFeatureFlags.coupons || launchFeatureFlags.promotions ? (
            <div className="flex w-full flex-col gap-[9px] min-[1440px]:gap-[0.625vw] max-md:w-full">
              {launchFeatureFlags.coupons ? (
                <BenefitRow
                  icon={<Ticket aria-hidden="true" className="size-3.5" />}
                  label="쿠폰"
                  value="받기"
                />
              ) : null}
              {launchFeatureFlags.promotions ? (
                <BenefitRow
                  icon={<Tag aria-hidden="true" className="size-[13px]" />}
                  label="프로모션"
                  value="확인하기"
                />
              ) : null}
            </div>
          ) : null}
        </aside>

      </div>
      </ProgramDetailScale>
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

function ProgramIntroArticle({
  images,
  paragraphs,
  title,
}: {
  images: string[];
  paragraphs: string[];
  title: string;
}) {
  const introImages = images.filter(isRenderableImage).slice(0, 3);
  const lead = paragraphs[0] ?? "";
  const bodyParagraphs = paragraphs.slice(1);
  const primaryImage = introImages[1] ?? introImages[0] ?? "";
  const secondaryImage =
    introImages.find((imageUrl) => imageUrl !== primaryImage) ?? "";

  return (
    <div className="flex min-h-[856px] w-full flex-col border-b border-[#F5E1D3] bg-white px-[34px] py-[34px] max-md:min-h-0 max-md:px-4 max-md:py-6">
      <div className="flex w-full flex-col gap-[24px]">
        {lead ? (
          <p className="break-keep text-lg font-semibold leading-[1.65] text-[#5B3A29] max-md:text-base">
            {lead}
          </p>
        ) : null}

        {bodyParagraphs.slice(0, 2).map((paragraph, index) => (
          <p
            className="break-keep text-sm font-medium leading-[1.85] text-[#5B3A29]"
            key={`${paragraph}-${index}`}
          >
            {paragraph}
          </p>
        ))}

        {primaryImage ? (
          <figure className="flex w-full flex-col gap-2">
            <div className="relative h-[360px] w-full overflow-hidden rounded-[3px] bg-[#D9D9D9] max-md:h-[58vw] max-md:min-h-[240px]">
              <Image
                alt={`${title} 여행소개 이미지`}
                className="object-cover"
                fill
                sizes="(max-width: 767px) 90vw, 624px"
                src={primaryImage}
              />
            </div>
          </figure>
        ) : null}

        {bodyParagraphs.slice(2).map((paragraph, index) => (
          <p
            className="break-keep text-sm font-medium leading-[1.85] text-[#5B3A29]"
            key={`${paragraph}-${index + 2}`}
          >
            {paragraph}
          </p>
        ))}

        {secondaryImage ? (
          <figure className="mt-1 flex w-full flex-col gap-2">
            <div className="relative h-[270px] w-full overflow-hidden rounded-[3px] bg-[#D9D9D9] max-md:h-[50vw] max-md:min-h-[220px]">
              <Image
                alt={`${title} 본문 이미지`}
                className="object-cover"
                fill
                sizes="(max-width: 767px) 90vw, 624px"
                src={secondaryImage}
              />
            </div>
          </figure>
        ) : null}
      </div>
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
  const ratingValues = reviews
    .map((review) => review.rating)
    .filter((rating): rating is number => typeof rating === "number");
  const averageRating = ratingValues.length
    ? ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length
    : null;
  const ratingText = averageRating === null ? "0.0" : averageRating.toFixed(1);
  const countText = String(reviews.length).padStart(2, "0");

  return (
    <section
      className="flex min-h-[1076px] w-full scroll-mt-[calc(max(56px,4.861vw)+42px)] flex-col items-center gap-4 pb-10 max-md:scroll-mt-[104px]"
      id="detail-section-reviews"
    >
      <SectionTitle title="누비어 후기" />

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

      <div className="flex w-full flex-col max-md:w-full">
        {visibleReviews.length > 0 ? (
          visibleReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              reviewListHref={reviewListHref}
            />
          ))
        ) : (
          <>
            <NuvioEmptyState
              className="min-h-[173px] border-b border-[#F5E1D3] max-md:w-full"
              compact
              label="누비어 후기"
            />
          </>
        )}
      </div>

      <Link
        className="flex h-[29px] w-full items-center justify-center rounded bg-[#FFF6EC] p-0 text-xs font-medium leading-[1.253] text-[#FF9A3D]"
        href={reviewListHref}
      >
        누비어 후기 전체보기
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
      className={`flex w-full flex-col items-start border-b border-[#F5E1D3] px-8 py-4 max-md:w-full max-md:px-4 ${
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
      <p className="mt-2 line-clamp-3 max-h-[58px] w-full overflow-hidden px-2 text-xs font-normal leading-[1.6] text-[#2B1E17] max-md:w-full">
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
            className="pointer-events-none absolute left-[-11px] right-[-11px] top-[50px] flex h-[20.5px] items-center justify-between text-white opacity-0 transition-opacity group-hover/gallery:opacity-100 group-focus-within/gallery:opacity-100 max-md:hidden"
          >
            <ChevronLeft className="size-[20.5px]" />
            <ChevronRight className="size-[20.5px]" />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GuideInfoRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="grid min-h-[52px] w-full grid-cols-[96px_minmax(0,1fr)] gap-4 border-b border-[#F5E1D3] px-2 py-[17px] text-sm leading-[1.253] max-md:grid-cols-1 max-md:gap-2">
      <strong className="font-normal text-[#5B3A29]">{label}</strong>
      <div className="flex flex-col gap-1.5 text-xs font-medium leading-[1.65] text-[#6D7A8A]">
        {values.map((value, index) => (
          <p className="break-keep" key={`${value}-${index}`}>
            {value}
          </p>
        ))}
      </div>
    </div>
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
    <div className="flex h-[33px] w-full items-center gap-2 rounded-[3px] border border-[#F5E1D3] bg-[#FCFCFC] p-1.5 min-[1440px]:h-[2.292vw] min-[1440px]:p-[0.417vw] max-md:w-full">
      <span className="flex-1 text-xs font-semibold leading-[1.253] text-[#5B3A29]">
        {label}
      </span>
      <button
        className="flex h-[21px] items-center gap-[3px] rounded-[3px] border-0 bg-[#FF9A3D] px-[7px] py-px text-xs font-normal leading-[1.6] text-[#FCFCFC] min-[1440px]:h-[1.458vw] min-[1440px]:px-[0.486vw]"
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
