import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "누비오 소식지",
  description: "누비오의 로컬 체류 프로그램 소식과 이야기를 확인하세요.",
  path: "/magazine",
  keywords: ["누비오 소식지", "로컬 라이프", "로컬 체류 프로그램"],
});

const magazineItems = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  title: "로컬에서 시작한 새로운 이야기",
  description: "누비어에게 전하는 프로그램과 지역 소식을 모았어요.",
  author: "누비오",
}));

export default function MagazinePage() {
  return (
    <div className="font-pretendard bg-white">
      <section className="flex min-h-screen w-full flex-col items-center px-[2.083vw] pb-[6.25vw] pt-[4.514vw] max-md:pt-10">
        <h1 className="text-[1.042vw] font-medium leading-none text-[#5B3A29] max-md:text-sm">
          누비오 소식지
        </h1>

        <div className="mt-[2.778vw] grid w-[52.778vw] grid-cols-2 gap-x-[1.389vw] gap-y-[3.472vw] max-md:w-[88vw] max-md:gap-x-3 max-md:gap-y-8">
          {magazineItems.map((item) => (
            <article className="flex min-w-0 flex-col items-center text-center" key={item.id}>
              <div className="aspect-[368/259] w-full rounded-[0.694vw] bg-[#D9D9D9]" />
              <h2 className="mt-[1.25vw] text-[0.694vw] font-semibold leading-none text-[#2B1E17] max-md:text-[10px]">
                {item.title}
              </h2>
              <p className="mt-[0.764vw] text-[0.625vw] font-medium leading-none text-[#2B1E17] max-md:text-[9px]">
                {item.description}
              </p>
              <p className="mt-[1.875vw] text-[0.625vw] font-semibold leading-none text-[#2B1E17] max-md:text-[9px]">
                {item.author}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
