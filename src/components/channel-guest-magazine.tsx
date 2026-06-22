import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ChannelProfileHeader,
  channelGuestScaleRootStyle,
  px,
} from "@/components/channel-guest-gallery";
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
  maxWidth: `calc(100% - ${px(340)})`,
  width: px(1101),
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
            paddingTop: px(36),
          }}
        >
          <div
            className="grid"
            style={{
              columnGap: px(45),
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              rowGap: px(79),
            }}
          >
            {items.map((item) => (
              <MagazineCard item={item} key={item.id} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function MagazineCard({ item }: { item: MagazineItem }) {
  return (
    <article
      className="overflow-hidden bg-white"
      style={{
        borderRadius: px(14),
      }}
    >
      <Link
        className="relative block overflow-hidden bg-[#D9D9D9]"
        href={item.href}
        style={{
          borderTopLeftRadius: px(14),
          borderTopRightRadius: px(14),
          height: px(367),
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
          height: px(148),
          paddingTop: px(32),
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
          className="font-medium leading-[1.253] text-[#D3CBC4]"
          style={{
            fontSize: px(14),
            marginTop: px(16),
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
  const items: MagazineItem[] = media.map((item) => ({
    date: formatMagazineDate(item.date),
    href: `${homeHref}/media/${item.id}`,
    id: item.id,
    image: item.thumbnail,
    title: item.title || "메인 타이틀 제목",
  }));

  return items.concat(
    Array.from({ length: Math.max(0, 5 - items.length) }, (_, index) => ({
      date: "0000. 00. 00",
      href: `${homeHref}/media`,
      id: `magazine-fallback-${index}`,
      image: undefined,
      title: "메인 타이틀 제목",
    })),
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
