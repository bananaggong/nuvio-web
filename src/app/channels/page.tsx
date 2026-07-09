import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { createSeoMetadata } from "@/lib/seo";
import { listPublicVillages } from "@/lib/village-db";
import { canonicalChannelPath } from "@/lib/channel-routing";
import type { Village } from "@/lib/village-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = createSeoMetadata({
  title: "누비오 채널",
  description:
    "누비오에 등록된 청년마을, 로컬 체류지, 워케이션 채널을 모아봅니다.",
  path: "/channels",
  keywords: ["채널", "청년마을", "워케이션", "로컬 체류지"],
});

export default async function ChannelsPage() {
  const villages = await listPublicVillages();

  return (
    <main className="min-h-screen bg-white font-pretendard text-[#5B3A29]">
      <section className="flex min-h-screen w-full flex-col items-center px-[2.083vw] pb-[6.25vw] pt-[4.514vw] max-md:pt-10">
        <h1 className="text-[32px] font-medium leading-none text-[#5B3A29]">
          누비오 채널
        </h1>

        {villages.length > 0 ? (
          <div className="mt-[clamp(40px,2.778vw,53.333px)] grid w-[min(100%,clamp(1085px,75.3472vw,1446.667px))] grid-cols-3 gap-x-[clamp(25px,1.7361vw,33.333px)] gap-y-[clamp(42px,2.9167vw,56px)] max-lg:grid-cols-2 max-md:w-[88vw] max-md:grid-cols-1 max-md:gap-y-7">
            {villages.map((village) => (
              <ChannelProfileCard key={village.slug} village={village} />
            ))}
          </div>
        ) : (
          <NuvioEmptyState
            className="mt-[clamp(40px,2.778vw,53.333px)] w-[min(100%,clamp(1085px,75.3472vw,1446.667px))] rounded-[clamp(10px,0.6944vw,13.333px)] bg-[#f8f8f8] max-md:w-[88vw]"
            label="채널"
          />
        )}
      </section>
    </main>
  );
}

function ChannelProfileCard({ village }: { village: Village }) {
  return (
    <Link
      className="group flex min-h-[clamp(430px,29.8611vw,573.333px)] min-w-0 flex-col overflow-hidden rounded-[clamp(10px,0.6944vw,13.333px)] bg-[#FCFCFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FE701E]"
      href={canonicalChannelPath(village.slug)}
    >
      <ChannelImage village={village} />
      <div className="flex flex-1 flex-col px-[clamp(22px,1.5278vw,29.333px)] pb-[clamp(26px,1.8056vw,34.667px)] pt-[clamp(24px,1.6667vw,32px)]">
        <p className="line-clamp-1 text-[clamp(13px,0.9028vw,17.333px)] font-normal leading-[1.253] text-[#6D7A8A]">
          {village.region} {village.city}
        </p>
        <h2 className="font-gangwon-saeeum mt-[clamp(12px,0.8333vw,16px)] line-clamp-2 text-[clamp(24px,1.6667vw,32px)] font-medium leading-[1.253] text-black">
          {village.name}
        </h2>
        <p className="mt-[clamp(16px,1.1111vw,21.333px)] line-clamp-3 text-[clamp(14px,0.9722vw,18.667px)] font-normal leading-[1.65] text-[#6D7A8A]">
          {village.summary || village.tagline}
        </p>
      </div>
    </Link>
  );
}

function ChannelImage({ village }: { village: Village }) {
  const image = village.heroImage?.trim() || village.profileImage?.trim();

  if (!image) {
    return (
      <div
        className="grid h-[clamp(258px,17.9167vw,344px)] w-full shrink-0 place-items-center overflow-hidden text-[clamp(22px,1.5278vw,29.333px)] font-semibold leading-none text-white"
        style={{ backgroundColor: village.brandColor || "#D9D9D9" }}
      >
        {getAvatarLabel(village)}
      </div>
    );
  }

  return (
    <div className="relative h-[clamp(258px,17.9167vw,344px)] w-full shrink-0 overflow-hidden bg-[#D9D9D9]">
      <Image
        alt={`${village.name} 채널 이미지`}
        className="object-cover transition duration-500 ease-out group-hover:scale-[1.035]"
        fill
        sizes="(min-width: 1920px) 460px, (min-width: 1024px) 32vw, (min-width: 768px) 44vw, 88vw"
        src={image}
      />
    </div>
  );
}

function getAvatarLabel(village: Village) {
  const label = village.logoText?.trim() || village.name.trim() || "채";
  return Array.from(label).slice(0, 2).join("");
}
