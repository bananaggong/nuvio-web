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

type ChannelMagazine = {
  createdAt: string;
  id: string;
  image?: string;
  title: string;
};

const fallbackMagazines: ChannelMagazine[] = [
  {
    createdAt: "2026-06-12T00:00:00.000Z",
    id: "channel-magazine-1",
    title: "메인 타이틀 제목",
  },
  {
    createdAt: "2026-06-10T00:00:00.000Z",
    id: "channel-magazine-2",
    title: "메인 타이틀 제목",
  },
  {
    createdAt: "2026-06-08T00:00:00.000Z",
    id: "channel-magazine-3",
    title: "메인 타이틀 제목",
  },
  {
    createdAt: "2026-06-04T00:00:00.000Z",
    id: "channel-magazine-4",
    title: "메인 타이틀 제목",
  },
  {
    createdAt: "2026-05-29T00:00:00.000Z",
    id: "channel-magazine-5",
    title: "메인 타이틀 제목",
  },
];

function formatMagazineDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0000. 00. 00";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

export function HostChannelMagazines() {
  const [channel, setChannel] = useState<Village>(fallbackChannel);
  const [items, setItems] = useState<ChannelMagazine[]>(fallbackMagazines);
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

  function addMagazine() {
    const now = new Date().toISOString();
    setItems((current) => [
      {
        createdAt: now,
        id: `channel-magazine-draft-${Date.now()}`,
        title: "메인 타이틀 제목",
      },
      ...current,
    ]);
    setSaved(false);
  }

  function saveDraft() {
    window.localStorage.setItem("nuvio-channel-magazine-draft", JSON.stringify(items));
    setSaved(true);
  }

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1158)]">
      <section className="min-w-0 flex-1 overflow-x-hidden bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader activeLabel="매거진형" channel={channel} publicHref={publicHref} />

          <section className="relative border-b border-[#6D7A8A] px-[var(--host-58)] pb-[var(--host-42)] pt-[var(--host-46)]">
            <button
              aria-label="매거진 게시물 추가"
              className="absolute right-[var(--host-36)] top-[var(--host-34)] size-[var(--host-20)] transition hover:opacity-80"
              onClick={addMagazine}
              type="button"
            >
              <Image alt="" height={24} src={nuvioIcons.channelAddCircle} width={24} />
            </button>

            <div className="grid grid-cols-2 gap-x-[var(--host-36)] gap-y-[var(--host-45)] pr-[var(--host-16)]">
              {items.map((item) => (
                <MagazineCard item={item} key={item.id} />
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

function MagazineCard({ item }: { item: ChannelMagazine }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-[8px] bg-[#FCFCFC]">
      <div className="relative h-[var(--host-270)] w-full overflow-hidden rounded-t-[8px] bg-[#D9D9D9]">
        {item.image ? (
          <Image
            alt=""
            className="object-cover opacity-70"
            fill
            sizes="(min-width: 1920px) 564px, 423px"
            src={item.image}
          />
        ) : null}
      </div>
      <div className="flex h-[var(--host-95)] flex-col items-center justify-center rounded-b-[8px] bg-[#FCFCFC] text-center">
        <h2 className="text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
          {item.title}
        </h2>
        <p className="mt-[var(--host-12)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#CAC4BC]">
          {formatMagazineDate(item.createdAt)}
        </p>
      </div>
    </article>
  );
}
