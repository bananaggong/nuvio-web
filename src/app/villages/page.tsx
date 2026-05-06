import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Globe2, MapPin } from "lucide-react";
import { listPublicVillages } from "@/lib/village-db";
import { villagePath } from "@/lib/village-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "로컬 홈 | NUVIO",
  description:
    "NUVIO에 등록된 청년마을, 로컬 체류지, 워케이션 마을의 공식 홈을 모아봅니다.",
};

export default async function VillagesPage() {
  const villages = await listPublicVillages();

  return (
    <div className="bg-white">
      <section className="border-b border-slate-200 bg-[var(--background)]">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <Globe2 size={18} />
            Local Home Directory
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
            각 마을의 모집, 공지, 후기, 커뮤니티를 하나의 공식 페이지로 엮습니다.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            MVP에서는 경로형 주소를 먼저 사용하고, 성장 단계에서 서브도메인과 커스텀 도메인을 열 수 있게 설계했습니다.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-10 md:grid-cols-2 md:px-8 lg:grid-cols-3">
        {villages.map((village) => (
          <Link
            className="group overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            href={villagePath(village.slug)}
            key={village.slug}
          >
            <div className="relative aspect-[4/3] bg-slate-100">
              <Image
                alt={`${village.name} 대표 이미지`}
                className="object-cover transition duration-300 group-hover:scale-105"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                src={village.heroImage}
              />
            </div>
            <div className="p-5">
              <p className="flex items-center gap-1.5 text-sm font-black text-[var(--primary)]">
                <MapPin size={16} />
                {village.region} {village.city}
              </p>
              <h2 className="mt-3 text-xl font-black leading-7 text-slate-950">
                {village.name}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                {village.summary}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-slate-900 group-hover:text-[var(--primary)]">
                로컬 홈 열기
                <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
