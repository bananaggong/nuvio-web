import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import {
  getChannelMenuDisplayLabel,
  getVisibleChannelMenuItems,
} from "@/lib/channel-menu";
import { createSeoMetadata } from "@/lib/seo";
import { listPublicVillages } from "@/lib/village-db";
import { canonicalVillagePath } from "@/lib/village-routing";
import type { Village } from "@/lib/village-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = createSeoMetadata({
  title: "채널",
  description:
    "누비오에 등록된 청년마을, 로컬 체류지, 워케이션 채널을 모아봅니다.",
  path: "/channels",
  keywords: ["채널", "청년마을", "워케이션", "로컬 체류지"],
});

export default async function ChannelsPage() {
  const villages = await listPublicVillages();

  return (
    <main className="min-h-screen bg-[#F9F9F9] font-pretendard text-[#5B3A29]">
      <section className="border-b border-[#F1E7DF] bg-white">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-5 py-10 md:flex-row md:items-end md:justify-between md:px-8 md:py-12">
          <div>
            <p className="text-[13px] font-semibold leading-[1.253] text-[#FF9A3D]">
              누비오 채널
            </p>
            <h1 className="mt-3 text-[32px] font-semibold leading-[1.253] text-[#0D0D0C] md:text-[40px]">
              채널
            </h1>
            <p className="mt-4 max-w-[560px] text-[16px] font-medium leading-[1.65] text-[#6D7A8A]">
              지역 호스트의 프로그램과 소식을 한곳에서 둘러보세요.
            </p>
          </div>
          <p className="inline-flex w-fit items-center rounded-full border border-[#F5E1D3] bg-[#FFF8F1] px-4 py-2 text-[14px] font-semibold leading-none text-[#5B3A29]">
            전체 {villages.length.toLocaleString("ko-KR")}개 채널
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-5 py-8 md:px-8 md:py-10">
        {villages.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {villages.map((village) => (
              <ChannelProfileCard key={village.slug} village={village} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-[8px] border border-dashed border-[#D9D9D9] bg-white text-[15px] font-medium text-[#6D7A8A]">
            공개된 채널이 아직 없어요.
          </div>
        )}
      </section>
    </main>
  );
}

function ChannelProfileCard({ village }: { village: Village }) {
  const menuLabels = getVisibleChannelMenuItems(village)
    .filter((item) => item.kind !== "program")
    .map((item) => getChannelMenuDisplayLabel(item))
    .filter((label, index, labels) => labels.indexOf(label) === index);
  const menuPreview = menuLabels.slice(0, 3);
  const programCount = village.programIds.length;

  return (
    <Link
      className="group flex min-h-[360px] flex-col items-center rounded-[8px] border border-[#E7DDD5] bg-white px-6 py-7 text-center shadow-[0_8px_22px_rgba(91,58,41,0.04)] transition hover:border-[#FF9A3D] hover:shadow-[0_18px_42px_rgba(91,58,41,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF9A3D]"
      href={canonicalVillagePath(village.slug)}
    >
      <ChannelAvatar village={village} />

      <p className="mt-5 inline-flex max-w-full items-center gap-1.5 truncate text-[13px] font-semibold leading-[1.253] text-[#FF9A3D]">
        <MapPin aria-hidden="true" size={15} strokeWidth={2} />
        <span className="truncate">
          {village.region} {village.city}
        </span>
      </p>

      <h2 className="mt-3 line-clamp-1 text-[22px] font-semibold leading-[1.253] text-[#0D0D0C]">
        {village.name}
      </h2>
      <p className="mt-3 line-clamp-2 min-h-[52px] text-[15px] font-medium leading-[1.7] text-[#6D7A8A]">
        {village.summary}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <span className="rounded-full bg-[#FFF8F1] px-3 py-1.5 text-[12px] font-semibold leading-none text-[#5B3A29] ring-1 ring-[#F5E1D3]">
          {programCount > 0 ? `운영 프로그램 ${programCount}개` : "프로그램 준비중"}
        </span>
        {menuPreview.map((label) => (
          <span
            className="rounded-full bg-[#F9F9F9] px-3 py-1.5 text-[12px] font-semibold leading-none text-[#6D7A8A] ring-1 ring-[#E7DDD5]"
            key={label}
          >
            {label}
          </span>
        ))}
      </div>

      <span className="mt-auto inline-flex h-11 w-full max-w-[220px] items-center justify-center gap-2 rounded-[6px] bg-[#FF9A3D] px-4 text-[14px] font-semibold leading-none text-white transition group-hover:bg-[#F5851F]">
        채널 홈
        <ArrowRight aria-hidden="true" size={16} strokeWidth={2.1} />
      </span>
    </Link>
  );
}

function ChannelAvatar({ village }: { village: Village }) {
  const profileImage = village.profileImage?.trim();

  return (
    <span className="relative grid size-[104px] place-items-center overflow-hidden rounded-full border border-[#E7DDD5] bg-[#F3F3F3] shadow-[0_8px_18px_rgba(91,58,41,0.08)]">
      {profileImage ? (
        <Image
          alt={`${village.name} 채널 프로필`}
          className="object-cover"
          fill
          sizes="104px"
          src={profileImage}
        />
      ) : (
        <span
          className="grid size-full place-items-center text-[28px] font-semibold leading-none text-white"
          style={{ backgroundColor: village.brandColor || "#6D7A8A" }}
        >
          {getAvatarLabel(village)}
        </span>
      )}
    </span>
  );
}

function getAvatarLabel(village: Village) {
  const label = village.logoText?.trim() || village.name.trim() || "채";
  return Array.from(label).slice(0, 2).join("");
}
