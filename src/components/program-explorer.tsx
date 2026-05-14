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
      <section className="mx-auto w-full max-w-[1440px] px-5 pb-[84px] pt-[50px]">
        <div className="mx-auto flex h-[420px] w-full max-w-[1074px] items-center justify-between rounded-[18px] bg-[#778696] px-[34px] text-black">
          <button
            aria-label="이전 배너"
            className="inline-flex size-12 items-center justify-center text-[#FFB25F] transition-colors hover:text-[#FF9A3D]"
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={54} strokeWidth={1.7} />
          </button>

          <div className="flex min-w-0 flex-col items-center text-center">
            <h1 className="text-[26px] font-bold leading-[1.45] tracking-normal text-black md:text-[30px]">
              배너에 들어갈
              <br />
              내용을 작성하세요
            </h1>
            <p className="mt-[28px] text-[14px] font-semibold leading-none text-black">
              배너에 들어갈 서브 텍스트를 작성하세요
            </p>

            <div className="mt-[90px] flex items-center gap-[17px]">
              {[0, 1, 2, 3].map((dot) => (
                <span
                  aria-hidden="true"
                  className={`size-[8px] rounded-full ${
                    dot === 2 ? "bg-[#FFB25F]" : "bg-[#E8E7E2]"
                  }`}
                  key={dot}
                />
              ))}
            </div>
          </div>

          <button
            aria-label="다음 배너"
            className="inline-flex size-12 items-center justify-center text-[#FFB25F] transition-colors hover:text-[#FF9A3D]"
            type="button"
          >
            <ChevronRight aria-hidden="true" size={54} strokeWidth={1.7} />
          </button>
        </div>

        <section className="mx-auto mt-[50px] w-full max-w-[1074px]">
          <div>
            <h2 className="text-[20px] font-semibold leading-none text-[#5B3A29]">
              해당 섹션의 타이틀 작성
            </h2>
            <p className="mt-[12px] text-[11px] font-medium leading-none text-[#9BA3AE]">
              섹션의 서브 타이틀 작성 (있어도 됨)
            </p>
          </div>

          <div className="mt-[24px] grid gap-x-[22px] gap-y-[58px] md:grid-cols-3">
            {featuredCards.map((card) => (
              <article className="min-w-0" key={card.id}>
                <div className="h-[346px] w-full rounded-[12px] bg-[#D9D9D9]" />
                <div className="pt-[20px]">
                  <p className="text-[10px] font-medium leading-none text-[#9BA3AE]">
                    {card.category}
                  </p>
                  <h3 className="mt-[14px] text-[16px] font-semibold leading-none text-[#5B3A29]">
                    {card.title}
                  </h3>
                  <p className="mt-[18px] line-clamp-2 text-[11px] font-medium leading-[1.7] text-[#B4BAC3]">
                    {card.description}
                  </p>
                  <p className="mt-[24px] text-[10px] font-medium leading-none text-[#9BA3AE]">
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
