"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Code2,
  Columns3,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Rows3,
  Save,
  Strikethrough,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import {
  ChannelContentSkeleton,
  ChannelEmptyState,
  ChannelProfileHeader,
} from "@/components/host-channel-home";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { ResizableMagazineImage } from "@/components/magazine-resizable-image";
import { channelPath } from "@/lib/channel-routing";
import { selectHostChannel } from "@/lib/host-channel-selection";
import type { VillageMediaContent } from "@/lib/types";
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
  bodyHtml: string;
  date: string;
  id?: string;
  summary: string;
  thumbnail: string;
  title: string;
};

const magazineSourceUrl = "/host/channels/magazines";
const tableSizeInputClassName =
  "h-[var(--host-28)] w-[var(--host-52)] rounded-[3px] border border-[#D9D9D9] bg-white px-[var(--host-6)] text-center text-[length:var(--host-11)] font-semibold text-[#5B3A29] outline-none transition focus:border-[#FE701E]";
const TABLE_SIZE_MIN = 1;
const TABLE_SIZE_MAX = 20;

function createEmptyMagazineDraft(): MagazineEditorDraft {
  return {
    bodyHtml: "<p></p>",
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
    bodyHtml: createEditorHtmlFromBody(item.body),
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

function createEditorHtmlFromBody(body: string[]) {
  if (body.length === 0) return "<p></p>";
  if (looksLikeHtml(body[0])) return body[0];
  return body
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/iu.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}

function collectImageUrlsFromHtml(html: string) {
  const urls = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/giu))
    .map((match) => match[1]?.trim())
    .filter(Boolean) as string[];
  return Array.from(new Set(urls));
}

function hasEditorContent(html: string, plainText: string) {
  return plainText.trim().length > 0 || /<img\s/i.test(html);
}

