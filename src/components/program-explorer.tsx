"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const featuredCards = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  category: "프로그램 지역 위치",
  title: "프로그램 제목 입력",
  description:
    "프로그램 소개 간략한 설명문을 작성해 주세요. 말이나 글자 길이가 너무 길지 않게 두 줄 정도로 생각해 봅니다.",
  host: "호스트명",
}));

export function ProgramExplorer() {
  return (
    <div className="font-pretendard bg-white">
      <section className="mx-auto w-full px-[2.083vw] pb-[5.833vw] pt-[3.472vw]">
        <div className="mx-auto flex aspect-[1074/420] w-[74.583vw] items-center justify-between rounded-[1.25vw] bg-[#778696] px-[2.361vw] text-black">
          <button
            aria-label="이전 배너"
            className="inline-flex size-[3.333vw] items-center justify-center text-[#FFB25F] transition-colors hover:text-[#FF9A3D]"
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-[3.75vw]" strokeWidth={1.7} />
          </button>

          <div className="flex min-w-0 flex-col items-center text-center">
            <h1 className="text-[2.083vw] font-bold leading-[1.45] tracking-normal text-black">
              배너에 들어갈
              <br />
              내용을 작성하세요
            </h1>
            <p className="mt-[1.944vw] text-[0.972vw] font-semibold leading-none text-black">
              배너에 들어갈 서브 텍스트를 작성하세요
            </p>

            <div className="mt-[6.25vw] flex items-center gap-[1.181vw]">
              {[0, 1, 2, 3].map((dot) => (
                <span
                  aria-hidden="true"
                  className={`size-[0.556vw] rounded-full ${
                    dot === 2 ? "bg-[#FFB25F]" : "bg-[#E8E7E2]"
                  }`}
                  key={dot}
                />
              ))}
            </div>
          </div>

          <button
            aria-label="다음 배너"
            className="inline-flex size-[3.333vw] items-center justify-center text-[#FFB25F] transition-colors hover:text-[#FF9A3D]"
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-[3.75vw]" strokeWidth={1.7} />
          </button>
        </div>

        <section className="mx-auto mt-[3.472vw] w-[74.583vw]">
          <div>
            <h2 className="text-[1.389vw] font-semibold leading-none text-[#5B3A29]">
              해당 섹션의 타이틀 작성
            </h2>
            <p className="mt-[0.833vw] text-[0.764vw] font-medium leading-none text-[#9BA3AE]">
              섹션의 서브 타이틀 작성 (있어도 됨)
            </p>
          </div>

          <div className="mt-[1.667vw] grid gap-x-[1.528vw] gap-y-[4.028vw] md:grid-cols-3">
            {featuredCards.map((card) => (
              <article className="min-w-0" key={card.id}>
                <div className="aspect-[343/346] w-full rounded-[0.833vw] bg-[#D9D9D9]" />
                <div className="pt-[1.389vw]">
                  <p className="text-[0.694vw] font-medium leading-none text-[#9BA3AE]">
                    {card.category}
                  </p>
                  <h3 className="mt-[0.972vw] text-[1.111vw] font-semibold leading-none text-[#5B3A29]">
                    {card.title}
                  </h3>
                  <p className="mt-[1.25vw] line-clamp-2 text-[0.764vw] font-medium leading-[1.7] text-[#B4BAC3]">
                    {card.description}
                  </p>
                  <p className="mt-[1.667vw] text-[0.694vw] font-medium leading-none text-[#9BA3AE]">
                    {card.host}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
