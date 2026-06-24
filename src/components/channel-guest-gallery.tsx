import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import {
  channelGuestHref,
  channelHomeLabel,
  channelMenuMeta,
  getVisibleChannelMenuItems,
} from "@/lib/channel-menu";
import { villagePath } from "@/lib/village-routing";
import type { VillageMediaContent } from "@/lib/types";
import type { Village } from "@/lib/village-types";

type ChannelGuestGalleryPageProps = {
  media: VillageMediaContent[];
  village: Village;
};

type GalleryItem = {
  caption: string;
  href: string;
  id: string;
  image?: string;
  provider?: VillageMediaContent["provider"];
};

const text = {
  boardType: "게시판형",
  channelHome: "채널 홈",
  fallbackCaption:
    "인스타그램처럼 게시물과 캡션(본문)내용을 함께 적어 올리는 방식으로 홈화면에서의 캡션은 간략하게 보임",
  freeType: "자유형",
  galleryType: "갤러리형",
  magazineType: "매거진형",
  notice: "알림",
  program: "프로그램",
  review: "후기",
} as const;

export const px = (value: number) =>
  `clamp(${value}px, ${(value / 14.4).toFixed(6)}vw, ${(value * 4 / 3).toFixed(6)}px)`;

export const channelGuestScaleRootStyle = {
  "--channel-font-14": px(14),
  "--channel-font-16": px(16),
  "--channel-font-24": px(24),
} as CSSProperties;

const profileStyle = {
  maxWidth: `calc(100% - ${px(336)})`,
  width: px(1104),
} as CSSProperties;

export const channelGuestContentStyle = {
  maxWidth: `calc(100% - ${px(298)})`,
  width: px(1142),
} as CSSProperties;

