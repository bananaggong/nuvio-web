"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ImageIcon,
  Link2,
  Loader2,
  Pencil,
  Play,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import {
  ChannelEmptyState,
  ChannelProfileHeader,
} from "@/components/host-channel-home";
import { GalleryRichText } from "@/components/channel-gallery-rich-text";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import { selectHostChannel } from "@/lib/host-channel-selection";
import type { VillageMediaContent, VillageMediaProvider } from "@/lib/types";
import { channelPath } from "@/lib/channel-routing";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
};

type HostMediaPayload = {
  data?: VillageMediaContent[];
};

type SaveHostMediaPayload = {
  data?: VillageMediaContent;
  error?: string;
};

type UploadAssetPayload = {
  data?: {
    contentType: string;
    kind: "image" | "video";
    url: string;
  };
  error?: string;
};

type DeleteHostMediaPayload = {
  data?: { deleted?: boolean };
  error?: string;
};

type GalleryFilterMode = "all" | "photo" | "video";
type UploadStep = "picker" | "image" | "video";

type GalleryItem = VillageMediaContent & {
  imageCount?: number;
};

type GalleryDraft = {
  bodyText: string;
  date: string;
  embedUrl: string;
  id?: string;
  imageUrls: string[];
  linkInput: string;
  mediaUrl: string;
  provider: VillageMediaProvider;
  sourceUrl: string;
  thumbnail: string;
  title: string;
  videoUrl: string;
};

const gallerySourceUrl = "/host/channels/galleries";
const maxCaptionLength = 3000;

function createEmptyDraft(): GalleryDraft {
  return {
    bodyText: "",
    date: new Date().toISOString().slice(0, 10),
    embedUrl: "",
    imageUrls: [],
    linkInput: "",
    mediaUrl: "",
    provider: "link",
    sourceUrl: gallerySourceUrl,
    thumbnail: "",
    title: "",
    videoUrl: "",
  };
}

function normalizeGalleryItem(item: VillageMediaContent): GalleryItem {
  const imageUrls = item.images?.length ? item.images : [item.thumbnail].filter(Boolean);

  return {
    ...item,
    imageCount: imageUrls.length,
  };
}

function isManagedGalleryItem(item: VillageMediaContent) {
  return !item.sourceUrl.includes("/host/channels/magazines");
}

