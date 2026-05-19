"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { programPath } from "@/lib/program-routing";
import type { Program } from "@/lib/types";

export function ProgramExplorer({ programs }: { programs: Program[] }) {
  const featuredPrograms = programs.slice(0, 6);
  const heroProgram = featuredPrograms[0];

  return (
    <div className="font-pretendard bg-white">
      <section className="mx-auto w-full px-[2.083vw] pb-[5.833vw] pt-[3.472vw]">
        <div className="group relative mx-auto flex aspect-[1074/420] w-[74.583vw] items-center justify-between overflow-hidden rounded-[1.25vw] bg-[#778696] px-[2.361vw] text-white">
          {heroProgram ? (
            <Image
              alt={heroProgram.title}
              className="object-cover"
              fill
              priority
              sizes="75vw"
              src={heroProgram.image}
            />
          ) : null}
          <div className="absolute inset-0 bg-black/35" />
          <button
            aria-label="이전 배너"
            className="pointer-events-none relative z-10 inline-flex size-[3.333vw] items-center justify-center text-[#FFB25F] opacity-0 transition-[color,opacity] hover:text-[#FF9A3D] group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-[3.75vw]" strokeWidth={1.7} />
          </button>

          <div className="relative z-10 flex min-w-0 flex-col items-center text-center">
            <h1 className="max-w-[38vw] text-[2.083vw] font-bold leading-[1.45] tracking-normal text-white">
              {heroProgram?.title ?? "누비오 로컬 체류 프로그램"}
            </h1>
            <p className="mt-[1.944vw] max-w-[36vw] text-[0.972vw] font-semibold leading-[1.5] text-white/85">
              {heroProgram?.summary ??
                "지역에서 머무르며 일하고 쉬는 프로그램을 찾아보세요."}
            </p>

            <div className="mt-[6.25vw] flex items-center gap-[1.181vw]">
              {Array.from({ length: Math.min(Math.max(featuredPrograms.length, 1), 4) }).map((_, dot) => (
                <span
                  aria-hidden="true"
                  className={`size-[0.556vw] rounded-full ${
                    dot === 0 ? "bg-[#FFB25F]" : "bg-[#E8E7E2]"
                  }`}
                  key={dot}
                />
              ))}
            </div>
          </div>

          <button
            aria-label="다음 배너"
            className="pointer-events-none relative z-10 inline-flex size-[3.333vw] items-center justify-center text-[#FFB25F] opacity-0 transition-[color,opacity] hover:text-[#FF9A3D] group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-[3.75vw]" strokeWidth={1.7} />
          </button>
        </div>

        <section className="mx-auto mt-[3.472vw] w-[74.583vw]">
          <div>
            <h2 className="text-[1.389vw] font-semibold leading-none text-[#5B3A29]">
              추천 프로그램
            </h2>
            <p className="mt-[0.833vw] text-[0.764vw] font-medium leading-none text-[#9BA3AE]">
              지금 신청할 수 있는 로컬 체류 프로그램
            </p>
          </div>

          <div className="mt-[1.667vw] grid gap-x-[1.528vw] gap-y-[4.028vw] md:grid-cols-3">
            {featuredPrograms.map((program) => (
              <article className="group min-w-0" key={`${program.id}-${program.slug}`}>
                <Link
                  aria-label={`${program.title} 상세 보기`}
                  className="relative block aspect-[343/346] w-full overflow-hidden rounded-[0.833vw] bg-[#D9D9D9]"
                  href={programPath(program)}
                >
                  <Image
                    alt={program.title}
                    className="object-cover transition duration-300 group-hover:scale-105"
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    src={program.image}
                  />
                </Link>
                <div className="pt-[1.389vw]">
                  <p className="text-[0.694vw] font-medium leading-none text-[#9BA3AE]">
                    {program.region} {program.city}
                  </p>
                  <Link href={programPath(program)}>
                    <h3 className="mt-[0.972vw] line-clamp-2 text-[1.111vw] font-semibold leading-[1.35] text-[#5B3A29] transition group-hover:text-[#F97316]">
                      {program.title}
                    </h3>
                  </Link>
                  <p className="mt-[1.25vw] line-clamp-2 text-[0.764vw] font-medium leading-[1.7] text-[#B4BAC3]">
                    {program.summary}
                  </p>
                  <p className="mt-[1.667vw] text-[0.694vw] font-medium leading-none text-[#9BA3AE]">
                    {program.sourceName}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {featuredPrograms.length === 0 ? (
            <div className="mt-[1.667vw] rounded-[0.833vw] border border-[#E8E7E2] px-[1.667vw] py-[2.222vw] text-[0.833vw] font-semibold text-[#9BA3AE]">
              공개된 프로그램이 없습니다.
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}