export function ChannelGuestGalleryPage({
  media,
  village,
}: ChannelGuestGalleryPageProps) {
  const homeHref = villagePath(village.slug);
  const items = buildGalleryItems(media, village);

  return (
    <div
      className="min-h-screen overflow-x-clip bg-white font-pretendard text-[#5B3A29]"
      style={channelGuestScaleRootStyle}
    >
      <main className="mx-auto w-full max-w-[1920px]">
        <ChannelProfileHeader activeTab="gallery" homeHref={homeHref} village={village} />

        <section
          className="mx-auto flex flex-col items-center"
          style={{
            ...channelGuestContentStyle,
            paddingBottom: px(70),
            paddingTop: px(32),
          }}
        >
          <GalleryViewSwitch />
          <div
            className="grid"
            style={{
              columnGap: px(6.211),
              gridTemplateColumns: `repeat(5, ${px(222.031)})`,
              paddingTop: px(12),
              rowGap: px(36),
            }}
          >
            {items.map((item) => (
              <GalleryCard item={item} key={item.id} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export function ChannelProfileHeader({
  activeTab,
  homeHref,
  village,
}: {
  activeTab: "home" | "program" | "gallery" | "magazine" | "board" | "free";
  homeHref: string;
  village: Village;
}) {
  const menuItems = getVisibleChannelMenuItems(village);

  return (
    <section
      className="mx-auto flex items-end border-b border-[#6D7A8A]"
      style={{
        ...profileStyle,
        gap: px(39),
        minHeight: px(185.658),
        padding: `${px(22)} ${px(58)} 0`,
      }}
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-[#D9D9D9]"
        style={{
          height: px(128),
          marginBottom: px(22),
          width: px(128),
        }}
      >
        {village.profileImage ? (
          <Image
            alt={`${village.name} profile`}
            className="object-cover"
            fill
            sizes="170px"
            src={village.profileImage}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-semibold leading-[1] text-[#6D7A8A]"
            style={{ fontSize: px(24) }}
          >
            {(village.name || village.logoText || "N").slice(0, 1)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col" style={{ gap: px(4) }}>
        <div className="flex items-end" style={{ gap: px(8) }}>
          <h1 className="text-[length:var(--channel-font-24)] font-medium leading-[1.253] text-[#0D0D0C]">
            {village.name}
          </h1>
          <span
            className="text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#6D7A8A]"
            style={{ paddingBottom: px(2) }}
          >
            {village.city || village.region}
          </span>
        </div>
        <p className="max-w-[60ch] truncate text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
          {village.tagline || village.summary}
        </p>
        <div className="flex items-center" style={{ gap: px(8) }}>
          <Image
            alt=""
            height={12}
            src={nuvioIcons.channelLink}
            style={{ height: px(12), width: px(12) }}
            width={12}
          />
          <span className="text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
            {village.region}
          </span>
          <span className="text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
            {village.slug}
          </span>
        </div>
        <div
          className="flex items-center"
          style={{
            gap: px(8),
            marginTop: px(4),
            paddingLeft: px(2),
          }}
        >
          <Image
            alt={text.notice}
            height={20}
            src={nuvioIcons.bell}
            style={{ height: px(20), width: px(19) }}
            width={19}
          />
          <Image
            alt={text.notice}
            height={18}
            src={nuvioIcons.message}
            style={{ height: px(18), width: px(18) }}
            width={18}
          />
        </div>
        <nav
          className="flex items-end"
          style={{
            gap: px(40),
            paddingTop: px(14),
          }}
        >
          <ChannelTab
            active={activeTab === "home"}
            href={homeHref}
            label={channelHomeLabel}
          />
          {menuItems.map((item) => (
            <ChannelTab
              active={activeTab === item.kind}
              href={channelGuestHref(item.kind, village)}
              key={item.id}
              label={item.label || channelMenuMeta[item.kind].defaultLabel}
            />
          ))}
        </nav>
      </div>
    </section>
  );
}

function ChannelTab({
  active = false,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`flex items-center justify-center whitespace-nowrap text-[length:var(--channel-font-16)] font-semibold leading-[1.253] text-[#5B3A29] ${
        active ? "border-b-2 border-[#FF9A3D]" : ""
      }`}
      href={href}
      style={{
        height: px(36),
        paddingBottom: px(8),
        paddingTop: active ? px(5) : px(8),
      }}
    >
      {label}
    </Link>
  );
}

function GalleryViewSwitch() {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        gap: px(82),
        height: px(48),
        paddingTop: px(6),
        width: px(1142),
      }}
    >
      <MaskIcon active path={nuvioIcons.channelViewGrid} size={25} />
      <MaskIcon path={nuvioIcons.channelViewStack} size={25} />
      <MaskIcon path={nuvioIcons.channelViewVideo} size={22} />
    </div>
  );
}

function MaskIcon({
  active = false,
  path,
  size,
}: {
  active?: boolean;
  path: string;
  size: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{
        backgroundColor: active ? "#FF9A3D" : "#D9D9D9",
        height: px(size),
        maskImage: `url(${path})`,
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        width: px(size),
        WebkitMaskImage: `url(${path})`,
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const isVideo = item.provider === "youtube";

  return (
    <article className="flex flex-col" style={{ gap: px(8.54), width: px(222.031) }}>
      <Link
        className="relative block overflow-hidden bg-[#D9D9D9]"
        href={item.href}
        style={{
          borderRadius: px(5),
          height: px(295.007),
          width: px(222.031),
        }}
      >
        {item.image ? (
          <Image
            alt={item.caption}
            className="object-cover"
            fill
            sizes="(max-width: 1919px) 16vw, 296px"
            src={item.image}
          />
        ) : null}
        {isVideo ? (
          <span
            className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2"
            style={{
              borderBottom: `${px(9)} solid transparent`,
              borderLeft: `${px(16)} solid #FFFFFF`,
              borderTop: `${px(9)} solid transparent`,
              height: 0,
              width: 0,
            }}
          />
        ) : null}
      </Link>
      <Link
        className="line-clamp-2 text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#0D0D0C]"
        href={item.href}
        style={{
          paddingLeft: px(6.211),
          paddingRight: px(6.211),
          width: px(212.715),
        }}
      >
        {item.caption}
      </Link>
    </article>
  );
}

function buildGalleryItems(
  media: VillageMediaContent[],
  village: Village,
): GalleryItem[] {
  const homeHref = villagePath(village.slug);
  const items: GalleryItem[] = media.map((item) => ({
    caption: item.summary || item.title || text.fallbackCaption,
    href: `${homeHref}/media/${item.id}`,
    id: item.id,
    image: item.thumbnail,
    provider: item.provider,
  }));

  return items.concat(
    Array.from({ length: Math.max(0, 5 - items.length) }, (_, index) => ({
      caption: text.fallbackCaption,
      href: `${homeHref}/media`,
      id: `gallery-fallback-${index}`,
      image: undefined,
      provider: index === 4 ? "youtube" : undefined,
    })),
  );
}
