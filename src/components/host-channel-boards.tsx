"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ChannelProfileHeader,
  fallbackChannel,
} from "@/components/host-channel-home";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
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

const fallbackBoardPosts: ChannelBoardPost[] = [
  {
    createdAt: "2000-01-01T00:00:00.000Z",
    id: "channel-board-pinned",
    pinned: true,
    title: "제목",
  },
  {
    createdAt: "2000-01-01T00:00:00.000Z",
    id: "channel-board-new",
    title: "제목",
    unread: true,
  },
  {
    createdAt: "2000-01-01T00:00:00.000Z",
    id: "channel-board-regular-1",
    title: "제목",
  },
  {
    createdAt: "2000-01-01T00:00:00.000Z",
    id: "channel-board-regular-2",
    title: "제목",
  },
];

function formatBoardDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "2000. 00. 00 00:00";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}. ${month}. ${day} ${hours}:${minutes}`;
}

export function HostChannelBoards() {
  const [channel, setChannel] = useState<Village>(fallbackChannel);
  const [posts, setPosts] = useState<ChannelBoardPost[]>(fallbackBoardPosts);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadChannel() {
      const response = await fetch("/api/host/villages", { cache: "no-store" }).catch(
        () => null,
      );
      if (!active || !response?.ok) return;

      const payload = (await response.json().catch(() => ({}))) as HostChannelPayload;
      const firstChannel = Array.isArray(payload.data) ? payload.data[0] : undefined;
      if (firstChannel) setChannel(firstChannel);
    }

    void loadChannel();

    return () => {
      active = false;
    };
  }, []);

  const publicHref = useMemo(() => villagePath(channel.slug), [channel.slug]);

  function addPost() {
    setPosts((current) => [
      {
        createdAt: new Date().toISOString(),
        id: `channel-board-draft-${Date.now()}`,
        title: "제목",
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

          <section className="relative border-b border-[#6D7A8A] px-[var(--host-40)] pb-[var(--host-34)] pt-[var(--host-76)]">
            <button
              aria-label="게시글 추가"
              className="absolute right-[var(--host-36)] top-[var(--host-40)] size-[var(--host-20)] transition hover:opacity-80"
              onClick={addPost}
              type="button"
            >
              <Image alt="" height={24} src={nuvioIcons.channelAddCircle} width={24} />
            </button>

            <div className="w-full pr-[var(--host-36)]">
              {posts.map((post) => (
                <BoardPostRow key={post.id} post={post} />
              ))}
            </div>
          </section>

          <footer className="flex h-[var(--host-72)] items-center gap-[var(--host-12)] border-b border-[#6D7A8A] px-[var(--host-24)]">
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
  return (
    <article className="grid h-[var(--host-40)] grid-cols-[var(--host-66)_minmax(0,1fr)_var(--host-176)] items-center border-b border-[#F3E2D5] text-[length:var(--host-12)] leading-[1.253]">
      <div className="flex items-center">
        {post.pinned ? <BoardBadge tone="pinned">고정</BoardBadge> : null}
        {post.unread ? <BoardBadge tone="new">새글</BoardBadge> : null}
      </div>
      <h2 className="truncate text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#5B3A29]">
        {post.title}
      </h2>
      <time
        className="justify-self-end text-[length:var(--host-12)] font-medium leading-[1.253] text-[#CAC4BC]"
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
      className={`inline-flex h-[var(--host-18)] min-w-[var(--host-37)] items-center justify-center rounded-[var(--host-4)] px-[var(--host-7)] text-[length:var(--host-11)] font-semibold leading-[1.253] text-white ${
        tone === "pinned" ? "bg-[#86A15C]" : "bg-[#FE701E]"
      }`}
    >
      {children}
    </span>
  );
}
