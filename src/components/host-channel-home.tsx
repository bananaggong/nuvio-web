"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { HostChannelHomeBlocks } from "@/components/host-channel-home-blocks";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import type { ChannelBoardPost } from "@/lib/channel-board-posts";
import {
  applyChannelMenuItemsToSections,
  channelHomeLabel,
  channelMenuMeta,
  channelHostHref,
  getChannelMenuItems,
  getVisibleChannelMenuItems,
  type ChannelMenuItem,
} from "@/lib/channel-menu";
import {
  buildChannelScopedHref,
  filterProgramsForChannel,
  hostChannelProgramsEndpoint,
  selectHostChannel,
} from "@/lib/host-channel-selection";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import { channelPath } from "@/lib/channel-routing";
import type { VillageMediaContent } from "@/lib/types";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
  error?: string;
};

type HostProgramsPayload = {
  data?: HostProgramDraft[];
  error?: string;
};

type HostMediaPayload = {
  data?: VillageMediaContent[];
  error?: string;
};

type ChannelBoardPostsPayload = {
  data?: ChannelBoardPost[];
  error?: string;
};

type AssetUploadPayload = {
  data?: {
    url?: string;
  };
  error?: string;
};

type SaveChannelPayload = {
  data?: Village;
  error?: string;
};

type HostChannelHomeGalleryCard = {
  caption: string;
  extraCount?: number;
  id: string;
  image?: string;
  isVideo?: boolean;
  title: string;
};

type HostChannelHomeStoryCard = {
  body: string;
  date: string;
  id: string;
  image?: string;
  title: string;
};

type HostChannelHomeNoticeRow = {
  category: string;
  date: string;
  title: string;
  variant?: "default" | "new" | "pinned";
};

const maxHeroUploadBytes = 5 * 1024 * 1024;

export const fallbackChannel: Village = {
  accentColor: "#FE701E",
  address: "",
  brandColor: "#5B3A29",
  city: "",
  contactEmail: "",
  contactPhone: "",
  description: "",
  heroImage: "",
  profileImage: "",
  id: "new-channel",
  kakaoUrl: "",
  links: [],
  name: "",
  programIds: [],
  published: false,
  region: "",
  sections: [],
  slug: "",
  summary: "",
  tagline: "",
  updatedAt: new Date().toISOString(),
};

