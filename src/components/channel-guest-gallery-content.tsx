"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { px } from "@/components/channel-guest-shared";
import type { GalleryItem, GalleryViewMode } from "@/components/channel-guest-gallery";

export function ChannelGuestGalleryContent({ items }: { items: GalleryItem[] }) {
  const [activeStackIndex, setActiveStackIndex] = useState(0);
  const [viewMode, setViewMode] = useState<GalleryViewMode>("grid");
  const visibleItems = useMemo(() => {
    if (viewMode === "video") return items.filter(isVideoGalleryItem);
    return items;
  }, [items, viewMode]);

  return (
    <>
      <GalleryViewSwitch
        activeMode={viewMode}
        onChange={(nextMode) => {
          setViewMode(nextMode);
          setActiveStackIndex(0);
        }}
      />
      {visibleItems.length > 0 ? (
        viewMode === "stack" ? (
          <GalleryStackView
            activeIndex={activeStackIndex}
            items={visibleItems}
            onSelectIndex={setActiveStackIndex}
          />
        ) : (
          <GalleryGrid items={visibleItems} />
        )
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
    { icon: nuvioIcons.channelViewGrid, label: "목록형", mode: "grid", size: 25 },
    { icon: nuvioIcons.channelViewStack, label: "이미지형", mode: "stack", size: 25 },
    { icon: nuvioIcons.channelViewVideo, label: "영상형", mode: "video", size: 22 },
  ];

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
      {tabs.map((tab) => (
        <button
          aria-label={tab.label}
          aria-pressed={activeMode === tab.mode}
          className="grid place-items-center transition hover:opacity-80"
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
  );
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const isVideo = isVideoGalleryItem(item);

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

function GalleryStackView({
  activeIndex,
  items,
  onSelectIndex,
}: {
  activeIndex: number;
  items: GalleryItem[];
  onSelectIndex: (index: number) => void;
}) {
  const safeIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));
  const activeItem = items[safeIndex];
  const isVideo = isVideoGalleryItem(activeItem);

  function move(delta: number) {
    if (items.length <= 1) return;
    onSelectIndex((safeIndex + delta + items.length) % items.length);
  }

  return (
    <div
      className="grid"
      style={{
        columnGap: px(54),
        gridTemplateColumns: `${px(720)} ${px(368)}`,
        marginTop: px(28),
        width: px(1142),
      }}
    >
      <div
        className="relative overflow-hidden bg-[#D9D9D9]"
        style={{
          borderRadius: px(5),
          height: px(640),
          width: px(720),
        }}
      >
        {activeItem.image ? (
          <Image
            alt={activeItem.caption}
            className="object-cover"
            fill
            sizes="(max-width: 1919px) 50vw, 960px"
            src={activeItem.image}
          />
        ) : null}
        {isVideo ? (
          <span
            className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2"
            style={{
              borderBottom: `${px(18)} solid transparent`,
              borderLeft: `${px(31)} solid #FFFFFF`,
              borderTop: `${px(18)} solid transparent`,
              height: 0,
              width: 0,
            }}
          />
        ) : null}
        {items.length > 1 ? (
          <>
            <button
              aria-label="이전 미디어"
              className="absolute left-0 top-0 flex h-full items-center justify-center text-white/90 transition hover:bg-black/10"
              onClick={() => move(-1)}
              style={{ width: px(76) }}
              type="button"
            >
              <ChevronShape direction="left" />
            </button>
            <button
              aria-label="다음 미디어"
              className="absolute right-0 top-0 flex h-full items-center justify-center text-white/90 transition hover:bg-black/10"
              onClick={() => move(1)}
              style={{ width: px(76) }}
              type="button"
            >
              <ChevronShape direction="right" />
            </button>
          </>
        ) : null}
      </div>

      <aside
        className="flex min-w-0 flex-col border-l border-[#E9DED4]"
        style={{
          minHeight: px(640),
          paddingLeft: px(30),
          paddingTop: px(6),
        }}
      >
        <p className="text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#6D7A8A]">
          {formatGalleryDate(activeItem.date)}
        </p>
        <h2
          className="text-[length:var(--channel-font-24)] font-semibold leading-[1.253] text-[#0D0D0C]"
          style={{ marginTop: px(18) }}
        >
          {activeItem.title}
        </h2>
        <p
          className="text-[length:var(--channel-font-16)] font-medium leading-[1.68] text-[#5B3A29]"
          style={{ marginTop: px(20) }}
        >
          {activeItem.caption}
        </p>
        <div
          className="grid"
          style={{
            gap: px(10),
            marginTop: px(32),
          }}
        >
          {items.map((item, index) => (
            <button
              aria-current={index === safeIndex}
              className={`flex items-center text-left transition ${
                index === safeIndex ? "text-[#FE701E]" : "text-[#6D7A8A] hover:text-[#5B3A29]"
              }`}
              key={item.id}
              onClick={() => onSelectIndex(index)}
              style={{
                gap: px(12),
                minHeight: px(56),
              }}
              type="button"
            >
              <span
                className="relative block shrink-0 overflow-hidden bg-[#D9D9D9]"
                style={{
                  borderRadius: px(4),
                  height: px(52),
                  width: px(52),
                }}
              >
                {item.image ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="70px"
                    src={item.image}
                  />
                ) : null}
              </span>
              <span className="line-clamp-2 text-[length:var(--channel-font-14)] font-semibold leading-[1.35]">
                {item.title}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function ChevronShape({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      style={{ height: px(42), width: px(42) }}
      viewBox="0 0 42 42"
    >
      <path
        d={direction === "left" ? "M27 9L15 21L27 33" : "M15 9L27 21L15 33"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
    </svg>
  );
}

function ChannelGalleryEmptyState({ message }: { message: string }) {
  return (
    <div
      className="border border-dashed border-[#D6D6D6]"
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
  return item.provider === "youtube" || Boolean(item.embedUrl);
}

function formatGalleryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "작성일 미정";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}. ${month}. ${day}`;
}
