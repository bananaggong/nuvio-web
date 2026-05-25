import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { createSeoMetadata } from "@/lib/seo";
import { listPublicVillages } from "@/lib/village-db";
import { villagePath } from "@/lib/village-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = createSeoMetadata({
  title: "로컬채널",
  description:
    "누비오에 등록된 청년마을, 로컬 체류지, 워케이션 마을의 로컬페이지를 모아봅니다.",
  path: "/villages",
  keywords: ["로컬페이지", "청년마을", "워케이션 마을", "로컬 체류지"],
});

export default async function VillagesPage() {
  const villages = await listPublicVillages();

  return (
    <div className="bg-white">
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
                로컬페이지 열기
                <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
