import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, CheckCircle2, MapPinned } from "lucide-react";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { ProgramCard } from "@/components/program-card";
import { formatDate } from "@/lib/format";
import { listPublicPrograms } from "@/lib/public-program-db";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "반값여행",
  description:
    "여행경비 일부를 지역상품권 또는 페이백으로 돌려받는 반값여행형 프로그램을 모아 확인하세요.",
  path: "/half-price-travel",
  keywords: ["반값여행", "여행 페이백", "지역상품권", "여행경비 지원"],
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HalfPriceTravelPage() {
  const programs = await listPublicPrograms();
  const halfPrograms = programs.filter((program) => program.categories.includes("half"));
  const schedule = halfPrograms.map((program) => [
    formatDate(program.recruitStart),
    [program.region, program.city].filter(Boolean).join(" "),
  ] as const);

  return (
    <div>
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-orange-50 px-3 py-2 text-sm font-black text-orange-700">
              <BadgePercent size={18} />
              여행경비 페이백 가이드
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              반값여행,
              <br />
              사전 신청이 절반입니다.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              지역에서 사용한 숙박, 식음, 체험 경비 일부를 환급받는 프로그램은
              여행 전 승인과 증빙 관리가 핵심입니다. 누비오에서 현재 열릴 예정인
              페이백형 지원사업을 한 번에 확인하세요.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center gap-2 rounded-md bg-[var(--primary)] px-5 text-sm font-black text-white hover:bg-[var(--primary-strong)]"
                href="/?theme=half"
              >
                프로그램 보기
                <ArrowRight size={18} />
              </Link>
              <a
                className="inline-flex h-12 items-center gap-2 rounded-md border border-slate-200 px-5 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                href="#guide"
              >
                정산 체크리스트
              </a>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
            <Image
              alt="지역 여행 중 영수증과 지도를 확인하는 여행자"
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 520px"
              src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-8 md:px-8 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <MapPinned className="text-[var(--primary)]" size={22} />
            지역별 오픈 흐름
          </h2>
          {schedule.length > 0 ? (
            <div className="mt-5 space-y-3">
              {schedule.map(([date, location]) => (
                <div
                  className="grid grid-cols-[90px_1fr] gap-4 rounded-md bg-[var(--surface-muted)] p-3 text-sm"
                  key={`${date}-${location}`}
                >
                  <div className="font-black text-[var(--primary)]">{date}</div>
                  <div className="font-bold text-slate-700">{location}</div>
                </div>
              ))}
            </div>
          ) : (
            <NuvioEmptyState
              className="mt-5 bg-[var(--surface-muted)]"
              description="새 모집이 등록되면 지역별 일정을 확인할 수 있어요."
              label="지역별 오픈 일정"
            />
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5" id="guide">
          <h2 className="text-xl font-black text-slate-950">정산 체크리스트</h2>
          <div className="mt-5 grid gap-3">
            {[
              "여행 전 사전 신청과 승인 여부 확인",
              "숙박, 식당, 체험 영수증을 날짜별로 보관",
              "지역 외 지출과 지원 제외 업종 구분",
              "모바일 지역상품권 사용 가능 가맹점 확인",
              "공식 공고의 환급 기한과 제출 양식 확인",
            ].map((item) => (
              <div className="flex gap-3 text-sm font-bold text-slate-700" key={item}>
                <CheckCircle2 className="mt-0.5 text-[var(--primary)]" size={18} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 md:px-8">
        <div className="mb-4">
          <h2 className="text-2xl font-black text-slate-950">반값여행 관련 모집</h2>
          <p className="mt-1 text-sm text-slate-500">
            예산 소진과 조기마감이 잦으니 신청 전 공고를 확인하세요.
          </p>
        </div>
        <div className="grid gap-4">
          {halfPrograms.length > 0 ? (
            halfPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))
          ) : (
            <NuvioEmptyState
              className="rounded-md border border-slate-200 bg-white"
              description="새 모집이 등록되면 이곳에서 확인할 수 있어요."
              label="반값여행 모집"
            />
          )}
        </div>
      </section>
    </div>
  );
}
