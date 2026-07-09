"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ImageIcon, Loader2, Save, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";
import {
  ChannelEmptyState,
  ChannelProfileHeader,
} from "@/components/host-channel-home";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { selectHostChannel } from "@/lib/host-channel-selection";
import type { VillageMediaContent } from "@/lib/types";
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

type ChannelMagazine = VillageMediaContent;

type MagazineEditorDraft = {
  bodyText: string;
  date: string;
  id?: string;
  summary: string;
  thumbnail: string;
  title: string;
};

const magazineSourceUrl = "/host/channels/magazines";

function createEmptyMagazineDraft(): MagazineEditorDraft {
  return {
    bodyText: "",
    date: new Date().toISOString().slice(0, 10),
    summary: "",
    thumbnail: "",
    title: "",
  };
}

function normalizeMagazineItem(item: VillageMediaContent): ChannelMagazine {
  return item;
}

function createMagazineDraftFromItem(item: ChannelMagazine): MagazineEditorDraft {
  return {
    bodyText: item.body.join("\n\n"),
    date: item.date.slice(0, 10),
    id: item.id,
    summary: item.summary,
    thumbnail: item.thumbnail,
    title: item.title,
  };
}

function formatMagazineDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "작성일 미정";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

function splitMagazineBody(value: string) {
  return value
    .split(/\n{2,}/u)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function HostChannelMagazines() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [channel, setChannel] = useState<Village | null>(null);
  const [items, setItems] = useState<ChannelMagazine[]>([]);
  const [editorDraft, setEditorDraft] = useState<MagazineEditorDraft | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch("/api/host/channels", { cache: "no-store" }).catch(
        () => null,
      );
      if (!active || !response?.ok) return;

      const payload = (await response.json().catch(() => ({}))) as HostChannelPayload;
      const selectedChannel = selectHostChannel(payload.data, requestedChannelSlug);
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
        const mediaPayload = (await mediaResponse.json().catch(() => ({}))) as HostMediaPayload;
        const media = Array.isArray(mediaPayload.data) ? mediaPayload.data : [];
        setItems(
          media
            .filter(
              (item) =>
                item.villageSlug === selectedChannel.slug &&
                item.provider === "link" &&
                item.sourceUrl.includes("/host/channels/magazines"),
            )
            .map(normalizeMagazineItem),
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

  function openNewMagazineEditor() {
    setEditorDraft(createEmptyMagazineDraft());
    setSaveMessage("");
  }

  function editMagazine(item: ChannelMagazine) {
    setEditorDraft(createMagazineDraftFromItem(item));
    setSaveMessage("");
  }

  function updateEditorDraft(patch: Partial<MagazineEditorDraft>) {
    setEditorDraft((current) => (current ? { ...current, ...patch } : current));
    setSaveMessage("");
  }

  function closeEditor() {
    if (saving || uploadingCover) return;
    setEditorDraft(null);
    setSaveMessage("");
  }

  async function uploadCoverImage(file: File | undefined) {
    if (!file || !editorDraft || uploadingCover) return;
    if (!channel?.slug) {
      setSaveMessage("채널을 먼저 선택해 주세요.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSaveMessage("대표 이미지는 이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setUploadingCover(true);
    setSaveMessage("대표 이미지를 업로드하고 있습니다...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("usage", "channel-magazine-cover");
      formData.append("villageSlug", channel.slug);

      const response = await fetch("/api/host/media-assets", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as UploadAssetPayload;

      if (!response.ok || !payload.data?.url || payload.data.kind !== "image") {
        throw new Error(payload.error || "대표 이미지를 업로드하지 못했습니다.");
      }

      updateEditorDraft({ thumbnail: payload.data.url });
      setSaveMessage("");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "대표 이미지를 업로드하지 못했습니다.",
      );
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function saveMagazineDraft() {
    if (!channel?.slug) {
      setSaveMessage("채널을 먼저 선택해 주세요.");
      return;
    }

    if (!editorDraft) {
      setSaveMessage("작성 중인 매거진 글이 없습니다.");
      return;
    }

    const title = editorDraft.title.trim();
    const body = splitMagazineBody(editorDraft.bodyText);
    const summary =
      editorDraft.summary.trim() ||
      body[0]?.replace(/\s+/gu, " ").slice(0, 120) ||
      title;

    if (!title) {
      setSaveMessage("제목을 입력해 주세요.");
      return;
    }

    if (body.length === 0) {
      setSaveMessage("본문을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setSaveMessage("저장 중입니다...");

    try {
      const now = new Date().toISOString();
      const response = await fetch("/api/host/media", {
        body: JSON.stringify({
          body,
          category: "original",
          date: editorDraft.date || now.slice(0, 10),
          featured: Boolean(editorDraft.thumbnail),
          id: editorDraft.id,
          imageUrls: editorDraft.thumbnail ? [editorDraft.thumbnail] : [],
          provider: "link",
          published: true,
          sourceName: channel.name || "호스트 채널",
          sourceUrl: magazineSourceUrl,
          summary,
          thumbnail: editorDraft.thumbnail,
          title,
          updatedAt: now,
          villageSlug: channel.slug,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as SaveHostMediaPayload;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "매거진 게시물을 저장하지 못했습니다.");
      }

      const savedItem = normalizeMagazineItem(payload.data);
      setItems((current) => {
        const withoutSaved = current.filter((item) => item.id !== savedItem.id);
        return [savedItem, ...withoutSaved];
      });
      setEditorDraft(null);
      setSaveMessage("저장되었습니다. 공개 채널에 반영됩니다.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "매거진 게시물을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-2053)]">
      <section className="min-w-0 flex-1 overflow-x-clip bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader activeLabel="매거진형" channel={channel} publicHref={publicHref} />

          <section className="relative min-h-[var(--host-1806)] border-b border-[#6D7A8A] pb-[var(--host-44)] pt-[var(--host-62)]">
            {!editorDraft ? (
              <button
                aria-label="매거진 게시물 추가"
                className="absolute right-[var(--host-36)] top-[var(--host-34)] size-[var(--host-20)] transition hover:opacity-80"
                onClick={openNewMagazineEditor}
                type="button"
              >
                <Image alt="" height={24} src={nuvioIcons.channelAddCircle} width={24} />
              </button>
            ) : null}

            {editorDraft ? (
              <MagazineEditorSurface
                coverInputRef={coverInputRef}
                draft={editorDraft}
                onClose={closeEditor}
                onCoverChange={(event) => void uploadCoverImage(event.target.files?.[0])}
                onCoverClick={() => coverInputRef.current?.click()}
                onSave={() => void saveMagazineDraft()}
                onUpdate={updateEditorDraft}
                saveMessage={saveMessage}
                saving={saving}
                uploadingCover={uploadingCover}
              />
            ) : items.length > 0 ? (
              <div className="mx-auto grid w-[var(--host-1103)] max-w-full grid-cols-[repeat(2,var(--host-530))] gap-x-[var(--host-43)] gap-y-[var(--host-43)]">
                {items.map((item) => (
                  <MagazineCard
                    item={item}
                    key={item.id}
                    onEdit={() => editMagazine(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="mx-auto w-[var(--host-1103)] max-w-full">
                <ChannelEmptyState
                  description="매거진 게시물을 추가하면 이 목록에 표시됩니다."
                  title="아직 작성된 매거진 게시물이 없습니다."
                />
              </div>
            )}
          </section>

          {!editorDraft && saveMessage ? (
            <footer className="flex h-[var(--host-69)] items-center gap-[var(--host-12)] border-b border-[#6D7A8A] px-[var(--host-24)]">
              <span className="text-[length:var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]">
                {saveMessage}
              </span>
            </footer>
          ) : null}
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function MagazineEditorSurface({
  coverInputRef,
  draft,
  onClose,
  onCoverChange,
  onCoverClick,
  onSave,
  onUpdate,
  saveMessage,
  saving,
  uploadingCover,
}: {
  coverInputRef: RefObject<HTMLInputElement | null>;
  draft: MagazineEditorDraft;
  onClose: () => void;
  onCoverChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCoverClick: () => void;
  onSave: () => void;
  onUpdate: (patch: Partial<MagazineEditorDraft>) => void;
  saveMessage: string;
  saving: boolean;
  uploadingCover: boolean;
}) {
  const isBusy = saving || uploadingCover;

  return (
    <div className="mx-auto w-[var(--host-1103)] max-w-full">
      <div className="mb-[var(--host-24)] flex items-center justify-between">
        <div>
          <p className="text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#FE701E]">
            MAGAZINE
          </p>
          <h2 className="mt-[var(--host-8)] text-[length:var(--host-24)] font-semibold leading-[1.253] text-[#5B3A29]">
            {draft.id ? "매거진 글 수정" : "새 매거진 글 작성"}
          </h2>
        </div>
        <button
          aria-label="매거진 작성 닫기"
          className="grid size-[var(--host-32)] place-items-center rounded-full border border-[#D9D9D9] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] disabled:opacity-45"
          disabled={isBusy}
          onClick={onClose}
          type="button"
        >
          <X className="size-[var(--host-18)]" strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-[var(--host-429)_minmax(0,1fr)] gap-[var(--host-36)]">
        <aside className="min-w-0">
          <input
            accept="image/gif,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onCoverChange}
            ref={coverInputRef}
            type="file"
          />
          <button
            className="relative grid h-[var(--host-429)] w-full place-items-center overflow-hidden rounded-[8px] bg-[#D9D9D9] text-[#6D7A8A] transition hover:bg-[#D1D1D1] disabled:cursor-wait disabled:opacity-70"
            disabled={uploadingCover}
            onClick={onCoverClick}
            type="button"
          >
            {draft.thumbnail ? (
              <Image
                alt={draft.title || "매거진 대표 이미지"}
                className="object-cover"
                fill
                sizes="(min-width: 1920px) 572px, 429px"
                src={draft.thumbnail}
              />
            ) : (
              <span className="flex flex-col items-center gap-[var(--host-12)] text-center">
                {uploadingCover ? (
                  <Loader2 className="size-[var(--host-32)] animate-spin" />
                ) : (
                  <ImageIcon className="size-[var(--host-32)]" strokeWidth={1.7} />
                )}
                <span className="text-[length:var(--host-14)] font-semibold leading-[1.253]">
                  대표 이미지 업로드
                </span>
                <span className="text-[length:var(--host-12)] font-normal leading-[1.6]">
                  JPG, PNG, WebP, GIF
                </span>
              </span>
            )}
            {draft.thumbnail ? (
              <span className="absolute bottom-[var(--host-16)] rounded-[4px] bg-white/90 px-[var(--host-14)] py-[var(--host-7)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#5B3A29] shadow-sm">
                {uploadingCover ? "업로드 중" : "대표 이미지 변경"}
              </span>
            ) : null}
          </button>
        </aside>

        <section className="min-w-0 rounded-[8px] border border-[#D9D9D9] bg-white">
          <div className="grid gap-[var(--host-14)] border-b border-[#D9D9D9] p-[var(--host-24)]">
            <label className="grid gap-[var(--host-8)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#6D7A8A]">
              제목
              <input
                className="h-[var(--host-43)] rounded-[6px] border border-[#D9D9D9] bg-white px-[var(--host-12)] text-[length:var(--host-18)] font-semibold leading-[1.253] text-[#5B3A29] outline-none transition placeholder:text-[#CAC4BC] focus:border-[#FE701E]"
                maxLength={120}
                onChange={(event) => onUpdate({ title: event.target.value })}
                placeholder="매거진 제목을 입력해 주세요"
                value={draft.title}
              />
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_var(--host-150)] gap-[var(--host-12)]">
              <label className="grid gap-[var(--host-8)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#6D7A8A]">
                요약
                <input
                  className="h-[var(--host-43)] rounded-[6px] border border-[#D9D9D9] bg-white px-[var(--host-12)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#5B3A29] outline-none transition placeholder:text-[#CAC4BC] focus:border-[#FE701E]"
                  maxLength={180}
                  onChange={(event) => onUpdate({ summary: event.target.value })}
                  placeholder="카드와 상세 상단에 보일 짧은 소개"
                  value={draft.summary}
                />
              </label>
              <label className="grid gap-[var(--host-8)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#6D7A8A]">
                작성일
                <input
                  className="h-[var(--host-43)] rounded-[6px] border border-[#D9D9D9] bg-white px-[var(--host-12)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#5B3A29] outline-none transition focus:border-[#FE701E]"
                  onChange={(event) => onUpdate({ date: event.target.value })}
                  type="date"
                  value={draft.date}
                />
              </label>
            </div>
          </div>

          <div className="p-[var(--host-24)]">
            <label className="grid gap-[var(--host-8)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#6D7A8A]">
              본문
              <textarea
                className="min-h-[var(--host-480)] resize-none rounded-[6px] border border-[#D9D9D9] bg-white px-[var(--host-16)] py-[var(--host-16)] text-[length:var(--host-16)] font-normal leading-[1.7] text-[#0D0D0C] outline-none transition placeholder:text-[#CAC4BC] focus:border-[#FE701E]"
                maxLength={8000}
                onChange={(event) => onUpdate({ bodyText: event.target.value })}
                placeholder="본문을 입력해 주세요"
                value={draft.bodyText}
              />
            </label>
          </div>
        </section>
      </div>

      <footer className="mt-[var(--host-18)] flex h-[var(--host-69)] items-start justify-end gap-[var(--host-12)] border-t border-[#D9D9D9] pt-[var(--host-20)]">
        {saveMessage ? (
          <span className="mr-auto text-[length:var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]">
            {saveMessage}
          </span>
        ) : null}
        <button
          className="h-[var(--host-29)] rounded-[3px] border border-[#6D7A8A] bg-white px-[var(--host-20)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isBusy}
          onClick={onClose}
          type="button"
        >
          취소
        </button>
        <button
          className="inline-flex h-[var(--host-29)] items-center gap-[var(--host-6)] rounded-[3px] bg-[#FE701E] px-[var(--host-20)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-white transition hover:bg-[#E85F12] disabled:cursor-not-allowed disabled:bg-[#CAC4BC]"
          disabled={isBusy}
          onClick={onSave}
          type="button"
        >
          {saving ? (
            <Loader2 className="size-[var(--host-14)] animate-spin" />
          ) : (
            <Save className="size-[var(--host-14)]" strokeWidth={2} />
          )}
          저장
        </button>
      </footer>
    </div>
  );
}

function MagazineCard({
  item,
  onEdit,
}: {
  item: ChannelMagazine;
  onEdit: () => void;
}) {
  return (
    <article className="group relative h-[var(--host-550)] w-[var(--host-530)] min-w-0 overflow-hidden rounded-[8px] bg-[#FCFCFC]">
      <button
        className="absolute right-[var(--host-16)] top-[var(--host-16)] z-10 rounded-[4px] bg-white/90 px-[var(--host-10)] py-[var(--host-5)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#5B3A29] opacity-0 shadow-sm transition hover:text-[#FE701E] group-hover:opacity-100 focus-visible:opacity-100"
        onClick={onEdit}
        type="button"
      >
        수정
      </button>
      <div className="relative h-[var(--host-368)] w-full overflow-hidden rounded-t-[8px] bg-[#D9D9D9]">
        {item.thumbnail ? (
          <Image
            alt=""
            className="object-cover opacity-70"
            fill
            sizes="(min-width: 1920px) 707px, 530px"
            src={item.thumbnail}
          />
        ) : null}
      </div>
      <div className="mt-[var(--host-30)] rounded-b-[8px] bg-[#FCFCFC] text-center">
        <h2 className="text-[length:var(--host-20)] font-semibold leading-[1.253] text-[#5B3A29]">
          {item.title}
        </h2>
        <p className="mt-[var(--host-13)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#CAC4BC]">
          {formatMagazineDate(item.date)}
        </p>
      </div>
    </article>
  );
}