export function HostChannelHome() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const [channel, setChannel] = useState<Village | null>(null);
  const [programs, setPrograms] = useState<HostProgramDraft[]>([]);
  const [mediaItems, setMediaItems] = useState<VillageMediaContent[]>([]);
  const [boardPosts, setBoardPosts] = useState<ChannelBoardPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [savingMenuItemId, setSavingMenuItemId] = useState<string | null>(null);
  const [menuStatusMessage, setMenuStatusMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      const channelResponse = await fetch("/api/host/channels", {
        cache: "no-store",
      }).catch(() => null);

      if (!active) return;

      if (!channelResponse?.ok) {
        setChannel(null);
        setPrograms([]);
        setMediaItems([]);
        setBoardPosts([]);
        setIsLoading(false);
        return;
      }

      const channelPayload = (await channelResponse.json().catch(() => ({}))) as HostChannelPayload;
      const selectedChannel = selectHostChannel(
        channelPayload.data,
        requestedChannelSlug,
      );
      setChannel(selectedChannel);

      if (!selectedChannel?.slug) {
        setPrograms([]);
        setMediaItems([]);
        setBoardPosts([]);
        setIsLoading(false);
        return;
      }

      const programsEndpoint = hostChannelProgramsEndpoint(selectedChannel);
      const encodedChannelSlug = encodeURIComponent(selectedChannel.slug);
      const [programsResponse, mediaResponse, boardPostsResponse] =
        await Promise.all([
          programsEndpoint
            ? fetch(programsEndpoint, { cache: "no-store" }).catch(() => null)
            : Promise.resolve(null),
          fetch(`/api/host/media?villageSlug=${encodedChannelSlug}`, {
            cache: "no-store",
          }).catch(() => null),
          fetch(`/api/host/channel-board-posts?villageSlug=${encodedChannelSlug}`, {
            cache: "no-store",
          }).catch(() => null),
        ]);
      if (!active) return;

      if (programsResponse?.ok) {
        const programsPayload = (await programsResponse.json().catch(() => ({}))) as HostProgramsPayload;
        setPrograms(filterProgramsForChannel(programsPayload.data, selectedChannel));
      } else {
        setPrograms([]);
      }

      if (mediaResponse?.ok) {
        const mediaPayload = (await mediaResponse.json().catch(() => ({}))) as HostMediaPayload;
        const media = Array.isArray(mediaPayload.data) ? mediaPayload.data : [];
        setMediaItems(media.filter((item) => item.villageSlug === selectedChannel.slug));
      } else {
        setMediaItems([]);
      }

      if (boardPostsResponse?.ok) {
        const boardPostsPayload = (await boardPostsResponse.json().catch(() => ({}))) as ChannelBoardPostsPayload;
        setBoardPosts(Array.isArray(boardPostsPayload.data) ? boardPostsPayload.data : []);
      } else {
        setBoardPosts([]);
      }
      setIsLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [requestedChannelSlug]);

  const publicHref = channel?.slug ? channelPath(channel.slug) : "";
  const homeMenuItems = getChannelMenuItems(channel, {
    includeHidden: true,
    includeFree: false,
  }).filter((item) => item.kind !== "review");
  const visiblePrograms = programs.slice(0, 8);
  const visibleGalleryCards = buildGalleryCards(
    mediaItems.filter(isChannelGalleryMedia),
  ).slice(0, 3);
  const visibleStoryCards = buildStoryCards(
    mediaItems.filter(isChannelMagazineMedia),
  ).slice(0, 3);
  const visibleNoticeRows = buildNoticeRows(boardPosts).slice(0, 4);

  async function handleHeroFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isUploadingHero) return;

    if (!channel?.slug) {
      setUploadMessage("먼저 채널을 생성하거나 선택해 주세요.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadMessage("이미지 파일만 업로드할 수 있어요.");
      return;
    }

    if (file.size > maxHeroUploadBytes) {
      setUploadMessage("5MB 이하 이미지만 업로드할 수 있어요.");
      return;
    }

    setIsUploadingHero(true);
    setUploadMessage("업로드 중입니다...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("villageSlug", channel.slug);
      formData.append("usage", "channel-hero");
      formData.append("altText", `${channel.name || "채널"} 배너 이미지`);

      const uploadResponse = await fetch("/api/host/village-pages/assets", {
        body: formData,
        method: "POST",
      });
      const uploadPayload = (await uploadResponse.json().catch(() => ({}))) as AssetUploadPayload;
      const uploadedUrl = uploadPayload.data?.url;

      if (!uploadResponse.ok || !uploadedUrl) {
        throw new Error(uploadPayload.error || "배너 이미지를 업로드하지 못했습니다.");
      }

      const nextChannel: Village = {
        ...channel,
        heroImage: uploadedUrl,
        updatedAt: new Date().toISOString(),
      };
      const saveResponse = await fetch("/api/host/channels", {
        body: JSON.stringify(nextChannel),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const savePayload = (await saveResponse.json().catch(() => ({}))) as SaveChannelPayload;

      if (!saveResponse.ok || !savePayload.data) {
        throw new Error(savePayload.error || "업로드한 배너를 저장하지 못했습니다.");
      }

      setChannel(savePayload.data);
      setUploadMessage("배너 이미지가 저장되었습니다.");
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : "배너 이미지를 업로드하지 못했습니다.",
      );
    } finally {
      setIsUploadingHero(false);
    }
  }

  async function toggleMenuItemVisibility(item: ChannelMenuItem) {
    if (!channel || item.locked || savingMenuItemId) return;

    const nextVisible = !item.visible;
    const allMenuItems = getChannelMenuItems(channel, {
      includeFree: true,
      includeHidden: true,
    });
    const nextMenuItems = allMenuItems.map((menuItem) =>
      menuItem.id === item.id ? { ...menuItem, visible: nextVisible } : menuItem,
    );
    const nextChannel: Village = {
      ...channel,
      sections: applyChannelMenuItemsToSections(channel.sections, nextMenuItems),
      updatedAt: new Date().toISOString(),
    };
    const previousChannel = channel;

    setSavingMenuItemId(item.id);
    setMenuStatusMessage("");
    setChannel(nextChannel);

    try {
      const response = await fetch("/api/host/channels", {
        body: JSON.stringify(nextChannel),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as SaveChannelPayload;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "메뉴 노출 상태를 저장하지 못했습니다.");
      }

      setChannel(payload.data);
      setMenuStatusMessage(
        nextVisible
          ? `${item.label || channelMenuMeta[item.kind].defaultLabel} 메뉴를 표시합니다.`
          : `${item.label || channelMenuMeta[item.kind].defaultLabel} 메뉴를 숨겼습니다.`,
      );
      window.dispatchEvent(new CustomEvent("nuvio-channel-menu-updated"));
    } catch (error) {
      setChannel(previousChannel);
      setMenuStatusMessage(
        error instanceof Error ? error.message : "메뉴 노출 상태를 저장하지 못했습니다.",
      );
    } finally {
      setSavingMenuItemId(null);
    }
  }

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-3942)]">
      <section className="min-w-0 flex-1 overflow-x-clip bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <section className="relative grid h-[var(--host-560)] place-items-center overflow-hidden border-b border-[#D9D9D9] bg-[#F9F9F9]">
            <input
              accept="image/gif,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleHeroFileChange}
              ref={heroInputRef}
              type="file"
            />
            {channel?.heroImage ? (
              <Image
                alt={`${channel.name || "채널"} 배너 이미지`}
                className="object-cover object-center"
                fill
                priority
                sizes="(min-width: 1920px) 1640px, 1230px"
                src={channel.heroImage}
              />
            ) : null}
            <button
              className={`relative z-10 flex h-full w-full flex-col items-center justify-center text-center transition ${
                channel?.heroImage ? "bg-black/0 hover:bg-black/10" : "text-[#6D7A8A]"
              } disabled:cursor-not-allowed disabled:opacity-70`}
              disabled={isUploadingHero || !channel}
              onClick={() => heroInputRef.current?.click()}
              type="button"
            >
              {channel?.heroImage ? (
                <span className="absolute bottom-[var(--host-24)] rounded-[4px] bg-white/90 px-[var(--host-16)] py-[var(--host-8)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#5B3A29] shadow-sm">
                  {isUploadingHero ? "업로드 중..." : "배너 변경"}
                </span>
              ) : (
                <span className="flex flex-col items-center">
                  <Image
                    alt=""
                    className="size-[var(--host-20)]"
                    height={21}
                    src={nuvioIcons.channelUploadMuted}
                    width={21}
                  />
                  <span className="mt-[var(--host-12)] text-[length:var(--host-14)] font-semibold leading-[1.253]">
                    {isUploadingHero ? "업로드 중..." : "파일 업로드"}
                  </span>
                  <span className="mt-[var(--host-10)] text-[length:var(--host-12)] font-normal leading-[1.65] text-[#6D7A8A]">
                    JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드할 수 있어요
                  </span>
                  <span className="mt-[var(--host-12)] text-[length:var(--host-12)] font-normal leading-[1.65] text-[#6D7A8A]">
                    권장 이미지 사이즈
                    <br />
                    가로 : 1920px(해상도상이하)
                    <br />
                    세로 : 200px - 560px
                  </span>
                </span>
              )}
            </button>
            {uploadMessage ? (
              <p className="absolute bottom-[var(--host-18)] left-1/2 z-20 -translate-x-1/2 text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
                {uploadMessage}
              </p>
            ) : null}
          </section>

          <ChannelProfileHeader
            activeLabel="채널 홈"
            channel={channel}
            loading={isLoading}
            publicHref={publicHref}
            variant="home"
          />

          <section className="px-[var(--host-58)] pb-[var(--host-70)] pt-[var(--host-20)]">
            {isLoading ? (
              <ChannelContentSkeleton variant="home" />
            ) : (
              <>
                {menuStatusMessage ? (
                  <p className="mb-[var(--host-12)] text-right text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
                    {menuStatusMessage}
                  </p>
                ) : null}
                {homeMenuItems.map((item) => (
                  <ChannelHomeMenuSection
                    item={item}
                    key={item.id}
                    onToggleVisible={
                      item.locked ? undefined : () => void toggleMenuItemVisibility(item)
                    }
                    toggleBusy={Boolean(savingMenuItemId)}
                    visibleGalleryCards={visibleGalleryCards}
                    visibleNoticeRows={visibleNoticeRows}
                    visiblePrograms={visiblePrograms}
                    visibleStoryCards={visibleStoryCards}
                  />
                ))}
                <HostChannelHomeBlocks channel={channel} onChannelSaved={setChannel} />
              </>
            )}
          </section>
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function ChannelHomeMenuSection({
  item,
  onToggleVisible,
  toggleBusy,
  visibleGalleryCards,
  visibleNoticeRows,
  visiblePrograms,
  visibleStoryCards,
}: {
  item: ChannelMenuItem;
  onToggleVisible?: () => void;
  toggleBusy?: boolean;
  visibleGalleryCards: HostChannelHomeGalleryCard[];
  visibleNoticeRows: HostChannelHomeNoticeRow[];
  visiblePrograms: HostProgramDraft[];
  visibleStoryCards: HostChannelHomeStoryCard[];
}) {
  if (item.kind === "program") {
    return (
      <ChannelSectionShell
        title={item.label || channelMenuMeta.program.defaultLabel}
        toggleOn={item.visible}
      >
        <div className="mb-[var(--host-24)] flex items-center gap-[var(--host-8)] text-[length:var(--host-12)] font-medium leading-[1.253]">
          <span className="rounded-full bg-[#FF9A3D] px-[var(--host-16)] py-[var(--host-5)] text-white">
            전체
          </span>
          <span className="rounded-full bg-[#CAC4BC] px-[var(--host-16)] py-[var(--host-5)] text-white">
            오픈
          </span>
          <span className="rounded-full bg-[#CAC4BC] px-[var(--host-16)] py-[var(--host-5)] text-white">
            예정
          </span>
          <span className="rounded-full bg-[#CAC4BC] px-[var(--host-16)] py-[var(--host-5)] text-white">
            마감
          </span>
        </div>
        {visiblePrograms.length > 0 ? (
          <div className="grid grid-cols-4 gap-[var(--host-36)]">
            {visiblePrograms.slice(0, 4).map((program, index) => (
              <ChannelProgramMiniCard
                key={program.id ?? `program-${index}`}
                program={program}
                variantIndex={index}
              />
            ))}
          </div>
        ) : (
          <ChannelEmptyState
            description="프로그램을 만들고 채널에 연결하면 이 영역에 표시됩니다."
            title="아직 등록된 프로그램이 없습니다."
          />
        )}
      </ChannelSectionShell>
    );
  }

  if (item.kind === "gallery") {
    return (
      <ChannelSectionShell
        actionLabel="전체보기"
        badge={channelMenuMeta.gallery.badge}
        onToggle={onToggleVisible}
        title={item.label || channelMenuMeta.gallery.defaultLabel}
        toggleBusy={toggleBusy}
        toggleOn={item.visible}
      >
        {visibleGalleryCards.length > 0 ? (
          <div className="grid grid-cols-3 gap-[var(--host-36)]">
            {visibleGalleryCards.map((card) => (
              <article key={card.id}>
                <div className="relative h-[var(--host-354)] overflow-hidden rounded-[4px] bg-[#D9D9D9]">
                  {card.image ? (
                    <Image
                      alt={card.title}
                      className="object-cover"
                      fill
                      sizes="(min-width: 1920px) 468px, 351px"
                      src={card.image}
                    />
                  ) : null}
                  {card.isVideo ? (
                    <span className="absolute left-1/2 top-1/2 size-0 -translate-x-1/2 -translate-y-1/2 border-y-[var(--host-12)] border-l-[var(--host-18)] border-y-transparent border-l-white" />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent px-[var(--host-18)] pb-[var(--host-18)] pt-[var(--host-56)]">
                    <p className="line-clamp-3 text-[length:var(--host-12)] font-medium leading-[1.6] text-white">
                      {card.caption}
                    </p>
                  </div>
                  {card.extraCount ? (
                    <span className="absolute right-[var(--host-12)] top-[var(--host-12)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-white">
                      +{card.extraCount}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ChannelEmptyState
            description="이미지나 영상을 추가하면 갤러리형 메뉴에 표시됩니다."
            title="아직 등록된 갤러리 게시물이 없습니다."
          />
        )}
      </ChannelSectionShell>
    );
  }

  if (item.kind === "magazine") {
    return (
      <ChannelSectionShell
        actionLabel="전체보기"
        badge={channelMenuMeta.magazine.badge}
        onToggle={onToggleVisible}
        title={item.label || channelMenuMeta.magazine.defaultLabel}
        toggleBusy={toggleBusy}
        toggleOn={item.visible}
      >
        {visibleStoryCards.length > 0 ? (
          <div className="grid grid-cols-3 gap-[var(--host-36)]">
            {visibleStoryCards.map((card) => (
              <article
                className="min-w-0 overflow-hidden rounded-[8px] bg-[#F9F9F9]"
                key={card.id}
              >
                <div className="relative h-[var(--host-288)] overflow-hidden rounded-t-[8px] bg-[#D9D9D9]">
                  {card.image ? (
                    <Image
                      alt={card.title}
                      className="object-cover"
                      fill
                      sizes="(min-width: 1920px) 468px, 351px"
                      src={card.image}
                    />
                  ) : null}
                </div>
                <div className="px-[var(--host-18)] py-[var(--host-16)]">
                  <h3 className="text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#5B3A29]">
                    {card.title}
                  </h3>
                  <p className="mt-[var(--host-4)] text-[length:var(--host-11)] font-normal leading-[1.253] text-[#CAC4BC]">
                    {card.date}
                  </p>
                  <p className="sr-only">{card.body}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ChannelEmptyState
            description="매거진 글을 작성하면 채널 홈의 이야기 영역에 표시됩니다."
            title="아직 작성된 이야기가 없습니다."
          />
        )}
      </ChannelSectionShell>
    );
  }

  if (item.kind === "board") {
    return (
      <ChannelSectionShell
        actionLabel="전체보기"
        badge={channelMenuMeta.board.badge}
        onToggle={onToggleVisible}
        title={item.label || channelMenuMeta.board.defaultLabel}
        toggleBusy={toggleBusy}
        toggleOn={item.visible}
      >
        {visibleNoticeRows.length > 0 ? (
          <div className="border-t border-[#F3E2D5]">
            {visibleNoticeRows.map((row, index) => (
              <div
                className="grid h-[var(--host-37)] grid-cols-[var(--host-82)_minmax(0,1fr)_var(--host-166)] items-center border-b border-[#F3E2D5] text-[length:var(--host-11)] leading-[1.253]"
                key={`${row.title}-${index}`}
              >
                <div>
                  {row.category ? (
                    <span
                      className={`inline-flex h-[var(--host-16)] items-center rounded-[4px] px-[var(--host-8)] text-[length:var(--host-10)] font-semibold text-white ${
                        row.variant === "pinned" ? "bg-[#6BAA50]" : "bg-[#FE701E]"
                      }`}
                    >
                      {row.category}
                    </span>
                  ) : null}
                </div>
                <p className="font-medium text-[#5B3A29]">{row.title}</p>
                <p className="text-right font-normal text-[#CAC4BC]">
                  {formatChannelHomeNoticeDate(row.date)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <ChannelEmptyState
            description="공지나 게시글을 작성하면 게시판형 영역에 표시됩니다."
            title="아직 등록된 공지가 없습니다."
          />
        )}
      </ChannelSectionShell>
    );
  }

  return null;
}

export function ChannelProfileHeader({
  activeLabel = "채널 홈",
  channel,
  loading = false,
  publicHref,
  variant = "section",
}: {
  activeLabel?: string;
  channel: Village | null;
  loading?: boolean;
  publicHref: string;
  variant?: "home" | "section";
}) {
  if (loading) {
    return <ChannelProfileHeaderSkeleton variant={variant} />;
  }

  const menuLabels = [
    {
      active: activeLabel === channelHomeLabel,
      href: "/host/channels",
      id: "channel-home",
      label: channelHomeLabel,
    },
    ...getVisibleChannelMenuItems(channel).map((item) => ({
      active:
        activeLabel === item.label ||
        activeLabel === channelMenuMeta[item.kind].defaultLabel,
      href: channelHostHref(item.kind),
      id: item.id,
      label: item.label || channelMenuMeta[item.kind].defaultLabel,
    })),
  ];
  const sectionVariant = variant === "section";
  const channelName = channel?.name?.trim() || "채널 설정이 필요합니다";
  const channelRegion = [channel?.region, channel?.city].filter(Boolean).join(" / ");
  const channelSummary =
    channel?.tagline?.trim() ||
    channel?.summary?.trim() ||
    "채널 설정에서 이름, 지역, 소개를 입력해 주세요.";
  const publicLinkEnabled = Boolean(channel?.published && channel?.slug && publicHref);

  return (
    <section
      className={`relative border-b border-[#6D7A8A] bg-white ${
        sectionVariant ? "h-[var(--host-178)]" : "h-[var(--host-156)]"
      }`}
    >
      <div
        className={`flex items-start gap-[var(--host-42)] px-[var(--host-58)] ${
          sectionVariant ? "pt-[var(--host-36)]" : "pt-[var(--host-14)]"
        }`}
      >
        <div className="relative size-[var(--host-128)] shrink-0 overflow-hidden rounded-full bg-[#D9D9D9]">
          {channel?.profileImage ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(min-width: 1920px) 170px, 128px"
              src={channel.profileImage}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[length:var(--host-24)] font-semibold leading-[1] text-[#6D7A8A]">
              {(channelName || channel?.logoText || "N").slice(0, 1)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-[var(--host-10)] pt-[var(--host-3)]">
            <h1 className="text-[length:var(--host-24)] font-medium leading-[1.253] text-[#0D0D0C]">
              {channelName}
            </h1>
            <span className="pb-[var(--host-2)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
              {channelRegion}
            </span>
          </div>
          <p className="mt-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
            {channelSummary}
          </p>
          {publicLinkEnabled ? (
            <Link
              className="mt-[var(--host-10)] inline-flex items-center gap-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
              href={publicHref}
              target="_blank"
            >
              <Image alt="" height={16} src={nuvioIcons.channelLink} width={16} />
              공개 채널 보기
            </Link>
          ) : (
            <p className="mt-[var(--host-10)] inline-flex items-center gap-[var(--host-8)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#AEB8C2]">
              <Image alt="" height={16} src={nuvioIcons.channelLink} width={16} />
              채널 활성화 후 공개 링크가 표시됩니다.
            </p>
          )}
        </div>
      </div>
      <nav className="absolute bottom-0 left-[var(--host-228)] flex items-end gap-[var(--host-40-7)] text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
        {menuLabels.map((item) => (
          <Link
            aria-current={item.active ? "page" : undefined}
            className="relative shrink-0 pb-[var(--host-8)] text-[#5B3A29] transition hover:text-[#FE701E]"
            href={buildChannelScopedHref(item.href, channel?.slug)}
            key={item.id}
          >
            {item.label}
            {item.active ? (
              <span className="absolute bottom-0 left-0 h-[var(--host-2)] w-full bg-[#FE701E]" />
            ) : null}
          </Link>
        ))}
      </nav>
    </section>
  );
}

function ChannelProfileHeaderSkeleton({
  variant = "section",
}: {
  variant?: "home" | "section";
}) {
  const sectionVariant = variant === "section";

  return (
    <section
      aria-busy="true"
      aria-label="채널 정보를 불러오는 중"
      className={`relative border-b border-[#6D7A8A] bg-white ${
        sectionVariant ? "h-[var(--host-178)]" : "h-[var(--host-156)]"
      }`}
    >
      <div
        className={`flex items-start gap-[var(--host-42)] px-[var(--host-58)] ${
          sectionVariant ? "pt-[var(--host-36)]" : "pt-[var(--host-14)]"
        }`}
      >
        <ChannelSkeletonBlock className="size-[var(--host-128)] shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 pt-[var(--host-4)]">
          <div className="flex items-end gap-[var(--host-12)]">
            <ChannelSkeletonBlock className="h-[var(--host-28)] w-[var(--host-135)]" />
            <ChannelSkeletonBlock className="h-[var(--host-16)] w-[var(--host-150)]" />
          </div>
          <ChannelSkeletonBlock className="mt-[var(--host-14)] h-[var(--host-18)] w-[var(--host-430)] max-w-[70%]" />
          <ChannelSkeletonBlock className="mt-[var(--host-14)] h-[var(--host-16)] w-[var(--host-166)]" />
        </div>
      </div>
      <nav className="absolute bottom-0 left-[var(--host-228)] flex items-end gap-[var(--host-40-7)]">
        {[
          "w-[var(--host-90)]",
          "w-[var(--host-72)]",
          "w-[var(--host-85)]",
          "w-[var(--host-85)]",
          "w-[var(--host-85)]",
          "w-[var(--host-72)]",
        ].map((widthClass, index) => (
          <ChannelSkeletonBlock
            className={`mb-[var(--host-8)] h-[var(--host-18)] ${widthClass}`}
            key={`${widthClass}-${index}`}
          />
        ))}
      </nav>
    </section>
  );
}

export function ChannelContentSkeleton({
  variant = "grid",
}: {
  variant?: "board" | "gallery" | "grid" | "home" | "magazine" | "programs";
}) {
  if (variant === "board") {
    return (
      <div aria-busy="true" className="flex flex-col gap-[var(--host-14)]">
        <ChannelSkeletonBlock className="h-[var(--host-24)] w-[var(--host-210)]" />
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="grid h-[var(--host-42)] grid-cols-[var(--host-95)_minmax(0,1fr)_var(--host-156)] items-center gap-[var(--host-18)] border-b border-[#F3E2D5]"
            key={index}
          >
            <ChannelSkeletonBlock className="h-[var(--host-18)] w-[var(--host-62)]" />
            <ChannelSkeletonBlock className="h-[var(--host-18)] w-full" />
            <ChannelSkeletonBlock className="h-[var(--host-16)] w-[var(--host-119)] justify-self-end" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "home") {
    return (
      <div aria-busy="true" className="flex flex-col gap-[var(--host-34)]">
        <ChannelSkeletonSectionHeader />
        <div className="grid grid-cols-4 gap-[var(--host-36)]">
          {Array.from({ length: 4 }).map((_, index) => (
            <ChannelSkeletonCard key={index} />
          ))}
        </div>
        <ChannelSkeletonSectionHeader />
        <div className="grid grid-cols-3 gap-[var(--host-36)]">
          {Array.from({ length: 3 }).map((_, index) => (
            <ChannelSkeletonMediaCard key={index} />
          ))}
        </div>
        <ChannelSkeletonSectionHeader />
        <div className="flex flex-col gap-[var(--host-10)]">
          {Array.from({ length: 4 }).map((_, index) => (
            <ChannelSkeletonBlock className="h-[var(--host-34)] w-full" key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "magazine") {
    return (
      <div
        aria-busy="true"
        className="grid w-full grid-cols-[repeat(2,minmax(0,1fr))] gap-[var(--host-43)]"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <ChannelSkeletonMagazineCard key={index} />
        ))}
      </div>
    );
  }

  const cardCount = variant === "programs" ? 6 : 9;
  const gridClass =
    variant === "gallery"
      ? "grid grid-cols-3 gap-[var(--host-20)]"
      : "grid grid-cols-3 gap-x-[var(--host-36-7)] gap-y-[var(--host-40)]";

  return (
    <div aria-busy="true" className="flex flex-col gap-[var(--host-28)]">
      <div className="flex items-center gap-[var(--host-10)]">
        {Array.from({ length: 4 }).map((_, index) => (
          <ChannelSkeletonBlock
            className="h-[var(--host-30)] w-[var(--host-70)] rounded-full"
            key={index}
          />
        ))}
      </div>
      <ChannelSkeletonBlock className="h-[var(--host-16)] w-[var(--host-430)] max-w-[70%]" />
      <div className={gridClass}>
        {Array.from({ length: cardCount }).map((_, index) => (
          <ChannelSkeletonCard
            key={index}
            mediaClassName={variant === "gallery" ? "h-[var(--host-216)]" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function ChannelSkeletonSectionHeader() {
  return (
    <div className="flex items-center justify-between border-b border-[#F3E2D5] pb-[var(--host-14)]">
      <ChannelSkeletonBlock className="h-[var(--host-22)] w-[var(--host-135)]" />
      <ChannelSkeletonBlock className="h-[var(--host-18)] w-[var(--host-82)]" />
    </div>
  );
}

function ChannelSkeletonCard({
  mediaClassName = "h-[var(--host-156)]",
}: {
  mediaClassName?: string;
}) {
  return (
    <article className="min-w-0">
      <ChannelSkeletonBlock className={`${mediaClassName} w-full rounded-[6px]`} />
      <ChannelSkeletonBlock className="mt-[var(--host-14)] h-[var(--host-16)] w-[82%]" />
      <ChannelSkeletonBlock className="mt-[var(--host-8)] h-[var(--host-14)] w-[58%]" />
    </article>
  );
}

function ChannelSkeletonMediaCard() {
  return (
    <article className="min-w-0">
      <ChannelSkeletonBlock className="h-[var(--host-219)] w-full rounded-[6px]" />
      <ChannelSkeletonBlock className="mt-[var(--host-14)] h-[var(--host-16)] w-[76%]" />
    </article>
  );
}

function ChannelSkeletonMagazineCard() {
  return (
    <article className="overflow-hidden rounded-[8px] bg-[#FAFAFA]">
      <ChannelSkeletonBlock className="h-[var(--host-288)] w-full rounded-b-none" />
      <div className="px-[var(--host-18)] py-[var(--host-18)]">
        <ChannelSkeletonBlock className="h-[var(--host-18)] w-[70%]" />
        <ChannelSkeletonBlock className="mt-[var(--host-12)] h-[var(--host-14)] w-[38%]" />
      </div>
    </article>
  );
}

function ChannelSkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-[4px] bg-[#E3E0DA] ${className ?? ""}`}
      style={style}
    />
  );
}

export function ChannelSectionShell({
  actionLabel,
  badge,
  children,
  onToggle,
  title,
  toggleBusy = false,
  toggleOn = true,
}: {
  actionLabel?: string;
  badge?: string;
  children: ReactNode;
  onToggle?: () => void;
  title: string;
  toggleBusy?: boolean;
  toggleOn?: boolean;
}) {
  return (
    <section className="border-t border-[#D9D9D9] py-[var(--host-22)]">
      <div className="mb-[var(--host-18)] flex items-center justify-between">
        <div className="flex items-center gap-[var(--host-8)]">
          <SectionMoveIcon label={`${title} 섹션 이동`} />
          <h2 className="text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
            {title}
          </h2>
          {badge ? (
            <span className="inline-flex h-[var(--host-20)] items-center rounded-full bg-[#6D7A8A] px-[var(--host-10)] text-[length:var(--host-10)] font-semibold leading-[1.253] text-white">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-[var(--host-10)]">
          {actionLabel ? (
            <button
              className="text-[length:var(--host-11)] font-medium leading-[1.253] text-[#FE701E]"
              type="button"
            >
              {actionLabel}
            </button>
          ) : null}
          {onToggle ? (
            <button
              aria-label={`${title} 메뉴 ${toggleOn ? "숨기기" : "표시하기"}`}
              aria-pressed={toggleOn}
              className="inline-flex h-[var(--host-22)] w-[var(--host-28)] items-center justify-center rounded-full transition hover:bg-[#FFF3EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FE701E] disabled:cursor-wait disabled:opacity-55"
              disabled={toggleBusy}
              onClick={onToggle}
              type="button"
            >
              <Image
                alt=""
                className="h-[var(--host-16)] w-[var(--host-20)]"
                height={20}
                src={
                  toggleOn
                    ? nuvioIcons.formRequiredToggleOn
                    : nuvioIcons.formRequiredToggleOff
                }
                width={23}
              />
            </button>
          ) : null}
        </div>
      </div>
      {!toggleOn && onToggle ? (
        <p className="mb-[var(--host-12)] text-right text-[length:var(--host-11)] font-medium leading-[1.253] text-[#AEB8C2]">
          현재 공개 채널에서는 숨김 상태입니다.
        </p>
      ) : null}
      <div className={toggleOn || !onToggle ? "" : "opacity-45"}>{children}</div>
    </section>
  );
}

function SectionMoveIcon({ label }: { label: string }) {
  return (
    <span
      aria-label={label}
      className="grid size-[var(--host-22)] shrink-0 place-items-center text-[#D9D9D9]"
      role="img"
    >
      <span
        aria-hidden="true"
        className="block size-[var(--host-22)] bg-current"
        style={{
          mask: `url(${nuvioIcons.menuReorder}) center / contain no-repeat`,
          WebkitMask: `url(${nuvioIcons.menuReorder}) center / contain no-repeat`,
        } as CSSProperties}
      />
    </span>
  );
}

export function ChannelEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex min-h-[var(--host-160)] w-full flex-col items-center justify-center rounded-[8px] border border-dashed border-[#D9D9D9] bg-[#FCFCFC] px-[var(--host-24)] py-[var(--host-28)] text-center">
      <p className="text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#5B3A29]">
        {title}
      </p>
      <p className="mt-[var(--host-8)] text-[length:var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
        {description}
      </p>
    </div>
  );
}

function ChannelProgramMiniCard({
  program,
  variantIndex,
}: {
  program?: HostProgramDraft;
  variantIndex: number;
}) {
  const href = program ? `/programs/${encodeURIComponent(program.slug || program.id)}` : "/host/channels/programs";
  const title = program?.title || "제목 미입력";
  const statusLabel = getMiniProgramStatusLabel(program?.status, variantIndex);
  const periodLabel = program ? formatMiniProgramPeriod(program) : "일정 미정";

  return (
    <article className="min-w-0">
      <Link className="group block" href={href} target={program ? "_blank" : undefined}>
        <div className="h-[var(--host-194)] rounded-[4px] bg-[#D9D9D9]" />
        <div className="mt-[var(--host-10)] flex items-center gap-[var(--host-8)]">
          <span
            className={`inline-flex h-[var(--host-18)] items-center rounded-[4px] px-[var(--host-8)] text-[length:var(--host-10)] font-semibold leading-[1.253] text-white ${
              statusLabel === "오픈"
                ? "bg-[#FF9A3D]"
                : statusLabel === "예정"
                  ? "bg-[#FE701E]"
                  : "bg-[#6D7A8A]"
            }`}
          >
            {statusLabel}
          </span>
          <span className="truncate text-[length:var(--host-10)] font-normal leading-[1.253] text-[#6D7A8A]">
            {periodLabel}
          </span>
          <Image alt="" className="ml-auto size-[var(--host-16)]" height={16} src={nuvioIcons.bookmark} width={16} />
        </div>
        <h3 className="mt-[var(--host-8)] line-clamp-1 text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#5B3A29]">
          {title}
        </h3>
        <p className="mt-[var(--host-8)] line-clamp-3 text-[length:var(--host-10)] font-normal leading-[1.55] text-[#CAC4BC]">
          {program?.summary || "프로그램 소개가 아직 입력되지 않았습니다."}
        </p>
        <p className="mt-[var(--host-16)] text-[length:var(--host-10)] font-normal leading-[1.253] text-[#6D7A8A]">
          프로그램 기간
        </p>
      </Link>
    </article>
  );
}

function getMiniProgramStatusLabel(status: HostProgramDraft["status"] | undefined, index: number) {
  if (status === "open") return "오픈";
  if (status === "upcoming") return "예정";
  if (status === "closed" || status === "earlyClosed") return "마감";

  return index === 0 ? "작성중" : "미설정";
}

function formatMiniProgramPeriod(program: HostProgramDraft) {
  const start = formatMiniDate(program.activityStart);
  const end = formatMiniDate(program.activityEnd);

  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} 시작`;
  if (end) return `${end} 종료`;

  return "일정 미정";
}

function formatMiniDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function buildGalleryCards(
  media: VillageMediaContent[],
): HostChannelHomeGalleryCard[] {
  return media.map((item) => {
    const images = getMediaImageUrls(item);

    return {
      caption: item.summary || item.title || "갤러리 게시글",
      extraCount: images.length > 1 ? images.length - 1 : undefined,
      id: item.id,
      image: item.thumbnail || images[0],
      isVideo: isChannelVideoMedia(item),
      title: item.title || item.summary || "갤러리 게시글",
    };
  });
}

function buildStoryCards(
  media: VillageMediaContent[],
): HostChannelHomeStoryCard[] {
  return media.map((item) => ({
    body: item.body.join("\n"),
    date: formatChannelHomeStoryDate(item.date),
    id: item.id,
    image: item.thumbnail,
    title: item.title || "매거진 게시글",
  }));
}

function buildNoticeRows(posts: ChannelBoardPost[]): HostChannelHomeNoticeRow[] {
  return posts.map((post) => ({
    category: post.pinned ? "고정" : post.unread ? "신규" : "",
    date: post.createdAt,
    title: post.title,
    variant: post.pinned ? "pinned" : post.unread ? "new" : "default",
  }));
}

function isChannelMagazineMedia(item: VillageMediaContent) {
  return item.sourceUrl.includes("/host/channels/magazines");
}

function isChannelGalleryMedia(item: VillageMediaContent) {
  return !isChannelMagazineMedia(item);
}

function isChannelVideoMedia(
  item: Pick<VillageMediaContent, "embedUrl" | "provider" | "sourceUrl">,
) {
  return (
    item.provider === "youtube" ||
    item.provider === "instagram" ||
    item.provider === "video" ||
    Boolean(item.embedUrl) ||
    /\.(mp4|mov|webm)(\?|#|$)/iu.test(item.sourceUrl)
  );
}

function getMediaImageUrls(item: VillageMediaContent) {
  return item.images?.length ? item.images : [item.thumbnail].filter(Boolean);
}

function formatChannelHomeStoryDate(value: string) {
  const date = toChannelHomeDate(value);
  if (!date) return "작성일 미정";

  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}. ${String(date.getDate()).padStart(2, "0")}`;
}

function formatChannelHomeNoticeDate(value: string) {
  const date = toChannelHomeDate(value);
  if (!date) return "작성일 미정";

  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}. ${String(date.getDate()).padStart(2, "0")} ${String(
    date.getHours(),
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toChannelHomeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