function isVideoItem(item: Pick<VillageMediaContent, "embedUrl" | "provider" | "sourceUrl">) {
  return (
    item.provider === "youtube" ||
    item.provider === "instagram" ||
    item.provider === "video" ||
    Boolean(item.embedUrl) ||
    /\.(mp4|mov|webm)(\?|#|$)/iu.test(item.sourceUrl)
  );
}

function formatGalleryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "작성일 미정";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

function createDraftFromItem(item: GalleryItem): GalleryDraft {
  const isVideo = isVideoItem(item);
  const imageUrls = item.images?.length ? item.images : [item.thumbnail].filter(Boolean);

  return {
    bodyText: (item.body.length > 0 ? item.body : [item.summary]).join("\n"),
    date: item.date.slice(0, 10),
    embedUrl: item.embedUrl ?? "",
    id: item.id,
    imageUrls: !isVideo ? imageUrls : [],
    linkInput: "",
    mediaUrl: item.provider === "video" ? item.sourceUrl : "",
    provider: item.provider ?? "link",
    sourceUrl: item.sourceUrl || gallerySourceUrl,
    thumbnail: item.thumbnail,
    title: item.title,
    videoUrl: item.provider === "video" ? item.sourceUrl : item.sourceUrl || "",
  };
}

function splitBodyLines(value: string) {
  return value
    .split(/\n+/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function createTitle(bodyText: string, fallback: string) {
  const compact = bodyText.replace(/\s+/gu, " ").trim();
  if (!compact) return fallback;
  return compact.length > 36 ? `${compact.slice(0, 36)}...` : compact;
}

function normalizeVideoLink(value: string):
  | {
      embedUrl: string;
      provider: VillageMediaProvider;
      sourceUrl: string;
    }
  | null {
  const rawValue = value.trim();
  if (!rawValue) return null;

  try {
    const url = new URL(rawValue);
    const hostname = url.hostname.replace(/^www\./u, "");

    if (hostname === "youtu.be") {
      const id = url.pathname.replace("/", "");
      return id
        ? {
            embedUrl: `https://www.youtube.com/embed/${id}`,
            provider: "youtube",
            sourceUrl: url.toString(),
          }
        : null;
    }

    if (hostname.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.split("/")[2];
        return id
          ? {
              embedUrl: `https://www.youtube.com/embed/${id}`,
              provider: "youtube",
              sourceUrl: url.toString(),
            }
          : null;
      }

      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/")[2];
        return id
          ? {
              embedUrl: `https://www.youtube.com/embed/${id}`,
              provider: "youtube",
              sourceUrl: url.toString(),
            }
          : null;
      }

      const id = url.searchParams.get("v");
      return id
        ? {
            embedUrl: `https://www.youtube.com/embed/${id}`,
            provider: "youtube",
            sourceUrl: url.toString(),
          }
        : null;
    }

    if (hostname.endsWith("instagram.com")) {
      const [type, id] = url.pathname.split("/").filter(Boolean);
      if (!id || (type !== "reel" && type !== "p" && type !== "tv")) return null;
      return {
        embedUrl: `https://www.instagram.com/${type}/${id}/embed`,
        provider: "instagram",
        sourceUrl: url.toString(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function HostChannelGalleries() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const galleryDetailParam = searchParams.get("galleryDetail");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [channel, setChannel] = useState<Village | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filterMode, setFilterMode] = useState<GalleryFilterMode>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<UploadStep | null>(null);
  const [draft, setDraft] = useState<GalleryDraft>(() => createEmptyDraft());
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const channelResponse = await fetch("/api/host/channels", {
        cache: "no-store",
      }).catch(() => null);

      if (!active) return;

      if (!channelResponse?.ok) {
        setChannel(null);
        setItems([]);
        return;
      }

      const channelPayload = (await channelResponse.json().catch(() => ({}))) as HostChannelPayload;
      const selectedChannel = selectHostChannel(
        channelPayload.data,
        requestedChannelSlug,
      );
      setChannel(selectedChannel);

      if (!selectedChannel?.slug) {
        setItems([]);
        return;
      }

      const mediaResponse = await fetch(
        `/api/host/media?villageSlug=${encodeURIComponent(selectedChannel.slug)}`,
        { cache: "no-store" },
      ).catch(() => null);
      if (!active) return;

      if (mediaResponse?.ok) {
        const payload = (await mediaResponse.json().catch(() => ({}))) as HostMediaPayload;
        const media = Array.isArray(payload.data) ? payload.data : [];
        setItems(
          media
            .filter(
              (item) =>
                item.villageSlug === selectedChannel.slug &&
                isManagedGalleryItem(item),
            )
            .map(normalizeGalleryItem),
        );
      } else {
        setItems([]);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [requestedChannelSlug]);

  const publicHref = channel?.slug ? channelPath(channel.slug) : "";
  const filteredItems = useMemo(() => {
    if (filterMode === "video") return items.filter(isVideoItem);
    if (filterMode === "photo") return items.filter((item) => !isVideoItem(item));
    return items;
  }, [filterMode, items]);
  const routeSelectedId = useMemo(() => {
    if (!galleryDetailParam || items.length === 0) return null;
    if (galleryDetailParam === "1") return items[0]?.id ?? null;
    return items.some((item) => item.id === galleryDetailParam)
      ? galleryDetailParam
      : null;
  }, [galleryDetailParam, items]);
  const selectedItem =
    items.find((item) => item.id === (selectedId ?? routeSelectedId)) ?? null;
  const uploadOpen = uploadStep !== null;
  const sidebarHeight = uploadOpen
    ? "min-h-[var(--host-959)]"
    : selectedItem
      ? "min-h-[var(--host-1261)]"
      : "min-h-[var(--host-707)]";

  function openUploadPicker() {
    setDraft(createEmptyDraft());
    setUploadStep("picker");
    setSelectedId(null);
    setIsDirty(false);
    setSaveMessage("");
  }

  function closeUpload() {
    setUploadStep(null);
    setDraft(createEmptyDraft());
    setIsDirty(false);
    setShowDiscardDialog(false);
  }

  function requestCloseUpload() {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    closeUpload();
  }

  function updateDraft(next: Partial<GalleryDraft>) {
    setDraft((current) => ({ ...current, ...next }));
    setIsDirty(true);
    setSaveMessage("");
  }

  async function uploadAsset(file: File, usage: string) {
    if (!channel?.slug) throw new Error("채널을 먼저 선택해 주세요.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("usage", usage);
    formData.append("villageSlug", channel.slug);

    const response = await fetch("/api/host/media-assets", {
      body: formData,
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as UploadAssetPayload;

    if (!response.ok || !payload.data?.url) {
      throw new Error(payload.error || "미디어 파일을 업로드하지 못했습니다.");
    }

    return payload.data;
  }

  async function handleMainFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    setSaveMessage("파일을 업로드하고 있습니다...");

    try {
      const uploaded = [];
      for (const file of files) {
        uploaded.push(await uploadAsset(file, "gallery-post"));
      }

      const firstVideo = uploaded.find((asset) => asset.kind === "video");
      if (firstVideo) {
        updateDraft({
          embedUrl: "",
          mediaUrl: firstVideo.url,
          provider: "video",
          sourceUrl: firstVideo.url,
          videoUrl: firstVideo.url,
        });
        setUploadStep("video");
      } else {
        const imageUrls = uploaded.map((asset) => asset.url);
        setDraft((current) => {
          const mergedImageUrls = Array.from(
            new Set([...current.imageUrls, ...imageUrls]),
          );
          const firstImageUrl = mergedImageUrls[0] ?? "";

          return {
            ...current,
            imageUrls: mergedImageUrls,
            mediaUrl: current.mediaUrl || firstImageUrl,
            provider: "link",
            sourceUrl: gallerySourceUrl,
            thumbnail: current.thumbnail || firstImageUrl,
          };
        });
        setIsDirty(true);
        setUploadStep("image");
      }

      setSaveMessage("");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "파일을 업로드하지 못했습니다.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleThumbnailFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setSaveMessage("썸네일을 업로드하고 있습니다...");

    try {
      const uploaded = await uploadAsset(file, "gallery-thumbnail");
      if (uploaded.kind !== "image") {
        throw new Error("썸네일에는 이미지 파일만 사용할 수 있습니다.");
      }
      updateDraft({ thumbnail: uploaded.url });
      setSaveMessage("");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "썸네일을 업로드하지 못했습니다.",
      );
    } finally {
      setUploading(false);
    }
  }

  function embedVideoLink() {
    const parsed = normalizeVideoLink(draft.videoUrl || draft.linkInput);
    if (!parsed) {
      setSaveMessage("유튜브 또는 인스타그램 게시물 링크를 입력해 주세요.");
      return;
    }

    updateDraft({
      embedUrl: parsed.embedUrl,
      mediaUrl: "",
      provider: parsed.provider,
      sourceUrl: parsed.sourceUrl,
      videoUrl: parsed.sourceUrl,
    });
    setUploadStep("video");
    setSaveMessage("");
  }

  function appendBodyLink() {
    const link = draft.linkInput.trim();
    if (!link) return;

    try {
      const normalized = new URL(link).toString();
      updateDraft({
        bodyText: [draft.bodyText.trim(), normalized].filter(Boolean).join("\n"),
        linkInput: "",
      });
    } catch {
      setSaveMessage("올바른 링크를 입력해 주세요.");
    }
  }

  function editItem(item: GalleryItem) {
    setDraft(createDraftFromItem(item));
    setUploadStep(isVideoItem(item) ? "video" : "image");
    setSelectedId(item.id);
    setIsDirty(false);
    setSaveMessage("");
  }

  async function deleteItem(item: GalleryItem) {
    if (!channel?.slug) return;
    if (!window.confirm("게시물을 삭제할까요?")) return;

    setSaving(true);
    setSaveMessage("삭제 중입니다...");

    try {
      const response = await fetch("/api/host/media", {
        body: JSON.stringify({ id: item.id, villageSlug: channel.slug }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as DeleteHostMediaPayload;

      if (!response.ok) {
        throw new Error(payload.error || "게시물을 삭제하지 못했습니다.");
      }

      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setSelectedId(null);
      setSaveMessage("삭제되었습니다. 공개 채널에 반영됩니다.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "게시물을 삭제하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    if (!channel?.slug) {
      setSaveMessage("채널을 먼저 선택해 주세요.");
      return;
    }

    if (!uploadStep || uploadStep === "picker") {
      setSaveMessage("등록할 이미지나 영상을 선택해 주세요.");
      return;
    }

    const isVideo = uploadStep === "video";
    if (!isVideo && !draft.thumbnail) {
      setSaveMessage("이미지를 먼저 업로드해 주세요.");
      return;
    }
    if (isVideo && !draft.embedUrl && !draft.mediaUrl && !draft.sourceUrl) {
      setSaveMessage("영상 파일을 업로드하거나 링크를 임베드해 주세요.");
      return;
    }

    setSaving(true);
    setSaveMessage("저장 중입니다...");

    try {
      const body = splitBodyLines(draft.bodyText);
      const summary = draft.bodyText.replace(/\s+/gu, " ").trim() || "갤러리 게시물";
      const title = draft.title.trim() || createTitle(draft.bodyText, "갤러리 게시물");
      const sourceUrl = isVideo
        ? draft.mediaUrl || draft.sourceUrl || gallerySourceUrl
        : gallerySourceUrl;
      const response = await fetch("/api/host/media", {
        body: JSON.stringify({
          body: body.length > 0 ? body : [summary],
          category: "archive",
          date: draft.date,
          embedUrl: draft.embedUrl || undefined,
          featured: draft.imageUrls.length > 1,
          id: draft.id || undefined,
          imageUrls: draft.imageUrls,
          provider: draft.provider,
          published: true,
          sourceName: channel.name || "호스트 채널",
          sourceUrl,
          summary,
          thumbnail: draft.thumbnail,
          title,
          updatedAt: new Date().toISOString(),
          villageSlug: channel.slug,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as SaveHostMediaPayload;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "갤러리 게시물을 저장하지 못했습니다.");
      }

      const savedItem = normalizeGalleryItem(payload.data);
      setItems((current) => {
        const withoutCurrent = current.filter((item) => item.id !== savedItem.id);
        return [savedItem, ...withoutCurrent];
      });
      setSelectedId(savedItem.id);
      setSaveMessage("저장되었습니다. 공개 채널에 반영됩니다.");
      closeUpload();
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "갤러리 게시물을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <HostWorkspaceLayout sidebarHeight={sidebarHeight}>
      <UnsavedChangesGuard when={isDirty && uploadOpen} />
      <section className="min-w-0 flex-1 overflow-x-clip bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader activeLabel="갤러리형" channel={channel} publicHref={publicHref} />

          {uploadOpen ? (
            <GalleryUploadSurface
              draft={draft}
              fileInputRef={fileInputRef}
              onAppendBodyLink={appendBodyLink}
              onBodyChange={(value) => {
                if (value.length <= maxCaptionLength) updateDraft({ bodyText: value });
              }}
              onBodyLinkChange={(value) => updateDraft({ linkInput: value })}
              onClose={requestCloseUpload}
              onEmbedVideo={embedVideoLink}
              onFileChange={handleMainFileChange}
              onSave={saveDraft}
              onThumbnailChange={handleThumbnailFileChange}
              onThumbnailClick={() => thumbnailInputRef.current?.click()}
              onUploadClick={() => fileInputRef.current?.click()}
              onVideoLinkChange={(value) => updateDraft({ videoUrl: value })}
              saveMessage={saveMessage}
              saving={saving}
              step={uploadStep}
              thumbnailInputRef={thumbnailInputRef}
              uploading={uploading}
            />
          ) : (
            <>
              <section className="relative border-b border-[#6D7A8A] pb-[var(--host-24)] pt-[var(--host-24)]">
                <button
                  aria-label="갤러리 게시물 추가"
                  className="absolute right-[var(--host-37)] top-[var(--host-24)] size-[var(--host-22)] text-[#6D7A8A] transition hover:text-[#FE701E]"
                  onClick={openUploadPicker}
                  type="button"
                >
                  <MaskIcon icon={nuvioIcons.channelAddCircle} />
                </button>

                <div className="mx-auto w-[var(--host-1142)] max-w-full">
                  <GalleryFilterTabs activeMode={filterMode} onChange={setFilterMode} />

                  {selectedItem ? (
                    <GalleryDetailView
                      item={selectedItem}
                      onDelete={() => void deleteItem(selectedItem)}
                      onEdit={() => editItem(selectedItem)}
                    />
                  ) : filteredItems.length > 0 ? (
                    <GalleryGrid items={filteredItems} onSelect={setSelectedId} />
                  ) : (
                    <ChannelEmptyState
                      description={
                        filterMode === "video"
                          ? "영상 게시물을 추가하면 갤러리형 메뉴에 표시됩니다."
                          : "이미지나 영상을 추가하면 갤러리형 메뉴에 표시됩니다."
                      }
                      title={
                        filterMode === "video"
                          ? "아직 등록된 영상 게시물이 없습니다."
                          : "아직 등록된 갤러리 게시물이 없습니다."
                      }
                    />
                  )}
                </div>
              </section>

              <footer className="flex h-[var(--host-69)] items-start gap-[var(--host-12)] border-b border-[#6D7A8A] px-[var(--host-24)] pt-[var(--host-18)]">
                <button
                  className="h-[var(--host-29)] rounded-[3px] border border-[#6D7A8A] bg-white px-[var(--host-20)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={saving}
                  onClick={() => setSaveMessage("저장할 변경사항이 없습니다.")}
                  type="button"
                >
                  저장
                </button>
                {saveMessage ? (
                  <span className="text-[length:var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]">
                    {saveMessage}
                  </span>
                ) : null}
              </footer>
            </>
          )}
        </div>
      </section>

      {showDiscardDialog ? (
        <DiscardDialog
          onCancel={() => setShowDiscardDialog(false)}
          onConfirm={closeUpload}
        />
      ) : null}
    </HostWorkspaceLayout>
  );
}

function GalleryFilterTabs({
  activeMode,
  onChange,
}: {
  activeMode: GalleryFilterMode;
  onChange: (mode: GalleryFilterMode) => void;
}) {
  const tabs: Array<{ icon: string; label: string; mode: GalleryFilterMode }> = [
    { icon: nuvioIcons.channelViewGrid, label: "전체보기", mode: "all" },
    { icon: nuvioIcons.channelViewStack, label: "사진만 보기", mode: "photo" },
    { icon: nuvioIcons.channelViewVideo, label: "영상만 보기", mode: "video" },
  ];

  return (
    <div className="mx-auto flex h-[var(--host-48)] items-start justify-center gap-[var(--host-82)] pt-[var(--host-6)]">
      {tabs.map((tab) => (
        <button
          aria-label={tab.label}
          aria-pressed={activeMode === tab.mode}
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
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-[var(--host-12)] grid w-full grid-cols-[repeat(5,minmax(0,var(--host-222)))] gap-x-[var(--host-6)] gap-y-[var(--host-36)]">
      {items.map((item) => (
        <button
          className="group w-[var(--host-222)] min-w-0 text-left"
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <MediaFrame
            className="aspect-[4/5] w-[var(--host-222)] rounded-[5px]"
            imageCount={item.imageCount}
            item={item}
            small
          />
          <p className="mt-[var(--host-8)] line-clamp-2 w-[var(--host-200)] px-[var(--host-6)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]">
            {item.summary || item.title}
          </p>
        </button>
      ))}
    </div>
  );
}

function GalleryDetailView({
  item,
  onDelete,
  onEdit,
}: {
  item: GalleryItem;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const video = isVideoItem(item);
  const bodyLines = item.body.length > 0 ? item.body : [item.summary];

  return (
    <article className="mt-[var(--host-40)] flex w-full items-start gap-[var(--host-12)] pb-[var(--host-50)]">
      <div className="relative flex min-w-0 flex-1 items-start justify-center">
        <button
          aria-label="이전 게시물"
          className="absolute left-[var(--host-42)] top-[var(--host-281)] h-[var(--host-42)] w-[var(--host-27)] text-[#D9D9D9] transition hover:text-[#CAC4BC]"
          type="button"
        >
          <ChevronShape direction="left" />
        </button>
        <MediaFrame
          className={
            video
              ? "mt-[var(--host-22)] h-[var(--host-430)] w-[var(--host-765)] rounded-[6px]"
              : "mt-[var(--host-22)] h-[var(--host-600)] w-[var(--host-480)] rounded-[6px]"
          }
          imageCount={item.imageCount}
          item={item}
        />
        <button
          aria-label="다음 게시물"
          className="absolute right-[var(--host-42)] top-[var(--host-281)] h-[var(--host-42)] w-[var(--host-27)] text-[#D9D9D9] transition hover:text-[#CAC4BC]"
          type="button"
        >
          <ChevronShape direction="right" />
        </button>
      </div>

      <div className="relative h-[var(--host-501)] w-[var(--host-340)] shrink-0 pt-[var(--host-20)]">
        <div className="mb-[var(--host-12)] flex w-full items-start gap-[var(--host-12)] px-[var(--host-12)] text-[#6D7A8A]">
          <span className="min-w-0 flex-1" />
          <button aria-label="게시물 편집" className="size-[var(--host-16)] transition hover:text-[#FE701E]" onClick={onEdit} type="button">
            <Pencil className="h-full w-full" strokeWidth={1.8} />
          </button>
          <button aria-label="게시물 삭제" className="size-[var(--host-16)] transition hover:text-[#FE701E]" onClick={onDelete} type="button">
            <Trash2 className="h-full w-full" strokeWidth={1.8} />
          </button>
        </div>
        <p className="text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#6D7A8A]">
          {formatGalleryDate(item.date)} <span className="font-normal">(작성일)</span>
        </p>
        <GalleryRichText
          className="mt-[var(--host-16)] h-[var(--host-429)] overflow-y-auto whitespace-pre-wrap text-[length:var(--host-16)] font-normal leading-[1.253] text-[#0D0D0C] [&>p]:mb-[var(--host-2)]"
          lines={bodyLines}
        />
      </div>
    </article>
  );
}

function GalleryUploadSurface({
  draft,
  fileInputRef,
  onAppendBodyLink,
  onBodyChange,
  onBodyLinkChange,
  onClose,
  onEmbedVideo,
  onFileChange,
  onSave,
  onThumbnailChange,
  onThumbnailClick,
  onUploadClick,
  onVideoLinkChange,
  saveMessage,
  saving,
  step,
  thumbnailInputRef,
  uploading,
}: {
  draft: GalleryDraft;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAppendBodyLink: () => void;
  onBodyChange: (value: string) => void;
  onBodyLinkChange: (value: string) => void;
  onClose: () => void;
  onEmbedVideo: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onThumbnailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onThumbnailClick: () => void;
  onUploadClick: () => void;
  onVideoLinkChange: (value: string) => void;
  saveMessage: string;
  saving: boolean;
  step: UploadStep | null;
  thumbnailInputRef: RefObject<HTMLInputElement | null>;
  uploading: boolean;
}) {
  return (
    <section className="border-b border-[#6D7A8A]">
      <input
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
        className="hidden"
        multiple
        onChange={onFileChange}
        ref={fileInputRef}
        type="file"
      />
      <input
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onThumbnailChange}
        ref={thumbnailInputRef}
        type="file"
      />

      {step === "picker" ? (
        <div className="relative flex h-[var(--host-464)] flex-col items-center justify-center gap-[var(--host-51)] bg-[#D9D9D9]/20 pb-[var(--host-105)]">
          <CloseUploadButton onClose={onClose} />
          <button
            className="flex flex-col items-center gap-[var(--host-17)] rounded-[6px] bg-[#6D7A8A] p-[var(--host-18)] text-[#FCFCFC] transition hover:bg-[#5F6B7B] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={uploading}
            onClick={onUploadClick}
            type="button"
          >
            {uploading ? <Loader2 className="size-[var(--host-38)] animate-spin" /> : <Upload className="size-[var(--host-38)]" strokeWidth={1.7} />}
            <span className="w-[var(--host-82)] text-center text-[length:var(--host-16)] font-medium leading-[1.253]">
              파일 업로드
            </span>
          </button>
          <div className="flex w-[var(--host-360)] flex-col gap-[var(--host-7)]">
            <input
              className="h-[var(--host-34)] rounded-[6px] border border-[#6D7A8A] bg-white px-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#D3CFC8]"
              onChange={(event) => onVideoLinkChange(event.target.value)}
              placeholder="동영상 링크 입력"
              value={draft.videoUrl}
            />
            <button
              className="h-[var(--host-29)] rounded-[6px] bg-[#6D7A8A] px-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#FCFCFC] transition hover:bg-[#5F6B7B]"
              onClick={onEmbedVideo}
              type="button"
            >
              동영상 임베드
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#D9D9D9]/20">
          <div className="relative flex h-[var(--host-65)] items-start justify-center bg-[#D9D9D9] px-[var(--host-40)] pb-[var(--host-16)] pt-[var(--host-27)]">
            <p className="min-w-0 flex-1 text-center text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#6D7A8A]">
              새 게시물 만들기
            </p>
            <CloseUploadButton onClose={onClose} inline />
          </div>

          <div className="flex w-full items-start justify-end">
            {step === "image" ? (
              <ImageUploadPreview draft={draft} onUploadClick={onUploadClick} />
            ) : (
              <VideoUploadPreview
                draft={draft}
                onEmbedVideo={onEmbedVideo}
                onThumbnailClick={onThumbnailClick}
                onUploadClick={onUploadClick}
                onVideoLinkChange={onVideoLinkChange}
                uploading={uploading}
              />
            )}

            <CaptionEditor
              bodyText={draft.bodyText}
              linkInput={draft.linkInput}
              onAppendBodyLink={onAppendBodyLink}
              onBodyChange={onBodyChange}
              onLinkChange={onBodyLinkChange}
            />
          </div>

          {step === "image" ? (
            <ImageThumbnailRail draft={draft} onUploadClick={onUploadClick} />
          ) : null}

          <div className="flex h-[var(--host-69)] items-start justify-end gap-[var(--host-12)] border-t border-[#D9D9D9] px-[var(--host-28)] pt-[var(--host-20)]">
            {saveMessage ? (
              <span className="mr-auto text-[length:var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]">
                {saveMessage}
              </span>
            ) : null}
            <button
              className="h-[var(--host-29)] rounded-[3px] border border-[#6D7A8A] bg-[#FCFCFC] px-[var(--host-20)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving || uploading}
              onClick={onSave}
              type="button"
            >
              {saving ? "저장 중" : "저장"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ImageUploadPreview({
  draft,
  onUploadClick,
}: {
  draft: GalleryDraft;
  onUploadClick: () => void;
}) {
  return (
    <div className="flex w-[clamp(792px,55vw,1056px)] shrink-0 flex-col items-center border-r-2 border-[#D9D9D9] py-[var(--host-18)]">
      <div className="relative flex h-[var(--host-643)] w-full items-start justify-center">
        <div className="relative mt-[var(--host-22)] h-[var(--host-600)] w-[var(--host-480)] overflow-hidden rounded-[6px] bg-[#D9D9D9]">
          {draft.thumbnail ? (
            <Image alt="" className="object-cover" fill sizes="(min-width: 1920px) 640px, 480px" src={draft.thumbnail} />
          ) : (
            <button
              className="flex h-full w-full flex-col items-center justify-center gap-[var(--host-12)] text-[#6D7A8A] transition hover:bg-[#CAC4BC]/40"
              onClick={onUploadClick}
              type="button"
            >
              <ImageIcon size={36} strokeWidth={1.7} />
              <span className="text-[length:var(--host-14)] font-medium">이미지 업로드</span>
            </button>
          )}
          {draft.imageUrls.length > 1 ? (
            <span className="absolute right-[var(--host-16)] top-[var(--host-12)] text-[length:var(--host-24)] font-normal leading-[1.253] text-[#FFF6EC]">
              +{draft.imageUrls.length - 1}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VideoUploadPreview({
  draft,
  onEmbedVideo,
  onThumbnailClick,
  onUploadClick,
  onVideoLinkChange,
  uploading,
}: {
  draft: GalleryDraft;
  onEmbedVideo: () => void;
  onThumbnailClick: () => void;
  onUploadClick: () => void;
  onVideoLinkChange: (value: string) => void;
  uploading: boolean;
}) {
  return (
    <div className="flex w-[clamp(792px,55vw,1056px)] shrink-0 flex-col gap-[var(--host-18)] border-r-2 border-[#D9D9D9] pt-[var(--host-18)]">
      <div className="flex w-full items-start justify-center gap-[var(--host-22)] px-[var(--host-32)]">
        <button
          className="flex h-[var(--host-36)] items-center justify-center gap-[var(--host-4)] rounded-[6px] bg-[#6D7A8A] px-[var(--host-11)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#FCFCFC] transition hover:bg-[#5F6B7B] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={uploading}
          onClick={onUploadClick}
          type="button"
        >
          {uploading ? <Loader2 className="size-[var(--host-20)] animate-spin" /> : <Upload className="size-[var(--host-20)]" strokeWidth={1.7} />}
          파일 변경
        </button>
        <div className="flex min-w-0 flex-1 gap-[var(--host-7)]">
          <input
            className="h-[var(--host-36)] w-[var(--host-456)] rounded-[6px] border border-[#6D7A8A] bg-white px-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#D3CFC8]"
            onChange={(event) => onVideoLinkChange(event.target.value)}
            placeholder="동영상 링크 입력"
            value={draft.videoUrl}
          />
          <button
            className="h-[var(--host-36)] min-w-[var(--host-132)] flex-1 rounded-[6px] bg-[#6D7A8A] px-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#FCFCFC] transition hover:bg-[#5F6B7B]"
            onClick={onEmbedVideo}
            type="button"
          >
            동영상 임베드
          </button>
        </div>
      </div>

      <div className="flex h-[var(--host-643)] w-full flex-col gap-[var(--host-14)] px-[var(--host-18)]">
        <div className="relative h-[var(--host-430)] w-full overflow-hidden bg-[#D9D9D9]">
          <VideoPreview draft={draft} />
        </div>
        <div className="flex items-end gap-[var(--host-14)]">
          <div className="relative h-[clamp(178px,12.361vw,237px)] w-[clamp(142px,9.861vw,189px)] overflow-hidden rounded-[6px] bg-[#D9D9D9]">
            {draft.thumbnail ? (
              <Image alt="" className="object-cover" fill sizes="190px" src={draft.thumbnail} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
                4:5
              </span>
            )}
          </div>
          <button
            className="flex items-center justify-center gap-[var(--host-9)] rounded-[3px] bg-[#6D7A8A] p-[var(--host-10)] text-[#FCFCFC] transition hover:bg-[#5F6B7B]"
            onClick={onThumbnailClick}
            type="button"
          >
            <Upload className="size-[var(--host-20)]" strokeWidth={1.7} />
            <span className="w-[var(--host-64)] text-[length:var(--host-12)] font-medium leading-[1.253]">
              썸네일 추가
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CaptionEditor({
  bodyText,
  linkInput,
  onAppendBodyLink,
  onBodyChange,
  onLinkChange,
}: {
  bodyText: string;
  linkInput: string;
  onAppendBodyLink: () => void;
  onBodyChange: (value: string) => void;
  onLinkChange: (value: string) => void;
}) {
  return (
    <aside className="flex min-w-0 flex-1 flex-col gap-[var(--host-19)]">
      <div className="flex h-[var(--host-575)] flex-col bg-[#FCFCFC] pl-[var(--host-12)] pt-[var(--host-40)]">
        <textarea
          className="min-h-0 flex-1 resize-none bg-transparent pr-[var(--host-12)] text-[length:var(--host-16)] font-normal leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#CAC4BC]"
          maxLength={maxCaptionLength}
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder="게시물과 함께 게시될 내용을 작성해주세요"
          value={bodyText}
        />
        <div className="flex h-[var(--host-30)] items-center justify-end gap-[var(--host-8)] pr-[var(--host-6)] text-[#CAC4BC]">
          <Link2 size={20} strokeWidth={1.7} />
          <span className="text-[length:var(--host-16)] font-normal leading-[1.253]">
            {bodyText.length}/{maxCaptionLength}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[var(--host-7)] px-[var(--host-8)]">
        <input
          className="h-[var(--host-34)] rounded-[6px] border border-[#6D7A8A] bg-white px-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#D3CFC8]"
          onChange={(event) => onLinkChange(event.target.value)}
          placeholder="링크 입력"
          value={linkInput}
        />
        <button
          className="h-[var(--host-29)] rounded-[6px] bg-[#6D7A8A] px-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#FCFCFC] transition hover:bg-[#5F6B7B]"
          onClick={onAppendBodyLink}
          type="button"
        >
          링크 추가
        </button>
      </div>
    </aside>
  );
}

function ImageThumbnailRail({
  draft,
  onUploadClick,
}: {
  draft: GalleryDraft;
  onUploadClick: () => void;
}) {
  return (
    <div className="flex h-[var(--host-127)] items-center gap-[var(--host-8)] border-t border-[#D9D9D9] px-[var(--host-14)] py-[var(--host-18)]">
      <button
        aria-label="이미지 순서 변경"
        className="grid size-[var(--host-22)] place-items-center text-[#6D7A8A]"
        type="button"
      >
        <MaskIcon icon={nuvioIcons.menuReorder} />
      </button>
      {draft.imageUrls.map((url) => (
        <div className="relative size-[var(--host-91)] overflow-hidden rounded-[4px] bg-[#D9D9D9]" key={url}>
          <Image alt="" className="object-cover" fill sizes="122px" src={url} />
          <span className="absolute right-[var(--host-6)] top-[var(--host-4)] text-[length:var(--host-16)] font-semibold text-white">
            x
          </span>
        </div>
      ))}
      <button
        aria-label="이미지 추가"
        className="grid size-[var(--host-25)] place-items-center rounded-full bg-[#6D7A8A] text-white transition hover:bg-[#5F6B7B]"
        onClick={onUploadClick}
        type="button"
      >
        <Plus size={18} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function CloseUploadButton({
  inline = false,
  onClose,
}: {
  inline?: boolean;
  onClose: () => void;
}) {
  return (
    <button
      aria-label="닫기"
      className={`grid size-[var(--host-22)] place-items-center rounded-full bg-[#6D7A8A] text-[#FCFCFC] transition hover:bg-[#5F6B7B] ${
        inline ? "relative shrink-0" : "absolute right-[var(--host-40)] top-[var(--host-27)]"
      }`}
      onClick={onClose}
      type="button"
    >
      <X size={16} strokeWidth={2.4} />
    </button>
  );
}

function MediaFrame({
  className,
  imageCount,
  item,
  small = false,
}: {
  className: string;
  imageCount?: number;
  item: Pick<VillageMediaContent, "embedUrl" | "provider" | "sourceUrl" | "summary" | "thumbnail" | "title">;
  small?: boolean;
}) {
  const isVideo = isVideoItem(item);

  return (
    <div className={`relative overflow-hidden bg-[#D9D9D9] ${className}`}>
      {item.thumbnail ? (
        <Image
          alt={item.summary || item.title}
          className="object-cover"
          fill
          sizes={small ? "(min-width: 1920px) 296px, 222px" : "(min-width: 1920px) 640px, 480px"}
          src={item.thumbnail}
        />
      ) : isVideo ? (
        <VideoPreview draft={{
          ...createEmptyDraft(),
          embedUrl: item.embedUrl ?? "",
          mediaUrl: item.provider === "video" ? item.sourceUrl : "",
          provider: item.provider ?? "link",
          sourceUrl: item.sourceUrl,
          videoUrl: item.sourceUrl,
        }} />
      ) : null}
      {imageCount && imageCount > 0 && !isVideo ? (
        <span className="absolute right-[var(--host-12)] top-[var(--host-10)] text-[length:var(--host-18)] font-semibold leading-[1.253] text-[#F9F9F9]">
          +{imageCount}
        </span>
      ) : null}
      {isVideo ? (
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-[#FFF6EC]">
          <Play className={small ? "size-[var(--host-28)]" : "size-[var(--host-77)]"} fill="currentColor" strokeWidth={0} />
        </span>
      ) : null}
    </div>
  );
}

function VideoPreview({ draft }: { draft: GalleryDraft }) {
  if (draft.mediaUrl) {
    return (
      <video
        className="h-full w-full object-cover"
        controls={false}
        muted
        playsInline
        preload="metadata"
        src={draft.mediaUrl}
      />
    );
  }

  if (draft.embedUrl) {
    return (
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="pointer-events-none h-full w-full"
        referrerPolicy="strict-origin-when-cross-origin"
        src={draft.embedUrl}
        title="동영상 미리보기"
      />
    );
  }

  return (
    <div className="grid h-full w-full place-items-center text-[#FFF6EC]">
      <Video className="size-[var(--host-72)]" strokeWidth={1.4} />
    </div>
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

function DiscardDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 px-5"
      role="dialog"
    >
      <section className="w-[320px] overflow-hidden bg-white text-[#0D0D0C] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="px-5 py-5">
          <h2 className="text-[16px] font-semibold leading-[1.4]">입력을 취소하시겠습니까?</h2>
          <p className="mt-2 text-[15px] font-medium leading-[1.4]">
            변경사항이 저장되지 않을 수 있습니다.
          </p>
        </div>
        <div className="grid h-[51px] grid-cols-2 border-t border-[#D7D7D7]">
          <button
            className="border-r border-[#D7D7D7] text-[15px] font-semibold text-[#0D0D0C] transition hover:bg-[#F7F7F7]"
            onClick={onCancel}
            type="button"
          >
            취소
          </button>
          <button
            className="text-[15px] font-semibold text-[#008CFF] transition hover:bg-[#F7F7F7]"
            onClick={onConfirm}
            type="button"
          >
            나가기
          </button>
        </div>
      </section>
    </div>
  );
}
