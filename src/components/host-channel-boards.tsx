"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChannelEmptyState,
  ChannelProfileHeader,
} from "@/components/host-channel-home";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { selectHostChannel } from "@/lib/host-channel-selection";
import { villagePath } from "@/lib/village-routing";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
};

type ChannelBoardPost = {
  createdAt: string;
  id: string;
  pinned?: boolean;
  title: string;
  unread?: boolean;
};

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

export function HostChannelBoards() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const [channel, setChannel] = useState<Village | null>(null);
  const [posts, setPosts] = useState<ChannelBoardPost[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadChannel() {
      const response = await fetch("/api/host/channels", { cache: "no-store" }).catch(
        () => null,
      );
      if (!active || !response?.ok) return;

      const payload = (await response.json().catch(() => ({}))) as HostChannelPayload;
      setChannel(selectHostChannel(payload.data, requestedChannelSlug));
    }

    void loadChannel();

    return () => {
      active = false;
    };
  }, [requestedChannelSlug]);

  const publicHref = channel?.slug ? villagePath(channel.slug) : "";

  function addPost() {
    setPosts((current) => [
      {
        createdAt: new Date().toISOString(),
        id: `channel-board-draft-${Date.now()}`,
        title: "새 게시글",
        unread: true,
      },
      ...current,
    ]);
    setSaved(false);
  }

  function saveDraft() {
    window.localStorage.setItem("nuvio-channel-board-draft", JSON.stringify(posts));
    setSaved(true);
  }

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1158)]">
      <section className="min-w-0 flex-1 overflow-x-hidden bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader activeLabel="게시판형" channel={channel} publicHref={publicHref} />

          <section className="relative border-b border-[#6D7A8A] pb-[var(--host-30)] pt-[var(--host-62)]">
            <button
              aria-label="게시글 추가"
              className="absolute right-[var(--host-36)] top-[var(--host-40)] size-[var(--host-20)] transition hover:opacity-80"
              onClick={addPost}
              type="button"
            >
              <Image alt="" height={24} src={nuvioIcons.channelAddCircle} width={24} />
            </button>

            <div className="ml-[var(--host-30)] w-[var(--host-1170)] max-w-[calc(100%-var(--host-60))]">
              {posts.length > 0 ? (
                posts.map((post) => <BoardPostRow key={post.id} post={post} />)
              ) : (
                <ChannelEmptyState
                  description="게시글을 추가하면 이 목록에 표시됩니다."
                  title="아직 등록된 게시글이 없습니다."
                />
              )}
            </div>
          </section>

          <footer className="flex h-[var(--host-69)] items-center gap-[var(--host-12)] border-b border-[#6D7A8A] px-[var(--host-24)]">
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

function BoardPostRow({ post }: { post: ChannelBoardPost }) {
  const hasBadge = Boolean(post.pinned || post.unread);

  return (
    <article className="relative h-[var(--host-43)] w-full border-b border-[#F3E2D5] text-[length:var(--host-12)] leading-[1.253]">
      <div className="absolute left-0 top-[var(--host-13)] flex h-[var(--host-17)] w-[var(--host-39)] items-center">
        {post.pinned ? <BoardBadge tone="pinned">고정</BoardBadge> : null}
        {post.unread ? <BoardBadge tone="new">새글</BoardBadge> : null}
      </div>
      <h2
        className={`absolute top-[var(--host-14)] w-[var(--host-433)] truncate text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#5B3A29] ${
          hasBadge ? "left-[var(--host-91)]" : "left-[var(--host-44)]"
        }`}
      >
        {post.title}
      </h2>
      <time
        className="absolute right-[var(--host-27)] top-[var(--host-12)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#CAC4BC]"
        dateTime={post.createdAt}
      >
        {formatBoardDate(post.createdAt)}
      </time>
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
      className={`inline-flex h-[var(--host-17)] w-[var(--host-39)] items-center justify-center rounded-[var(--host-4)] text-[length:var(--host-11)] font-semibold leading-[1.253] text-white ${
        tone === "pinned" ? "bg-[#86A15C]" : "bg-[#FE701E]"
      }`}
    >
      {children}
    </span>
  );
}
