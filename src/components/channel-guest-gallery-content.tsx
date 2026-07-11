"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { px } from "@/components/channel-guest-shared";
import type { GalleryItem, GalleryViewMode } from "@/components/channel-guest-gallery";

export function ChannelGuestGalleryContent({ items }: { items: GalleryItem[] }) {
  const [viewMode, setViewMode] = useState<GalleryViewMode>("all");
  const visibleItems = useMemo(() => {
    if (viewMode === "video") return items.filter(isVideoGalleryItem);
    if (viewMode === "photo") return items.filter((item) => !isVideoGalleryItem(item));
    return items;
  }, [items, viewMode]);

  return (
    <>
      <GalleryViewSwitch activeMode={viewMode} onChange={setViewMode} />
      {visibleItems.length > 0 ? (
        <GalleryGrid items={visibleItems} />
      ) : (
        <ChannelGalleryEmptyState
          message={
            viewMode === "video"
              ? "아직 영상 미디어가 없어요"
              : "아직 미디어가 없어요"
          }
        />
      )}
    </>
  );
}

function GalleryViewSwitch({
  activeMode,
  onChange,
}: {
  activeMode: GalleryViewMode;
  onChange: (mode: GalleryViewMode) => void;
}) {
  const tabs: Array<{ icon: string; label: string; mode: GalleryViewMode; size: number }> = [
    { icon: nuvioIcons.channelViewGrid, label: "전체보기", mode: "all", size: 25 },
    { icon: nuvioIcons.channelViewStack, label: "사진만 보기", mode: "photo", size: 25 },
    { icon: nuvioIcons.channelViewVideo, label: "영상만 보기", mode: "video", size: 22 },
  ];

  return (
    <div
      className="channel-gallery-view-switch flex items-center justify-center"
      style={{
        gap: px(82),
        height: px(48),
        paddingTop: px(6),
        width: px(1142),
      }}
    >
      {tabs.map((tab) => (
        <button
          aria-label={tab.label}
          aria-pressed={activeMode === tab.mode}
          className="channel-gallery-view-button grid place-items-center transition hover:opacity-80"
          key={tab.mode}
          onClick={() => onChange(tab.mode)}
          style={{
            height: px(36),
            width: px(36),
          }}
          type="button"
        >
          <MaskIcon
            active={activeMode === tab.mode}
            path={tab.icon}
            size={tab.size}
          />
        </button>
      ))}
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

function GalleryGrid({ items }: { items: GalleryItem[] }) {
  return (
    <div
      className="channel-gallery-grid grid"
      style={{
        columnGap: px(6.211),
        gridTemplateColumns: `repeat(5, ${px(222.031)})`,
        paddingTop: px(12),
        rowGap: px(36),
      }}
    >
      {items.map((item, index) => (
        <GalleryCard item={item} key={item.id} priority={index === 0} />
      ))}
    </div>
  );
}

function GalleryCard({ item, priority = false }: { item: GalleryItem; priority?: boolean }) {
  const isVideo = isVideoGalleryItem(item);

  return (
    <article
      className="channel-gallery-card flex flex-col"
      style={{ gap: px(8.54), width: px(222.031) }}
    >
      <Link
        className="channel-gallery-card-image relative block overflow-hidden bg-[#D9D9D9]"
        href={item.href}
        style={{
          aspectRatio: "4 / 5",
          borderRadius: px(5),
          width: px(222.031),
        }}
      >
        {item.image ? (
          <Image
            alt={item.caption}
            className="object-cover"
            fill
            priority={priority}
            sizes="(max-width: 1919px) 16vw, 296px"
            src={item.image}
          />
        ) : isVideo ? (
          <GalleryVideoPreview item={item} />
        ) : null}
        {isVideo ? (
          <span className="absolute inset-0 grid place-items-center text-[#FFF6EC]">
            <Play fill="currentColor" size={28} strokeWidth={0} />
          </span>
        ) : null}
        {!isVideo && item.imageCount > 1 ? (
          <span className="absolute right-[clamp(10px,0.694444vw,13.333333px)] top-[clamp(8px,0.555556vw,10.666667px)] text-[length:var(--channel-font-16)] font-semibold leading-[1.253] text-[#FFF6EC] drop-shadow">
            +{item.imageCount - 1}
          </span>
        ) : null}
      </Link>
      <Link
        className="channel-gallery-card-caption line-clamp-2 text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#0D0D0C]"
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

function GalleryVideoPreview({ item }: { item: GalleryItem }) {
  if (item.provider === "video") {
    return (
      <video
        className="h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
        src={item.sourceUrl}
      />
    );
  }

  if (item.embedUrl) {
    return (
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="pointer-events-none h-full w-full"
        referrerPolicy="strict-origin-when-cross-origin"
        src={item.embedUrl}
        title={item.title}
      />
    );
  }

  return null;
}

function ChannelGalleryEmptyState({ message }: { message: string }) {
  return (
    <div
      className="channel-gallery-empty border border-dashed border-[#D6D6D6]"
      style={{
        marginTop: px(28),
        minHeight: px(320),
        width: px(1142),
      }}
    >
      <NuvioEmptyState className="h-full" message={message} />
    </div>
  );
}

function isVideoGalleryItem(item: GalleryItem) {
  return (
    item.provider === "youtube" ||
    item.provider === "instagram" ||
    item.provider === "video" ||
    Boolean(item.embedUrl) ||
    /\.(mp4|mov|webm)(\?|#|$)/iu.test(item.sourceUrl)
  );
}
