"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Archive,
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
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { ResizableMagazineImage } from "@/components/magazine-resizable-image";
import type { MagazinePost } from "@/lib/magazine-db";
import { MAGAZINE_CATEGORIES } from "@/lib/magazine-types";

type EditorResponse = {
  data?: MagazinePost;
  error?: string;
};

type AssetResponse = {
  data?: {
    url: string;
  };
  error?: string;
};

type AdminMagazineEditorProps = {
  postId?: string;
};

const inputClassName =
  "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100";

const tableSizeInputClassName =
  "h-7 w-12 rounded-[3px] border border-white/25 bg-white/10 px-2 text-center text-xs font-black text-white outline-none transition focus:border-white focus:bg-white/20";

const TABLE_SIZE_MIN = 1;
const TABLE_SIZE_MAX = 20;

export function AdminMagazineEditor({ postId }: AdminMagazineEditorProps) {
  const router = useRouter();
  const bodyImageInputRef = useRef<HTMLInputElement | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("local");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageAlt, setCoverImageAlt] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [loading, setLoading] = useState(Boolean(postId));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [post, setPost] = useState<MagazinePost | null>(null);

  const editor = useEditor({
    content: "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[420px] px-5 py-5 text-base leading-8 text-slate-800 outline-none",
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
  });

  useEffect(() => {
    if (!postId) return;

    let active = true;

    async function loadPost() {
      try {
        const response = await fetch(`/api/admin/magazine-posts/${postId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as EditorResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || "글을 불러오지 못했어요.");
        }

        if (!active) return;
        const nextPost = payload.data;
        setError("");
        setPost(nextPost);
        setTitle(nextPost.title);
        setSubtitle(nextPost.subtitle);
        setSlug(nextPost.slug);
        setCategory(nextPost.category || "local");
        setExcerpt(nextPost.excerpt);
        setCoverImageUrl(nextPost.coverImageUrl);
        setCoverImageAlt(nextPost.coverImageAlt);
        setStatus(nextPost.status === "published" ? "published" : "draft");
        editor?.commands.setContent(nextPost.contentHtml || "<p></p>");
      } catch (nextError) {
        if (active) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "글을 불러오지 못했어요.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPost();

    return () => {
      active = false;
    };
  }, [editor, postId]);

  const publicHref = useMemo(() => {
    if (!post || post.status !== "published") return "";
    return `/magazine/${post.slug}`;
  }, [post]);

  async function savePost(nextStatus = status) {
    if (!editor) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        postId ? `/api/admin/magazine-posts/${postId}` : "/api/admin/magazine-posts",
        {
          body: JSON.stringify({
            category,
            contentHtml: editor.getHTML(),
            contentJson: editor.getJSON(),
            coverImageAlt,
            coverImageUrl,
            excerpt,
            slug,
            status: nextStatus,
            subtitle,
            title,
          }),
          headers: { "Content-Type": "application/json" },
          method: postId ? "PATCH" : "POST",
        },
      );
      const payload = (await response.json()) as EditorResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "저장에 실패했어요.");
      }

      setPost(payload.data);
      setSlug(payload.data.slug);
      setStatus(payload.data.status === "published" ? "published" : "draft");
      setMessage(
        payload.data.status === "published"
          ? "공개 글로 저장했어요."
          : "초안으로 저장했어요.",
      );

      if (!postId) {
        router.replace(`/admin/magazine/${payload.data.id}/edit`);
      } else {
        router.refresh();
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "저장에 실패했어요.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function archivePost() {
    if (!postId || !post) return;
    if (!window.confirm("이 글을 보관할까요? 공개 목록에서 사라집니다.")) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/magazine-posts/${postId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as EditorResponse;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "보관 처리에 실패했어요.");
      }
      setPost(payload.data);
      setStatus("draft");
      setMessage("글을 보관 처리했어요.");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "보관 처리에 실패했어요.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/magazine-assets", {
      body: formData,
      method: "POST",
    });
    const payload = (await response.json()) as AssetResponse;

    if (!response.ok || !payload.data?.url) {
      throw new Error(payload.error || "이미지 업로드에 실패했어요.");
    }

    return payload.data.url;
  }

  async function handleCoverUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file);
      setCoverImageUrl(url);
      setCoverImageAlt((current) => current || file.name);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "이미지 업로드에 실패했어요.",
      );
    } finally {
      setUploading(false);
      if (coverImageInputRef.current) coverImageInputRef.current.value = "";
    }
  }

  async function handleBodyImageUpload(file: File | undefined) {
    if (!file || !editor) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file);
      editor.chain().focus().setImage({ alt: file.name, src: url }).run();
      setCoverImageUrl((current) => current || url);
      setCoverImageAlt((current) => current || file.name);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "이미지 업로드에 실패했어요.",
      );
    } finally {
      setUploading(false);
      if (bodyImageInputRef.current) bodyImageInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-md border border-slate-200 bg-white">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black text-[var(--primary)]">MAGAZINE</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">
              {postId ? "소식지 수정" : "새 소식지 작성"}
            </h1>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
              대표 이미지와 본문 이미지를 조합해 매거진형 콘텐츠를 작성합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {publicHref ? (
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                href={publicHref}
                target="_blank"
              >
                공개 글 보기
              </Link>
            ) : null}
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              href="/admin/magazine"
            >
              목록
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-md border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-md border border-slate-200 bg-white">
          <div className="grid gap-4 border-b border-slate-200 p-5">
            <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                카테고리
                <select
                  className={inputClassName}
                  onChange={(event) => setCategory(event.target.value)}
                  value={category}
                >
                  {MAGAZINE_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                제목
                <input
                  className={inputClassName}
                  maxLength={120}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="제목"
                  value={title}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-black text-slate-700">
              부제목
              <input
                className={inputClassName}
                maxLength={160}
                onChange={(event) => setSubtitle(event.target.value)}
                placeholder="카드와 상세 상단에 보일 짧은 설명"
                value={subtitle}
              />
            </label>
          </div>

          <EditorToolbar
            editor={editor}
            onImageClick={() => bodyImageInputRef.current?.click()}
            uploading={uploading}
          />
          <div aria-hidden="true" className="h-[44px]" />
          <input
            accept="image/gif,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void handleBodyImageUpload(event.target.files?.[0])}
            ref={bodyImageInputRef}
            type="file"
          />
          <div className="magazine-editor-content min-h-[460px] bg-white">
            <EditorContent editor={editor} />
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-base font-black text-slate-950">발행</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                상태
                <select
                  className={inputClassName}
                  onChange={(event) =>
                    setStatus(event.target.value === "published" ? "published" : "draft")
                  }
                  value={status}
                >
                  <option value="draft">초안</option>
                  <option value="published">공개</option>
                </select>
              </label>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={saving || !editor}
                onClick={() => void savePost(status)}
                type="button"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                저장
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--primary)] px-4 text-sm font-black text-[var(--primary)] hover:bg-orange-50 disabled:opacity-50"
                disabled={saving || !editor}
                onClick={() => void savePost("published")}
                type="button"
              >
                공개 저장
              </button>
              {postId && post?.status !== "archived" ? (
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-rose-200 px-4 text-sm font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  disabled={saving}
                  onClick={() => void archivePost()}
                  type="button"
                >
                  <Archive size={16} />
                  보관 처리
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-base font-black text-slate-950">대표 이미지</h2>
            <div className="mt-4 overflow-hidden rounded-md bg-slate-100">
              {coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={coverImageAlt || "대표 이미지"}
                  className="aspect-[4/3] w-full object-cover"
                  src={coverImageUrl}
                />
              ) : (
                <div className="grid aspect-[4/3] place-items-center text-sm font-bold text-slate-400">
                  대표 이미지 없음
                </div>
              )}
            </div>
            <input
              accept="image/gif,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => void handleCoverUpload(event.target.files?.[0])}
              ref={coverImageInputRef}
              type="file"
            />
            <button
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
              disabled={uploading}
              onClick={() => coverImageInputRef.current?.click()}
              type="button"
            >
              {uploading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <ImageIcon size={16} />
              )}
              이미지 업로드
            </button>
            <label className="mt-4 grid gap-2 text-sm font-black text-slate-700">
              대체 텍스트
              <input
                className={inputClassName}
                maxLength={120}
                onChange={(event) => setCoverImageAlt(event.target.value)}
                placeholder="이미지를 설명해 주세요"
                value={coverImageAlt}
              />
            </label>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-base font-black text-slate-950">검색/카드 정보</h2>
            <label className="mt-4 grid gap-2 text-sm font-black text-slate-700">
              슬러그
              <input
                className={inputClassName}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="자동 생성"
                value={slug}
              />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-black text-slate-700">
              요약
              <textarea
                className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-900 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                maxLength={240}
                onChange={(event) => setExcerpt(event.target.value)}
                placeholder="비워두면 본문에서 자동 생성됩니다."
                value={excerpt}
              />
            </label>
          </section>
        </aside>
      </div>
    </div>
  );
}

function EditorToolbar({
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
    return <div className="h-12 border-b border-slate-200 bg-slate-50" />;
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
    <div className="fixed left-0 right-0 top-[56px] z-[90] flex flex-wrap items-center gap-1 border-b border-slate-200 bg-[#4a4a4a] px-3 py-2 text-white shadow-sm md:left-64 xl:right-[340px]">
      <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게">
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임">
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="밑줄">
        <UnderlineIcon size={16} />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="취소선">
        <Strikethrough size={16} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="큰 제목">
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="중간 제목">
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Q 질문 헤더">
        <Heading3 size={16} />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="인용">
        <Quote size={16} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="왼쪽 정렬">
        <AlignLeft size={16} />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="가운데 정렬">
        <AlignCenter size={16} />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="오른쪽 정렬">
        <AlignRight size={16} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="글머리 목록">
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="번호 목록">
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={onImageClick} title="본문 이미지">
        {uploading ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("link")} onClick={setLink} title="링크">
        <LinkIcon size={16} />
      </ToolbarButton>
      <div className="flex items-center gap-1 rounded-[4px] border border-white/15 bg-white/5 px-1 py-0.5">
        <label className="flex items-center gap-1 text-[11px] font-black text-white/85" title="표 열 수">
          <Columns3 size={14} />
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
        <label className="flex items-center gap-1 text-[11px] font-black text-white/85" title="표 행 수">
          <Rows3 size={14} />
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
          className={`inline-flex h-7 items-center gap-1 rounded-[3px] px-2 text-[11px] font-black transition ${
            tableHasHeader ? "bg-white text-[#4a4a4a]" : "text-white hover:bg-white/15"
          }`}
          onClick={() => setTableHasHeader((current) => !current)}
          title="헤더 행"
          type="button"
        >
          {tableHasHeader ? <Check size={13} /> : null}
          헤더
        </button>
      </div>
      <ToolbarButton onClick={insertTable} title="표 삽입">
        <Table2 size={16} />
      </ToolbarButton>
      {isTableActive ? (
        <>
          <ToolbarDivider />
          <div className="flex items-center gap-1 rounded-[4px] border border-white/15 bg-white/5 px-1 py-0.5">
            <ToolbarTextButton onClick={() => editor.chain().focus().addColumnBefore().run()} title="왼쪽에 열 추가">
              열 앞+
            </ToolbarTextButton>
            <ToolbarTextButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="오른쪽에 열 추가">
              열 뒤+
            </ToolbarTextButton>
            <ToolbarTextButton onClick={() => editor.chain().focus().deleteColumn().run()} title="현재 열 삭제">
              열-
            </ToolbarTextButton>
            <ToolbarTextButton onClick={() => editor.chain().focus().addRowBefore().run()} title="위에 행 추가">
              행 위+
            </ToolbarTextButton>
            <ToolbarTextButton onClick={() => editor.chain().focus().addRowAfter().run()} title="아래에 행 추가">
              행 아래+
            </ToolbarTextButton>
            <ToolbarTextButton onClick={() => editor.chain().focus().deleteRow().run()} title="현재 행 삭제">
              행-
            </ToolbarTextButton>
            <ToolbarTextButton destructive onClick={() => editor.chain().focus().deleteTable().run()} title="표 삭제">
              <Trash2 size={13} />
            </ToolbarTextButton>
          </div>
        </>
      ) : null}
      <ToolbarButton active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="코드 블록">
        <Code2 size={16} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="되돌리기">
        <Undo2 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="다시 실행">
        <Redo2 size={16} />
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
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={`inline-flex size-8 items-center justify-center rounded-[3px] transition ${
        active ? "bg-white text-[#4a4a4a]" : "text-white hover:bg-white/15"
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
  children: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-[3px] px-2 text-[11px] font-black transition ${
        destructive ? "text-orange-100 hover:bg-red-500/25" : "text-white hover:bg-white/15"
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
  return <span className="mx-1 h-5 w-px bg-white/25" />;
}
