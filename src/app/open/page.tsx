import type { Metadata } from "next";
import Image from "next/image";
import {
  OPEN_LANDING_SEGMENTS,
  OPEN_LANDING_WIDTH,
  OPEN_LAUNCH_BANNER_PATH,
  OPEN_LAUNCH_DESCRIPTION,
  OPEN_LAUNCH_PATH,
  OPEN_LAUNCH_TITLE,
} from "@/lib/open-launch";
import { absoluteUrl, createSeoMetadata } from "@/lib/seo";

const baseMetadata = createSeoMetadata({
  absoluteTitle: OPEN_LAUNCH_TITLE,
  description: OPEN_LAUNCH_DESCRIPTION,
  image: OPEN_LAUNCH_BANNER_PATH,
  path: OPEN_LAUNCH_PATH,
  keywords: ["누비오 오픈", "로컬 여행", "동네 여행", "로컬 여행 예약"],
});

export const metadata: Metadata = {
  ...baseMetadata,
  openGraph: {
    ...baseMetadata.openGraph,
    images: [
      {
        url: absoluteUrl(OPEN_LAUNCH_BANNER_PATH),
        width: 1074,
        height: 420,
        alt: OPEN_LAUNCH_TITLE,
      },
    ],
  },
  twitter: {
    ...baseMetadata.twitter,
    images: [absoluteUrl(OPEN_LAUNCH_BANNER_PATH)],
  },
};

export default function OpenLandingPage() {
  return (
    <article className="bg-white">
      <div className="sr-only">
        <h1>{OPEN_LAUNCH_TITLE}</h1>
        <p>{OPEN_LAUNCH_DESCRIPTION}</p>

        <section>
          <h2>여행정보, 찾다가 지쳐본적 있나요?</h2>
          <p>이 지역에 어떤 프로그램이 있는지, 찾기가 너무 어려워요.</p>
          <p>예약은 전화하고 계좌이체하고, 절차가 너무 번거로워요.</p>
        </section>

        <section>
          <h2>그래서, 만들었어요</h2>
          <p>전국 구석구석 흩어진 로컬 여행,</p>
          <p>진짜 동네주민이 이끄는 감다살 동네 여행</p>
          <p>한눈에 보고, 온몸으로 느껴보세요.</p>
        </section>

        <section>
          <h2>내가 항상 바라던, 로컬 여행 찾기</h2>
          <p>테마를 먼저 골라도, 지역으로 먼저 골라도 좋아요.</p>
        </section>

        <section>
          <h2>검증된 호스트 안심하고 다녀오세요</h2>
          <p>호스트 비대면 인터뷰</p>
          <p>사업자·신고 정보 검증</p>
          <p>여행자 후기 상시 모니터링</p>
          <p>누비오와 함께 운영 관리</p>
          <p>
            누비오에 등록된 모든 호스트 프로그램은 사전 비대면 인터뷰와
            서류 확인을 거쳐요. 등록 이후에도 여행자 후기와 운영 현황을 계속
            살펴보니, 안심하고 예약하셔도 좋아요.
          </p>
        </section>

        <section>
          <h2>누비오 정식으로 인사드려요!</h2>
          <p>
            이제 각 지역의 특별한 로컬 여행을 ‘누비오’에서 바로 예약할 수
            있어요. 오래 준비한 만큼, 더 좋은 경험으로 보답할게요.
          </p>
          <p>첫 발걸음을 함께해주셔서 고마워요.</p>
        </section>
      </div>

      <div
        className="mx-auto w-[calc(74.583333vw+0.01px)] max-w-[1432px] max-md:w-full"
        data-open-landing-artwork="true"
      >
        {OPEN_LANDING_SEGMENTS.map((segment, index) => (
          <Image
            alt=""
            aria-hidden="true"
            className="block h-auto w-full"
            height={segment.height}
            key={segment.src}
            src={segment.src}
            unoptimized
            width={OPEN_LANDING_WIDTH}
            {...(index === 0
              ? { preload: true }
              : { loading: "lazy" as const })}
          />
        ))}
      </div>
    </article>
  );
}
