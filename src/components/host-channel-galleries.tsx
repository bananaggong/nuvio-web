"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChannelProfileHeader,
  fallbackChannel,
} from "@/components/host-channel-home";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import type { VillageMediaContent } from "@/lib/types";
import { villagePath } from "@/lib/village-routing";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
};

type HostMediaPayload = {
  data?: VillageMediaContent[];
};

type GalleryViewMode = "grid" | "stack" | "video";
type GalleryMediaLayout = "portrait" | "landscape";

type GalleryItem = VillageMediaContent & {
  imageCount?: number;
};

const galleryFallbackItems: GalleryItem[] = [
  {
    body: [
      "게시물과 함께 작성한 글은 여기에서 자세히 보기처럼 작성됩니다.",
      "채널 홈에 노출되는 이미지형 콘텐츠를 관리하는 공간입니다.",
    ],
    category: "archive",
    date: "2026-06-12",
    featured: true,
    id: "channel-gallery-1",
    imageCount: 4,
    provider: "instagram",
    published: true,
    sourceName: "호스트 채널",
    sourceUrl: "/host/channels/galleries",
    summary: "인스타그램처럼 게시물과 캡션을 함께 적어 올리는 방식으로 운영해요.",
    thumbnail: "",
    title: "인스타그램처럼 게시물과 캡션을 함께 적어 올리는 방식으로...",
    updatedAt: "2026-06-12T00:00:00.000Z",
    villageSlug: "boseong",
  },
  {
    body: ["목록 게시물 중 이미지 또는 세부 내용을 선택하면 상세형 화면으로 확인할 수 있습니다."],
    category: "archive",
    date: "2026-06-09",
    id: "channel-gallery-2",
    imageCount: 2,
    provider: "link",
    published: true,
    sourceName: "호스트 채널",
    sourceUrl: "/host/channels/galleries",
    summary: "게시물 목록에서 이미지와 짧은 설명을 한눈에 확인합니다.",
    thumbnail: "",
    title: "인스타그램처럼 게시물과 캡션을 함께 적어 올리는 방식으로...",
    updatedAt: "2026-06-09T00:00:00.000Z",
    villageSlug: "boseong",
  },
  {
    body: ["영상형 콘텐츠는 재생 아이콘과 함께 별도로 구분됩니다."],
    category: "original",
    date: "2026-06-06",
    embedUrl: "https://www.youtube.com/embed/demo",
    id: "channel-gallery-3",
    provider: "youtube",
    published: true,
    sourceName: "호스트 채널",
    sourceUrl: "/host/channels/galleries",
    summary: "영상 게시물은 영상 탭에서 따로 모아볼 수 있어요.",
    thumbnail: "",
    title: "인스타그램처럼 게시물과 캡션을 함께 적어 올리는 방식으로...",
    updatedAt: "2026-06-06T00:00:00.000Z",
    villageSlug: "boseong",
  },
  {
    body: ["이미지 그리드형 게시물 예시입니다."],
    category: "broadcast",
    date: "2026-06-01",
    id: "channel-gallery-4",
    provider: "instagram",
    published: true,
    sourceName: "호스트 채널",
    sourceUrl: "/host/channels/galleries",
    summary: "짧은 캡션과 이미지가 함께 표시됩니다.",
    thumbnail: "",
    title: "인스타그램처럼 게시물과 캡션을 함께 적어 올리는 방식으로...",
    updatedAt: "2026-06-01T00:00:00.000Z",
    villageSlug: "boseong",
  },
  {
    body: ["영상 또는 이미지가 없는 게시물도 회색 플레이스홀더로 안정적으로 보입니다."],
    category: "archive",
    date: "2026-05-28",
    embedUrl: "https://www.youtube.com/embed/demo2",
    id: "channel-gallery-5",
    provider: "youtube",
    published: true,
    sourceName: "호스트 채널",
    sourceUrl: "/host/channels/galleries",
    summary: "영상형 콘텐츠는 카드 안에 재생 아이콘이 함께 표시됩니다.",
    thumbnail: "",
    title: "인스타그램처럼 게시물과 캡션을 함께 적어 올리는 방식으로...",
    updatedAt: "2026-05-28T00:00:00.000Z",
    villageSlug: "boseong",
  },
];

function normalizeGalleryItem(item: VillageMediaContent): GalleryItem {
  return {
    ...item,
    imageCount: item.featured ? 3 : 0,
  };
}

function formatGalleryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "2000. 00. 00";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

function isVideoItem(item: GalleryItem) {
  return item.provider === "youtube" || Boolean(item.embedUrl);
}

export function HostChannelGalleries() {
  const searchParams = useSearchParams();
  const galleryDetailParam = searchParams.get("galleryDetail");
  const [channel, setChannel] = useState<Village>(fallbackChannel);
  const [items, setItems] = useState<GalleryItem[]>(galleryFallbackItems);
  const [viewMode, setViewMode] = useState<GalleryViewMode>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const [channelResponse, mediaResponse] = await Promise.allSettled([
        fetch("/api/host/villages", { cache: "no-store" }),
        fetch("/api/host/media", { cache: "no-store" }),
      ]);

      if (!active) return;

      if (channelResponse.status === "fulfilled" && channelResponse.value.ok) {
        const payload = (await channelResponse.value.json().catch(() => ({}))) as HostChannelPayload;
        const firstChannel = Array.isArray(payload.data) ? payload.data[0] : undefined;
        if (firstChannel) setChannel(firstChannel);
      }

      if (mediaResponse.status === "fulfilled" && mediaResponse.value.ok) {
        const payload = (await mediaResponse.value.json().catch(() => ({}))) as HostMediaPayload;
        if (Array.isArray(payload.data) && payload.data.length > 0) {
          setItems(payload.data.map(normalizeGalleryItem));
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const publicHref = useMemo(() => villagePath(channel.slug), [channel.slug]);
  const filteredItems = useMemo(() => {
    if (viewMode === "video") return items.filter(isVideoItem);
    return items;
  }, [items, viewMode]);
  const routeSelectedId = useMemo(() => {
    if (!galleryDetailParam || items.length === 0) return null;
    if (galleryDetailParam === "1") return items[0]?.id ?? null;
    return items.some((item) => item.id === galleryDetailParam)
      ? galleryDetailParam
      : null;
  }, [galleryDetailParam, items]);
  const activeSelectedId = selectedId ?? routeSelectedId;
  const selectedItem =
    items.find((item) => item.id === activeSelectedId) ?? filteredItems[0] ?? items[0];
  const showDetail = Boolean(activeSelectedId && selectedItem);
  const sidebarHeight = showDetail ? "min-h-[var(--host-2260)]" : "min-h-[var(--host-707)]";

  function addDraftItem() {
    const now = new Date().toISOString();
    const nextItem: GalleryItem = {
      body: ["새 갤러리 게시물 내용을 입력하세요."],
      category: "archive",
      date: now,
      id: `channel-gallery-draft-${Date.now()}`,
      imageCount: 0,
      provider: "link",
      published: false,
      sourceName: "호스트 채널",
      sourceUrl: "/host/channels/galleries",
      summary: "새 게시물 설명을 입력하세요.",
      thumbnail: "",
      title: "새 갤러리 게시물",
      updatedAt: now,
      villageSlug: channel.slug || "boseong",
    };

    setItems((current) => [nextItem, ...current]);
    setSelectedId(nextItem.id);
    setViewMode("stack");
    setSaved(false);
  }

  function saveDraft() {
    window.localStorage.setItem("nuvio-channel-gallery-draft", JSON.stringify(items));
    setSaved(true);
  }

  return (
    <HostWorkspaceLayout sidebarHeight={sidebarHeight}>
      <section className="min-w-0 flex-1 overflow-x-hidden bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader activeLabel="갤러리형" channel={channel} publicHref={publicHref} />

          <section
            className="relative border-b border-[#6D7A8A] pb-[var(--host-16)] pt-[var(--host-24)]"
            style={{ minHeight: showDetail ? "var(--host-1794)" : "var(--host-450)" }}
          >
            <button
              aria-label="갤러리 게시물 추가"
              className="absolute right-[var(--host-37)] top-[var(--host-24)] size-[var(--host-20)] transition hover:opacity-80"
              onClick={addDraftItem}
              type="button"
            >
              <Image alt="" height={24} src={nuvioIcons.channelAddCircle} width={24} />
            </button>

            <div className="mx-auto w-[var(--host-1142)] max-w-full">
              <GalleryViewTabs
                activeMode={viewMode}
                onChange={(mode) => {
                  setViewMode(mode);
                  setSelectedId(null);
                }}
              />

              {showDetail ? (
                <GalleryDetailView item={selectedItem ?? galleryFallbackItems[0]} items={items} />
              ) : (
                <GalleryGrid
                  items={filteredItems}
                  onSelect={(item) => {
                    setSelectedId(item.id);
                  }}
                />
              )}
            </div>
          </section>

          <footer className="flex h-[var(--host-72)] items-start gap-[var(--host-12)] border-b border-[#6D7A8A] px-[var(--host-24)] pt-[var(--host-18)]">
            <button
              className="h-[var(--host-29)] rounded-[3px] border border-[#6D7A8A] bg-white px-[var(--host-20)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E]"
              onClick={saveDraft}
              type="button"
            >
              저장
            </button>
            {saved ? (
              <span className="text-[length:var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]">
                임시 저장되었습니다.
              </span>
            ) : null}
          </footer>
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function GalleryViewTabs({
  activeMode,
  onChange,
}: {
  activeMode: GalleryViewMode;
  onChange: (mode: GalleryViewMode) => void;
}) {
  const tabs: Array<{ icon: string; label: string; mode: GalleryViewMode }> = [
    { icon: nuvioIcons.channelViewGrid, label: "목록형", mode: "grid" },
    { icon: nuvioIcons.channelViewStack, label: "이미지형", mode: "stack" },
    { icon: nuvioIcons.channelViewVideo, label: "영상형", mode: "video" },
  ];

  return (
    <div className="mx-auto flex h-[var(--host-48)] items-start justify-center gap-[var(--host-82)] pt-[var(--host-6)]">
      {tabs.map((tab) => (
        <button
          aria-label={tab.label}
          className={`${
            tab.mode === "video"
              ? "h-[var(--host-22)] w-[var(--host-25)]"
              : "size-[var(--host-25)]"
          } transition ${
            activeMode === tab.mode ? "text-[#FF9A3D]" : "text-[#D9D9D9] hover:text-[#CAC4BC]"
          }`}
          key={tab.mode}
          onClick={() => onChange(tab.mode)}
          type="button"
        >
          <MaskIcon icon={tab.icon} />
        </button>
      ))}
    </div>
  );
}

function GalleryGrid({
  items,
  onSelect,
}: {
  items: GalleryItem[];
  onSelect: (item: GalleryItem) => void;
}) {
  const visible = items.length > 0 ? items.slice(0, 5) : galleryFallbackItems.slice(0, 5);

  return (
    <div className="mt-[var(--host-12)] grid w-full grid-cols-[repeat(5,minmax(0,var(--host-222)))] gap-[var(--host-6)]">
      {visible.map((item) => (
        <button
          className="group w-[var(--host-222)] min-w-0 text-left"
          key={item.id}
          onClick={() => onSelect(item)}
          type="button"
        >
          <div className="relative h-[var(--host-295)] w-[var(--host-222)] overflow-hidden rounded-[4px] bg-[#D9D9D9] transition group-hover:bg-[#CAC4BC]">
            {item.thumbnail ? (
              <Image
                alt=""
                className="object-cover opacity-70"
                fill
                sizes="(min-width: 1920px) 296px, 222px"
                src={item.thumbnail}
              />
            ) : null}
            {item.imageCount && item.imageCount > 0 ? (
              <span className="absolute right-[var(--host-12)] top-[var(--host-10)] text-[length:var(--host-18)] font-semibold leading-[1.253] text-[#F9F9F9]">
                +{item.imageCount}
              </span>
            ) : null}
            {isVideoItem(item) ? (
              <span className="absolute inset-0 grid place-items-center text-[#FFF6EC]">
                <span className="size-[var(--host-28)]">
                  <MaskIcon icon={nuvioIcons.channelViewVideo} />
                </span>
              </span>
            ) : null}
          </div>
          <div className="mt-[var(--host-8)] px-[var(--host-6)]">
            <p className="line-clamp-2 w-[var(--host-200)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]">
              {item.title}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function GalleryDetailView({
  item,
  items,
}: {
  item: GalleryItem;
  items: GalleryItem[];
}) {
  const videoItem = items.find(isVideoItem) ?? item;
  const nextPortraitItem =
    items.find((candidate) => candidate.id !== item.id && !isVideoItem(candidate)) ?? item;

  return (
    <div className="mt-[var(--host-40)] flex w-full flex-col gap-[var(--host-50)] pb-[var(--host-50)]">
      <GalleryDetailRow item={item} layout="portrait" />
      <GalleryDetailRow item={videoItem} layout="landscape" />
      <GalleryDetailRow item={nextPortraitItem} layout="portrait" />
    </div>
  );
}

function GalleryDetailRow({
  item,
  layout,
}: {
  item: GalleryItem;
  layout: GalleryMediaLayout;
}) {
  const isLandscape = layout === "landscape";
  const imageCount = item.imageCount ?? (isLandscape ? 0 : 3);

  return (
    <article className="flex w-full items-start gap-[var(--host-12)]">
      <div
        className={`relative flex min-w-0 flex-1 items-start justify-center ${
          isLandscape ? "h-[var(--host-430)]" : "h-[var(--host-643)]"
        }`}
      >
        {isLandscape ? null : (
          <button
            aria-label="이전 게시물"
            className="absolute left-[var(--host-42)] top-[var(--host-281)] h-[var(--host-42)] w-[var(--host-27)] text-[#D9D9D9] transition hover:text-[#CAC4BC]"
            type="button"
          >
            <ChevronShape direction="left" />
          </button>
        )}
        <div
          className={`relative overflow-hidden rounded-[6px] bg-[#D9D9D9] ${
            isLandscape
              ? "h-[var(--host-430)] w-[var(--host-765)]"
              : "mt-[var(--host-22)] h-[var(--host-600)] w-[var(--host-480)]"
          }`}
        >
          {item.thumbnail ? (
            <Image
              alt=""
              className="object-cover opacity-70"
              fill
              sizes={isLandscape ? "(min-width: 1920px) 1020px, 765px" : "(min-width: 1920px) 640px, 480px"}
              src={item.thumbnail}
            />
          ) : null}
          {!isLandscape && imageCount > 0 ? (
            <span className="absolute right-[var(--host-16)] top-[var(--host-12)] text-[length:var(--host-24)] font-normal leading-[1.253] text-[#FFF6EC]">
              +{imageCount}
            </span>
          ) : null}
          {isLandscape || isVideoItem(item) ? (
            <span className="absolute inset-0 grid place-items-center text-[#FFF6EC]">
              <span className="h-[var(--host-77)] w-[var(--host-87)]">
                <MaskIcon icon={nuvioIcons.channelViewVideo} />
              </span>
            </span>
          ) : null}
        </div>
        {isLandscape ? null : (
          <button
            aria-label="다음 게시물"
            className="absolute right-[var(--host-42)] top-[var(--host-281)] h-[var(--host-42)] w-[var(--host-27)] text-[#D9D9D9] transition hover:text-[#CAC4BC]"
            type="button"
          >
            <ChevronShape direction="right" />
          </button>
        )}
      </div>

      <div className="relative h-[var(--host-501)] w-[var(--host-340)] shrink-0 pt-[var(--host-20)]">
        <div className="mb-[var(--host-12)] flex w-full items-start gap-[var(--host-12)] px-[var(--host-12)] text-[#6D7A8A]">
          <span className="min-w-0 flex-1" />
          <button aria-label="게시물 복제" className="size-[var(--host-16)] transition hover:text-[#FE701E]" type="button">
            <MaskIcon icon={nuvioIcons.formItemCopy} />
          </button>
          <button aria-label="게시물 삭제" className="size-[var(--host-16)] transition hover:text-[#FE701E]" type="button">
            <MaskIcon icon={nuvioIcons.formItemTrash} />
          </button>
        </div>
        <p className="text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#6D7A8A]">
          {formatGalleryDate(item.date)} <span className="font-normal">(작성일)</span>
        </p>
        <h2 className="mt-[var(--host-16)] text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#0D0D0C]">
          {item.title}
        </h2>
        <div className="mt-[var(--host-4)] text-[length:var(--host-16)] font-normal leading-[1.253] text-[#0D0D0C]">
          {(item.body.length > 0 ? item.body : [item.summary]).slice(0, 3).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    </article>
  );
}

function MaskIcon({ icon }: { icon: string }) {
  return (
    <span
      aria-hidden="true"
      className="block h-full w-full bg-current"
      style={{
        WebkitMask: `url(${icon}) center / contain no-repeat`,
        mask: `url(${icon}) center / contain no-repeat`,
      }}
    />
  );
}

function ChevronShape({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" className="h-full w-full" fill="none" viewBox="0 0 42 42">
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
