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
  MapPin,
  Minus,
  MoreHorizontal,
  Phone,
  Plus,
  Star,
  Tag,
  Ticket,
} from "lucide-react";
import { JsonLdScript } from "@/components/json-ld";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { ProgramGalleryCarousel } from "@/components/program-gallery-carousel";
import {
  ProgramScheduleCards,
  type ProgramScheduleItem,
} from "@/components/program-schedule-popover";
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
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
  ],
  badges: ["자유신청", "로컬체험", "여행지원"],
  body: [
    "지역의 일상과 자연을 천천히 경험하며 머무르는 여행 프로그램입니다.",
    "일정, 신청 방식, 후기 영역을 실제 콘텐츠로 교체하기 전까지 화면 구조를 확인할 수 있습니다.",
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
  const galleryImages = getProgramGalleryImages(program);
  const introImage = galleryImages[0] ?? "";
  const scheduleCards = getProgramScheduleItems(program, galleryImages);
  const placeDetails = getProgramPlaceDetails(program);

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

      <div className="relative mx-auto grid w-[71.597vw] grid-cols-[minmax(0,48.056vw)_minmax(0,20.625vw)] items-start gap-[2.917vw] pt-10 min-[1440px]:pt-[2.778vw] max-md:block max-md:w-[90vw] max-md:pt-7">
        <article className="flex w-full min-w-0 flex-col gap-[18px] min-[1440px]:gap-[1.25vw] max-md:w-full">
          <header className="flex h-[121px] w-full items-start justify-between pb-10 min-[1440px]:h-[8.403vw] min-[1440px]:pb-[2.778vw] max-md:h-auto max-md:min-h-[100px]">
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
                <Image
                  alt=""
                  aria-hidden="true"
                  className="size-5"
                  height={21}
                  src={nuvioIcons.share}
                  width={21}
                />
              </IconButton>
              <IconButton ariaLabel="저장하기">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-[17px]"
                  height={20}
                  src={nuvioIcons.bookmark}
                  width={17}
                />
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
            className="flex h-[886px] w-full flex-col pb-[30px] min-[1440px]:h-[61.528vw] min-[1440px]:pb-[2.083vw] max-md:h-[118vw] max-md:min-h-[420px] max-md:pb-0"
            id="detail-section-0"
          >
            <div
              aria-label="여행 소개 이미지 영역"
              className={`relative h-[856px] w-full overflow-hidden bg-[#D9D9D9] bg-cover bg-center min-[1440px]:h-[59.444vw] max-md:h-[118vw] max-md:min-h-[420px] ${
                introImage ? "" : "bg-[linear-gradient(135deg,#E9E2DB,#D9D9D9)]"
              }`}
              style={
                introImage
                  ? { backgroundImage: `url("${escapeCssUrl(introImage)}")` }
                  : undefined
              }
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-8 text-white max-md:p-5">
                <p className="max-w-[580px] break-keep text-base font-semibold leading-[1.55] drop-shadow">
                  {program.summary}
                </p>
                <div className="flex max-w-[580px] flex-col gap-2 text-sm font-medium leading-[1.7] text-white/90 drop-shadow">
                  {program.body.slice(0, 2).map((paragraph, index) => (
                    <p className="break-keep" key={`${paragraph}-${index}`}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            className="flex min-h-[496px] w-full flex-col gap-[18px] pb-10"
            id="detail-section-1"
          >
            <SectionTitle title="여행 일정" />
            <ProgramScheduleCards items={scheduleCards} popupItems={floatingSchedule} />
          </section>

          <ParticipantReviewSection
            reviewListHref={reviewListHref}
            reviews={programReviews}
          />

          <section
            className="flex min-h-[932px] w-full flex-col items-center gap-7 pb-10 min-[1440px]:min-h-[64.722vw] max-md:w-full"
            id="detail-section-3"
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
                <a
                  className="flex items-center gap-[11px] text-sm font-medium leading-[1.253] text-[#6D7A8A]"
                  href={program.sourceUrl || "#"}
                  rel="noreferrer"
                  target={program.sourceUrl ? "_blank" : undefined}
                >
                  <Mail aria-hidden="true" className="size-5 text-[#FF9A3D]" />
                  {program.sourceName}
                </a>
              </div>
            </div>

            <div
              aria-label="지도 영역"
              className="flex h-[243px] w-[45.972vw] flex-col items-center justify-center gap-3 rounded-md bg-[#F7F5F3] px-8 text-center text-sm font-medium leading-[1.55] text-[#6D7A8A] min-[1440px]:h-[16.875vw] max-md:w-full"
            >
              <MapPin aria-hidden="true" className="size-7 text-[#FE701E]" />
              <span className="break-keep">{placeDetails.meetingAddress}</span>
            </div>

            <section
              className="flex w-full flex-col items-center gap-7 max-md:w-full"
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
                    className="h-[188px] w-full bg-[#D9D9D9] min-[1440px]:h-[13.056vw] max-md:w-full"
                  />
                </div>
              </div>
            </section>
          </section>
        </article>

        <aside className="sticky top-[86px] flex w-full min-w-0 flex-col items-start gap-[11px] self-start min-[1440px]:gap-[0.764vw] max-md:static max-md:mt-[34px] max-md:w-full">
          <section
            className="flex min-h-[333px] w-full flex-col items-center gap-[17px] rounded-md border border-[#F5E1D3] bg-[#FCFCFC] p-4 min-[1440px]:min-h-[23.125vw] min-[1440px]:gap-[1.181vw] min-[1440px]:p-[1.111vw] max-md:w-full"
            id="apply"
          >
            <div className="grid min-h-[35px] w-[93.208%] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center rounded-[7px] border-[0.5px] border-[#F5E1D3] min-[1440px]:min-h-[2.431vw] max-md:w-full max-md:grid-cols-2">
              <div className="flex min-w-0 items-center justify-center gap-1 p-2 min-[1440px]:gap-[0.278vw] min-[1440px]:p-[0.556vw]">
                <strong className="shrink-0 whitespace-nowrap text-xs font-medium leading-[1.253] text-[#5B3A29]">
                  일정
                </strong>
                <span className="min-w-0 whitespace-nowrap text-xs font-normal leading-[1.6] text-[#6D7A8A]">
                  {formatCompactDateRange(program.activityStart, program.activityEnd)}
                </span>
              </div>
              <div className="flex min-w-0 items-center justify-center gap-1 border-l-[0.5px] border-[#F5E1D3] p-2 min-[1440px]:gap-[0.278vw] min-[1440px]:p-[0.556vw]">
                <strong className="shrink-0 whitespace-nowrap text-xs font-medium leading-[1.253] text-[#5B3A29]">
                  모집
                </strong>
                <span className="min-w-0 whitespace-nowrap text-xs font-normal leading-[1.6] text-[#6D7A8A]">
                  {program.capacity}
                </span>
              </div>
            </div>
            <p className="-mt-3.5 mr-[13px] w-full text-right text-xs font-normal leading-[1.6] text-[#6D7A8A]">
              ~{formatKoreanDate(program.recruitEnd)}
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
              {program.title}
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

          <div className="flex w-full flex-col gap-[9px] min-[1440px]:gap-[0.625vw] max-md:w-full">
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
          <div className="flex min-h-[173px] w-full items-center justify-center border-b border-[#F5E1D3] px-8 py-4 text-sm text-[#6D7A8A] max-md:w-full max-md:px-4">
            아직 등록된 누비어 후기가 없어요.
          </div>
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

function getProgramGalleryImages(program: Program): string[] {
  const itineraryImages =
    program.itineraryDays?.flatMap((day) => [day.image, ...day.images]) ?? [];
  const images = [program.image, ...program.gallery, ...itineraryImages]
    .map((image) => image.trim())
    .filter(isDisplayableProgramImage);

  return Array.from(new Set(images));
}

function getProgramScheduleItems(
  program: Program,
  galleryImages: string[],
): ProgramScheduleItem[] {
  const itineraryDays =
    program.itineraryDays?.filter((day) =>
      [day.title, day.summary, day.timetable, day.image, ...day.images].some((value) =>
        value.trim(),
      ),
    ) ?? [];

  if (itineraryDays.length > 0) {
    return itineraryDays.map((day, index) => {
      const timetable = splitTimetable(day.timetable);
      const dayImages = [day.image, ...day.images]
        .map((image) => image.trim())
        .filter(isDisplayableProgramImage);
      return {
        body:
          day.summary ||
          timetable[0] ||
          `${program.title} ${index + 1}일차 일정입니다.`,
        day: day.title || `${index + 1}일차`,
        image: dayImages[0] || galleryImages[index + 1] || galleryImages[0],
        timetable,
      };
    });
  }

  return scheduleItems.map((item, index) => ({
    ...item,
    image: galleryImages[index + 1] || galleryImages[0],
  }));
}

function getProgramPlaceDetails(program: Program): {
  accommodation: string;
  meetingAddress: string;
  meetingMemo: string;
  parkingGuide: string;
  transportGuide: string;
} {
  const placeInfo = program.placeInfo;
  const meetingAddress =
    joinText([placeInfo?.meetingAddress, placeInfo?.meetingAddressDetail]) ||
    joinText([program.region, program.city]) ||
    "집결지 정보는 준비 중입니다.";

  const accommodation = placeInfo?.accommodationEnabled
    ? joinText([placeInfo.accommodationName, placeInfo.accommodationMemo]) ||
      "숙소 정보는 신청 확정 후 안내됩니다."
    : "";

  return {
    accommodation,
    meetingAddress,
    meetingMemo: placeInfo?.meetingMemo?.trim() ?? "",
    parkingGuide:
      placeInfo?.parkingGuide?.trim() ||
      "주차 가능 여부와 이용 방법은 신청 확정 후 안내됩니다.",
    transportGuide:
      placeInfo?.transportGuide?.trim() ||
      "대중교통, 셔틀, 도보 이동 등 상세 이동 안내는 신청 확정 후 안내됩니다.",
  };
}

function splitTimetable(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinText(values: Array<string | undefined>): string {
  return values.map((value) => value?.trim()).filter(Boolean).join(" ");
}

function formatCompactDateRange(start: string, end: string): string {
  const startDate = parseDateParts(start);
  const endDate = parseDateParts(end);
  if (!startDate || !endDate) return joinText([start, end]);

  if (startDate.year === endDate.year) {
    return `${startDate.year}.${startDate.month}.${startDate.day}-${endDate.month}.${endDate.day}`;
  }

  return `${startDate.year}.${startDate.month}.${startDate.day}-${endDate.year}.${endDate.month}.${endDate.day}`;
}

function formatKoreanDate(value: string): string {
  const date = parseDateParts(value);
  if (!date) return value;
  return `${date.year}년 ${date.month}월 ${date.day}일`;
}

function parseDateParts(value: string):
  | {
      day: number;
      month: number;
      year: number;
    }
  | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (!match) return null;

  return {
    day: Number(match[3]),
    month: Number(match[2]),
    year: Number(match[1]),
  };
}

function isDisplayableProgramImage(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)
  );
}

function escapeCssUrl(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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
