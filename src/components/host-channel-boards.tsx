"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  ChannelContentSkeleton,
  ChannelEmptyState,
  ChannelProfileHeader,
} from "@/components/host-channel-home";
import {
  MagazineEditorSurface,
  createEditorHtmlFromBody,
  hasEditorContent,
  type MagazineEditorDraft,
} from "@/components/host-channel-magazines";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import type { ChannelBoardPost } from "@/lib/channel-board-posts";
import { channelPath } from "@/lib/channel-routing";
import { selectHostChannel } from "@/lib/host-channel-selection";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
};

type ChannelBoardPostsPayload = {
  data?: ChannelBoardPost[];
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

type BoardEditorDraft = MagazineEditorDraft & {
  pinned: boolean;
};

const BOARD_NEW_DAYS = 10;

function createEmptyBoardDraft(): BoardEditorDraft {
  return {
    bodyHtml: "<p></p>",
    date: new Date().toISOString().slice(0, 10),
    pinned: false,
    summary: "",
    thumbnail: "",
    title: "",
  };
}

function createBoardDraftFromPost(post: ChannelBoardPost): BoardEditorDraft {
  return {
    bodyHtml: createEditorHtmlFromBody(post.body ? [post.body] : []),
    date: post.createdAt.slice(0, 10),
    id: post.id,
    pinned: Boolean(post.pinned),
    summary: "",
    thumbnail: "",
    title: post.title,
  };
}

function formatBoardDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "작성일 미정";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}. ${month}. ${day} ${hours}:${minutes}`;
}

function isNewBoardPost(value: string) {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return false;

  const now = Date.now();
  const age = now - createdAt.getTime();
  return age >= 0 && age <= BOARD_NEW_DAYS * 24 * 60 * 60 * 1000;
}

function sortBoardPosts(posts: ChannelBoardPost[]) {
  return [...posts].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

export function HostChannelBoards() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const [channel, setChannel] = useState<Village | null>(null);
  const [posts, setPosts] = useState<ChannelBoardPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorDraft, setEditorDraft] = useState<BoardEditorDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadChannel() {
      setIsLoading(true);
      const response = await fetch("/api/host/channels", { cache: "no-store" }).catch(
        () => null,
      );
      if (!active) return;
      if (!response?.ok) {
        setChannel(null);
        setPosts([]);
        setIsLoading(false);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as HostChannelPayload;
      const selectedChannel = selectHostChannel(payload.data, requestedChannelSlug);
      setChannel(selectedChannel);
      if (!selectedChannel?.slug) {
        setPosts([]);
        setIsLoading(false);
      }
    }

    void loadChannel();

    return () => {
      active = false;
    };
  }, [requestedChannelSlug]);

  useEffect(() => {
    const channelSlug = channel?.slug;
    if (!channelSlug) return;
    const encodedChannelSlug = encodeURIComponent(channelSlug);

    let active = true;

    async function loadPosts() {
      setIsLoading(true);
      const response = await fetch(
        `/api/host/channel-board-posts?villageSlug=${encodedChannelSlug}`,
        { cache: "no-store" },
      ).catch(() => null);
      if (!active) return;
      if (!response?.ok) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as ChannelBoardPostsPayload;
      setPosts(Array.isArray(payload.data) ? sortBoardPosts(payload.data) : []);
      setIsLoading(false);
    }

    void loadPosts();

    return () => {
      active = false;
    };
  }, [channel?.slug]);

  const publicHref = channel?.slug ? channelPath(channel.slug) : "";

  function openNewPostEditor() {
    if (isLoading || !channel?.slug) return;
    setEditorDraft(createEmptyBoardDraft());
    setSavedMessage("");
  }

  function editPost(post: ChannelBoardPost) {
    setEditorDraft(createBoardDraftFromPost(post));
    setSavedMessage("");
  }

  function updateEditorDraft(patch: Partial<BoardEditorDraft>) {
    setEditorDraft((current) => (current ? { ...current, ...patch } : current));
    setSavedMessage("");
  }

  function closeEditor() {
    if (isSaving || uploadingImage) return;
    setEditorDraft(null);
    setSavedMessage("");
  }

  async function uploadBoardImage(file: File | undefined): Promise<string> {
    if (!file) return "";
    if (!channel?.slug) throw new Error("채널을 먼저 선택해 주세요.");
    if (!file.type.startsWith("image/")) {
      throw new Error("이미지 파일만 업로드할 수 있습니다.");
    }

    setUploadingImage(true);
    setSavedMessage("이미지를 업로드하고 있습니다...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("usage", "channel-board-body");
      formData.append("villageSlug", channel.slug);

      const response = await fetch("/api/host/media-assets", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as UploadAssetPayload;

      if (!response.ok || !payload.data?.url || payload.data.kind !== "image") {
        throw new Error(payload.error || "이미지를 업로드하지 못했습니다.");
      }

      setSavedMessage("");
      return payload.data.url;
    } finally {
      setUploadingImage(false);
    }
  }

  async function savePosts(nextPosts: ChannelBoardPost[]) {
    if (!channel?.slug || isSaving) return false;

    setIsSaving(true);
    setSavedMessage("저장 중입니다...");

    const response = await fetch("/api/host/channel-board-posts", {
      body: JSON.stringify({
        posts: sortBoardPosts(nextPosts),
        villageSlug: channel.slug,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }).catch(() => null);

    setIsSaving(false);

    if (!response?.ok) {
      const payload = response
        ? ((await response.json().catch(() => ({}))) as ChannelBoardPostsPayload)
        : {};
      setSavedMessage(payload.error || "저장에 실패했습니다.");
      return false;
    }

    const payload = (await response.json().catch(() => ({}))) as ChannelBoardPostsPayload;
    setPosts(Array.isArray(payload.data) ? sortBoardPosts(payload.data) : sortBoardPosts(nextPosts));
    setSavedMessage("저장되어 공개 게시판에 반영되었습니다.");
    return true;
  }

  async function saveEditorDraft(contentHtml: string, plainText: string) {
    if (!editorDraft) {
      setSavedMessage("작성 중인 게시글이 없습니다.");
      return;
    }

    const title = editorDraft.title.trim();
    const bodyHtml = contentHtml.trim();

    if (!title) {
      setSavedMessage("제목을 입력해 주세요.");
      return;
    }

    if (!hasEditorContent(bodyHtml, plainText)) {
      setSavedMessage("본문을 입력해 주세요.");
      return;
    }

    const existingPost = posts.find((post) => post.id === editorDraft.id);
    const createdAt =
      existingPost?.createdAt ??
      new Date(`${editorDraft.date || new Date().toISOString().slice(0, 10)}T00:00:00+09:00`).toISOString();
    const nextPost: ChannelBoardPost = {
      body: bodyHtml,
      createdAt,
      id: editorDraft.id ?? `channel-board-post-${Date.now()}`,
      pinned: editorDraft.pinned,
      title,
    };
    const nextPosts = sortBoardPosts([
      nextPost,
      ...posts.filter((post) => post.id !== nextPost.id),
    ]);

    const saved = await savePosts(nextPosts);
    if (saved) setEditorDraft(null);
  }

  async function deletePost(postId: string) {
    const nextPosts = posts.filter((post) => post.id !== postId);
    await savePosts(nextPosts);
  }

  const showEditor = Boolean(editorDraft);
  const canCreatePost = !isLoading && Boolean(channel?.slug);

  return (
    <HostWorkspaceLayout sidebarHeight={showEditor ? "min-h-[var(--host-2053)]" : "min-h-[var(--host-1158)]"}>
      <section className="min-w-0 flex-1 overflow-x-hidden bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader
            activeLabel="게시판형"
            channel={channel}
            loading={isLoading}
            publicHref={publicHref}
          />

          <section className="relative min-h-[var(--host-1158)] border-b border-[#6D7A8A] pb-[var(--host-30)] pt-[var(--host-62)]">
            {!showEditor && canCreatePost ? (
              <button
                aria-label="새 게시글 작성"
                className="absolute right-[var(--host-36)] top-[var(--host-40)] size-[var(--host-20)] transition hover:opacity-80"
                onClick={openNewPostEditor}
                type="button"
              >
                <Image alt="" height={24} src={nuvioIcons.channelAddCircle} width={24} />
              </button>
            ) : null}

            {isLoading ? (
              <div className="ml-[var(--host-30)] w-[var(--host-1170)] max-w-[calc(100%-var(--host-60))]">
                <ChannelContentSkeleton variant="board" />
              </div>
            ) : editorDraft ? (
              <MagazineEditorSurface
                bodyPlaceholder="게시글 내용을 입력해 주세요"
                closeAriaLabel="게시글 작성 닫기"
                draft={editorDraft}
                extraControls={
                  <label className="inline-flex cursor-pointer items-center gap-[var(--host-8)] text-[length:var(--host-13)] font-semibold leading-[1.253] text-[#5B3A29]">
                    <input
                      checked={editorDraft.pinned}
                      className="size-[var(--host-16)] accent-[#FE701E]"
                      onChange={(event) => updateEditorDraft({ pinned: event.target.checked })}
                      type="checkbox"
                    />
                    상단 고정
                  </label>
                }
                headingLabel={editorDraft.id ? "게시글 수정" : "새 게시글 작성"}
                key={editorDraft.id ?? "new-board-post"}
                onClose={closeEditor}
                onSave={(html, text) => void saveEditorDraft(html, text)}
                onUpdate={updateEditorDraft}
                saveMessage={savedMessage}
                saving={isSaving}
                titleLabel="게시글 제목"
                titlePlaceholder="게시글 제목을 입력해 주세요"
                uploadImage={uploadBoardImage}
                uploadingImage={uploadingImage}
              />
            ) : posts.length > 0 ? (
              <div className="ml-[var(--host-30)] w-[var(--host-1170)] max-w-[calc(100%-var(--host-60))]">
                {sortBoardPosts(posts).map((post) => (
                  <BoardPostRow
                    key={post.id}
                    onDelete={() => void deletePost(post.id)}
                    onEdit={() => editPost(post)}
                    post={post}
                  />
                ))}
              </div>
            ) : (
              <div className="ml-[var(--host-30)] w-[var(--host-1170)] max-w-[calc(100%-var(--host-60))]">
                <ChannelEmptyState
                  description="게시글을 작성하면 게시판형 메뉴에 표시됩니다."
                  title="아직 등록된 게시글이 없습니다."
                />
              </div>
            )}
          </section>

          {!showEditor && savedMessage ? (
            <footer className="flex h-[var(--host-69)] items-center gap-[var(--host-12)] border-b border-[#6D7A8A] px-[var(--host-24)]">
              <span className="text-[length:var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]">
                {savedMessage}
              </span>
            </footer>
          ) : null}
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function BoardPostRow({
  onDelete,
  onEdit,
  post,
}: {
  onDelete: () => void;
  onEdit: () => void;
  post: ChannelBoardPost;
}) {
  const isNew = isNewBoardPost(post.createdAt);
  const hasBadge = Boolean(post.pinned || isNew);

  return (
    <article className="relative flex min-h-[var(--host-43)] w-full items-center border-b border-[#F3E2D5] py-[var(--host-9)] text-[length:var(--host-12)] leading-[1.253]">
      <div className="flex min-w-[clamp(104px,7.222vw,138.667px)] items-center gap-[var(--host-4)]">
        {post.pinned ? <BoardBadge tone="pinned">고정</BoardBadge> : null}
        {isNew ? <BoardBadge tone="new">새글</BoardBadge> : null}
      </div>
      <button
        className={`min-w-0 flex-1 truncate text-left text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#5B3A29] transition hover:text-[#FE701E] ${
          hasBadge ? "" : "pl-[var(--host-44)]"
        }`}
        onClick={onEdit}
        type="button"
      >
        {post.title}
      </button>
      <time
        className="ml-[var(--host-16)] w-[var(--host-156)] shrink-0 text-right text-[length:var(--host-12)] font-medium leading-[1.253] text-[#CAC4BC]"
        dateTime={post.createdAt}
      >
        {formatBoardDate(post.createdAt)}
      </time>
      <button
        aria-label="게시글 수정"
        className="ml-[var(--host-22)] grid size-[var(--host-24)] place-items-center text-[#6D7A8A] transition hover:text-[#FE701E]"
        onClick={onEdit}
        type="button"
      >
        <Pencil className="size-[var(--host-15)]" strokeWidth={1.8} />
      </button>
      <button
        aria-label="게시글 삭제"
        className="ml-[var(--host-4)] grid size-[var(--host-24)] place-items-center text-[#6D7A8A] transition hover:text-[#FE701E]"
        onClick={onDelete}
        type="button"
      >
        <Trash2 className="size-[var(--host-15)]" strokeWidth={1.8} />
      </button>
    </article>
  );
}

function BoardBadge({
  children,
  tone,
}: {
  children: string;
  tone: "new" | "pinned";
}) {
  return (
    <span
      className={`inline-flex h-[var(--host-17)] min-w-[var(--host-39)] items-center justify-center rounded-[var(--host-4)] px-[var(--host-7)] text-[length:var(--host-11)] font-semibold leading-[1.253] text-white ${
        tone === "pinned" ? "bg-[#86A15C]" : "bg-[#FE701E]"
      }`}
    >
      {children}
    </span>
  );
}