export function HostChannelMagazines() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const [channel, setChannel] = useState<Village | null>(null);
  const [items, setItems] = useState<ChannelMagazine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorDraft, setEditorDraft] = useState<MagazineEditorDraft | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      const response = await fetch("/api/host/channels", { cache: "no-store" }).catch(
        () => null,
      );
      if (!active) return;
      if (!response?.ok) {
        setChannel(null);
        setItems([]);
        setIsLoading(false);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as HostChannelPayload;
      const selectedChannel = selectHostChannel(payload.data, requestedChannelSlug);
      setChannel(selectedChannel);

      if (!selectedChannel?.slug) {
        setItems([]);
        setIsLoading(false);
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
      setIsLoading(false);
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
    if (saving || uploadingImage) return;
    setEditorDraft(null);
    setSaveMessage("");
  }

  async function uploadMagazineImage(file: File | undefined): Promise<string> {
    if (!file) return "";
    if (!channel?.slug) {
      throw new Error("채널을 먼저 선택해 주세요.");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("이미지 파일만 업로드할 수 있습니다.");
    }

    setUploadingImage(true);
    setSaveMessage("이미지를 업로드하고 있습니다...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("usage", "channel-magazine-body");
      formData.append("villageSlug", channel.slug);

      const response = await fetch("/api/host/media-assets", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as UploadAssetPayload;

      if (!response.ok || !payload.data?.url || payload.data.kind !== "image") {
        throw new Error(payload.error || "이미지를 업로드하지 못했습니다.");
      }

      setSaveMessage("");
      return payload.data.url;
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveMagazineDraft(contentHtml: string, plainText: string) {
    if (!channel?.slug) {
      setSaveMessage("채널을 먼저 선택해 주세요.");
      return;
    }

    if (!editorDraft) {
      setSaveMessage("작성 중인 매거진 글이 없습니다.");
      return;
    }

    const title = editorDraft.title.trim();
    const bodyHtml = contentHtml.trim();
    const imageUrls = collectImageUrlsFromHtml(bodyHtml);
    const thumbnail = editorDraft.thumbnail || imageUrls[0] || "";
    const summary =
      editorDraft.summary.trim() ||
      plainText.replace(/\s+/gu, " ").slice(0, 140).trim() ||
      title;

    if (!title) {
      setSaveMessage("제목을 입력해 주세요.");
      return;
    }

    if (!hasEditorContent(bodyHtml, plainText)) {
      setSaveMessage("본문을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setSaveMessage("저장 중입니다...");

    try {
      const now = new Date().toISOString();
      const response = await fetch("/api/host/media", {
        body: JSON.stringify({
          body: [bodyHtml],
          category: "original",
          date: editorDraft.date || now.slice(0, 10),
          featured: Boolean(thumbnail),
          id: editorDraft.id,
          imageUrls,
          provider: "link",
          published: true,
          sourceName: channel.name || "호스트 채널",
          sourceUrl: magazineSourceUrl,
          summary,
          thumbnail,
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
          <ChannelProfileHeader
            activeLabel="매거진형"
            channel={channel}
            loading={isLoading}
            publicHref={publicHref}
          />

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

            {isLoading ? (
              <div className="mx-auto w-[var(--host-1103)] max-w-full">
                <ChannelContentSkeleton variant="magazine" />
              </div>
            ) : editorDraft ? (
              <MagazineEditorSurface
                draft={editorDraft}
                key={editorDraft.id ?? "new"}
                onClose={closeEditor}
                onSave={(html, text) => void saveMagazineDraft(html, text)}
                onUpdate={updateEditorDraft}
                saveMessage={saveMessage}
                saving={saving}
                uploadImage={uploadMagazineImage}
                uploadingImage={uploadingImage}
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
                  title="아직 작성한 매거진 게시물이 없습니다."
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
  draft,
  onClose,
  onSave,
  onUpdate,
  saveMessage,
  saving,
  uploadImage,
  uploadingImage,
}: {
  draft: MagazineEditorDraft;
  onClose: () => void;
  onSave: (html: string, text: string) => void;
  onUpdate: (patch: Partial<MagazineEditorDraft>) => void;
  saveMessage: string;
  saving: boolean;
  uploadImage: (file: File | undefined) => Promise<string>;
  uploadingImage: boolean;
}) {
  const bodyImageInputRef = useRef<HTMLInputElement | null>(null);
  const isBusy = saving || uploadingImage;
  const editor = useEditor({
    content: draft.bodyHtml || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[var(--host-760)] px-[var(--host-24)] py-[var(--host-24)] text-[length:var(--host-16)] leading-[1.75] text-[#0D0D0C] outline-none",
      },
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      LinkExtension.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
      }),
      ResizableMagazineImage.configure({
        allowBase64: false,
        inline: false,
      }),
      Placeholder.configure({
        placeholder: "내용을 입력해주세요",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      const imageUrls = collectImageUrlsFromHtml(html);
      onUpdate({
        bodyHtml: html,
        thumbnail: draft.thumbnail || imageUrls[0] || "",
      });
    },
  });

  async function handleBodyImageUpload(file: File | undefined) {
    if (!file || !editor) return;

    try {
      const url = await uploadImage(file);
      if (!url) return;
      editor.chain().focus().setImage({ alt: file.name, src: url }).run();
      onUpdate({ thumbnail: draft.thumbnail || url });
    } catch (error) {
      onUpdate({});
      window.alert(
        error instanceof Error ? error.message : "이미지를 업로드하지 못했습니다.",
      );
    } finally {
      if (bodyImageInputRef.current) bodyImageInputRef.current.value = "";
    }
  }

  function handleSave() {
    if (!editor) return;
    onSave(editor.getHTML(), editor.getText().trim());
  }

  return (
    <div className="mx-auto w-[var(--host-1103)] max-w-full">
      <div className="mb-[var(--host-22)] flex items-center justify-between">
        <h2 className="text-[length:var(--host-24)] font-semibold leading-[1.253] text-[#5B3A29]">
          {draft.id ? "매거진 글 수정" : "새 매거진 글 작성"}
        </h2>
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

      {saveMessage ? (
        <p className="mb-[var(--host-14)] rounded-[4px] border border-[#F3E2D5] bg-[#FFF6EC] px-[var(--host-14)] py-[var(--host-10)] text-[length:var(--host-12)] font-semibold leading-[1.45] text-[#6D7A8A]">
          {saveMessage}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[8px] border border-[#D9D9D9] bg-white">
        <div className="border-b border-[#D9D9D9] p-[var(--host-24)]">
          <label className="grid gap-[var(--host-8)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#6D7A8A]">
            제목
            <input
              className="h-[var(--host-48)] rounded-[6px] border border-[#D9D9D9] bg-white px-[var(--host-14)] text-[length:var(--host-22)] font-semibold leading-[1.253] text-[#5B3A29] outline-none transition placeholder:text-[#CAC4BC] focus:border-[#FE701E]"
              maxLength={120}
              onChange={(event) => onUpdate({ title: event.target.value })}
              placeholder="제목을 입력해 주세요"
              value={draft.title}
            />
          </label>
        </div>

        <MagazineEditorToolbar
          editor={editor}
          onImageClick={() => bodyImageInputRef.current?.click()}
          uploading={uploadingImage}
        />
        <input
          accept="image/gif,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => void handleBodyImageUpload(event.target.files?.[0])}
          ref={bodyImageInputRef}
          type="file"
        />
        <div className="magazine-editor-content min-h-[var(--host-780)] bg-white">
          <EditorContent editor={editor} />
        </div>
      </section>

      <footer className="mt-[var(--host-18)] flex h-[var(--host-69)] items-start justify-end gap-[var(--host-12)] border-t border-[#D9D9D9] pt-[var(--host-20)]">
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
          disabled={isBusy || !editor}
          onClick={handleSave}
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

function MagazineEditorToolbar({
  editor,
  onImageClick,
  uploading,
}: {
  editor: Editor | null;
  onImageClick: () => void;
  uploading: boolean;
}) {
  const [tableColumns, setTableColumns] = useState(3);
  const [tableRows, setTableRows] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);

  if (!editor) {
    return <div className="h-[var(--host-50)] border-b border-[#D9D9D9] bg-[#FCFCFC]" />;
  }

  const isTableActive = editor.isActive("table");

  function insertTable() {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertTable({
        cols: tableColumns,
        rows: tableRows,
        withHeaderRow: tableHasHeader,
      })
      .run();
  }

  function updateTableColumns(value: string) {
    setTableColumns(readTableSize(value, tableColumns));
  }

  function updateTableRows(value: string) {
    setTableRows(readTableSize(value, tableRows));
  }

  function setLink() {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const nextUrl = window.prompt("링크 URL", previousUrl ?? "");
    if (nextUrl === null) return;
    if (!nextUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: nextUrl.trim() })
      .run();
  }

  return (
    <div className="flex flex-wrap items-center gap-[var(--host-4)] border-b border-[#D9D9D9] bg-[#FCFCFC] px-[var(--host-14)] py-[var(--host-10)] text-[#6D7A8A]">
      <ToolbarButton
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="큰 제목"
      >
        <Heading1 className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="중간 제목"
      >
        <Heading2 className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="작은 제목"
      >
        <Heading3 className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="굵게"
      >
        <Bold className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="기울임"
      >
        <Italic className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="밑줄"
      >
        <UnderlineIcon className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="취소선"
      >
        <Strikethrough className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="왼쪽 정렬"
      >
        <AlignLeft className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="가운데 정렬"
      >
        <AlignCenter className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="오른쪽 정렬"
      >
        <AlignRight className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="글머리 목록"
      >
        <List className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="번호 목록"
      >
        <ListOrdered className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="인용"
      >
        <Quote className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={onImageClick} title="본문 이미지">
        {uploading ? (
          <Loader2 className="size-[var(--host-16)] animate-spin" />
        ) : (
          <ImageIcon className="size-[var(--host-16)]" />
        )}
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("link")} onClick={setLink} title="링크">
        <LinkIcon className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarDivider />
      <div className="flex items-center gap-[var(--host-4)] rounded-[4px] border border-[#D9D9D9] bg-white px-[var(--host-4)] py-[var(--host-3)]">
        <label className="flex items-center gap-[var(--host-4)] text-[length:var(--host-11)] font-semibold text-[#6D7A8A]" title="표 열 수">
          <Columns3 className="size-[var(--host-14)]" />
          <input
            aria-label="표 열 수"
            className={tableSizeInputClassName}
            max={TABLE_SIZE_MAX}
            min={TABLE_SIZE_MIN}
            onChange={(event) => updateTableColumns(event.currentTarget.value)}
            type="number"
            value={tableColumns}
          />
        </label>
        <label className="flex items-center gap-[var(--host-4)] text-[length:var(--host-11)] font-semibold text-[#6D7A8A]" title="표 행 수">
          <Rows3 className="size-[var(--host-14)]" />
          <input
            aria-label="표 행 수"
            className={tableSizeInputClassName}
            max={TABLE_SIZE_MAX}
            min={TABLE_SIZE_MIN}
            onChange={(event) => updateTableRows(event.currentTarget.value)}
            type="number"
            value={tableRows}
          />
        </label>
        <button
          aria-pressed={tableHasHeader}
          className={`inline-flex h-[var(--host-28)] items-center gap-[var(--host-4)] rounded-[3px] px-[var(--host-8)] text-[length:var(--host-11)] font-semibold transition ${
            tableHasHeader ? "bg-[#FE701E] text-white" : "text-[#6D7A8A] hover:bg-[#FFF6EC]"
          }`}
          onClick={() => setTableHasHeader((current) => !current)}
          title="헤더 행"
          type="button"
        >
          {tableHasHeader ? <Check className="size-[var(--host-13)]" /> : null}
          헤더
        </button>
        <ToolbarButton onClick={insertTable} title="표 삽입">
          <Table2 className="size-[var(--host-16)]" />
        </ToolbarButton>
      </div>
      {isTableActive ? (
        <>
          <ToolbarDivider />
          <div className="flex items-center gap-[var(--host-4)] rounded-[4px] border border-[#D9D9D9] bg-white px-[var(--host-4)] py-[var(--host-3)]">
            <ToolbarTextButton onClick={() => editor.chain().focus().addColumnBefore().run()} title="왼쪽에 열 추가">
              열+
            </ToolbarTextButton>
            <ToolbarTextButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="오른쪽에 열 추가">
              +열
            </ToolbarTextButton>
            <ToolbarTextButton onClick={() => editor.chain().focus().deleteColumn().run()} title="현재 열 삭제">
              열-
            </ToolbarTextButton>
            <ToolbarTextButton onClick={() => editor.chain().focus().addRowBefore().run()} title="위에 행 추가">
              행+
            </ToolbarTextButton>
            <ToolbarTextButton onClick={() => editor.chain().focus().addRowAfter().run()} title="아래에 행 추가">
              +행
            </ToolbarTextButton>
            <ToolbarTextButton onClick={() => editor.chain().focus().deleteRow().run()} title="현재 행 삭제">
              행-
            </ToolbarTextButton>
            <ToolbarTextButton destructive onClick={() => editor.chain().focus().deleteTable().run()} title="표 삭제">
              <Trash2 className="size-[var(--host-13)]" />
            </ToolbarTextButton>
          </div>
        </>
      ) : null}
      <ToolbarButton
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="코드 블록"
      >
        <Code2 className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="되돌리기">
        <Undo2 className="size-[var(--host-16)]" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="다시 실행">
        <Redo2 className="size-[var(--host-16)]" />
      </ToolbarButton>
    </div>
  );
}

function readTableSize(value: string, fallback: number): number {
  if (!value) return fallback;

  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return fallback;

  return Math.max(TABLE_SIZE_MIN, Math.min(TABLE_SIZE_MAX, Math.round(nextValue)));
}

function ToolbarButton({
  active = false,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={`inline-flex size-[var(--host-32)] items-center justify-center rounded-[3px] transition ${
        active ? "bg-[#FE701E] text-white" : "text-[#6D7A8A] hover:bg-[#FFF6EC] hover:text-[#FE701E]"
      }`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function ToolbarTextButton({
  children,
  destructive = false,
  onClick,
  title,
}: {
  children: ReactNode;
  destructive?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={`inline-flex h-[var(--host-28)] min-w-[var(--host-30)] items-center justify-center rounded-[3px] px-[var(--host-8)] text-[length:var(--host-11)] font-semibold transition ${
        destructive ? "text-rose-600 hover:bg-rose-50" : "text-[#6D7A8A] hover:bg-[#FFF6EC] hover:text-[#FE701E]"
      }`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-[var(--host-4)] h-[var(--host-22)] w-px bg-[#D9D9D9]" />;
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
