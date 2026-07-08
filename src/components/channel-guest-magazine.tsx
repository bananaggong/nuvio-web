import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ChannelProfileHeader,
  channelGuestScaleRootStyle,
  px,
} from "@/components/channel-guest-gallery";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { villagePath } from "@/lib/village-routing";
import type { VillageMediaContent } from "@/lib/types";
import type { Village } from "@/lib/village-types";

type ChannelGuestMagazinePageProps = {
  media: VillageMediaContent[];
  village: Village;
};

type MagazineItem = {
  date: string;
  href: string;
  id: string;
  image?: string;
  title: string;
};

const magazineGridStyle = {
  maxWidth: `calc(100% - ${px(337)})`,
  width: px(1103),
} as CSSProperties;

export function ChannelGuestMagazinePage({
  media,
  village,
}: ChannelGuestMagazinePageProps) {
  const homeHref = villagePath(village.slug);
  const items = buildMagazineItems(media, village);

  return (
    <div
      className="min-h-screen overflow-x-clip bg-white font-pretendard text-[#5B3A29]"
      style={channelGuestScaleRootStyle}
    >
      <main className="mx-auto w-full max-w-[1920px]">
        <ChannelProfileHeader activeTab="magazine" homeHref={homeHref} village={village} />

        <section
          className="mx-auto"
          style={{
            ...magazineGridStyle,
            paddingBottom: px(82),
            paddingTop: px(22),
          }}
        >
          {items.length > 0 ? (
            <div
              className="grid"
              style={{
                columnGap: px(43),
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                rowGap: px(43),
              }}
            >
              {items.map((item) => (
                <MagazineCard item={item} key={item.id} />
              ))}
            </div>
          ) : (
            <ChannelMagazineEmptyState />
          )}
        </section>
      </main>
    </div>
  );
}

function MagazineCard({ item }: { item: MagazineItem }) {
  return (
    <article
      className="overflow-hidden bg-[#FCFCFC]"
      style={{
        borderRadius: px(16),
        height: px(550),
      }}
    >
      <Link
        className="relative block overflow-hidden bg-[#D9D9D9]"
        href={item.href}
        style={{
          borderTopLeftRadius: px(16),
          borderTopRightRadius: px(16),
          height: px(368),
        }}
      >
        {item.image ? (
          <Image
            alt={item.title}
            className="object-cover"
            fill
            sizes="(max-width: 1919px) 38vw, 704px"
            src={item.image}
          />
        ) : null}
      </Link>
      <Link
        className="flex flex-col items-center text-center"
        href={item.href}
        style={{
          paddingTop: px(30),
        }}
      >
        <span
          className="line-clamp-1 font-semibold leading-[1.253] text-[#5B3A29]"
          style={{
            fontSize: px(20),
          }}
        >
          {item.title}
        </span>
        <span
          className="font-normal leading-[1.253] text-[#CAC4BC]"
          style={{
            fontSize: px(14),
            marginTop: px(13),
          }}
        >
          {item.date}
        </span>
      </Link>
    </article>
  );
}

function buildMagazineItems(
  media: VillageMediaContent[],
  village: Village,
): MagazineItem[] {
  const homeHref = villagePath(village.slug);
  return media.map((item) => ({
    date: formatMagazineDate(item.date),
    href: `${homeHref}/media/${item.id}`,
    id: item.id,
    image: item.thumbnail,
    title: item.title || "메인 타이틀 제목",
  }));
}

function ChannelMagazineEmptyState() {
  return (
    <div
      className="border border-dashed border-[#D6D6D6]"
      style={{
        minHeight: px(320),
      }}
    >
      <NuvioEmptyState className="h-full" message="아직 매거진이 없어요" />
    </div>
  );
}

function formatMagazineDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0000. 00. 00";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}. ${month}. ${day}`;
}
