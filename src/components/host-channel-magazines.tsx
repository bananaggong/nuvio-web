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

type ChannelMagazine = {
  createdAt: string;
  id: string;
  image?: string;
  title: string;
};

function formatMagazineDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "작성일 미정";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

export function HostChannelMagazines() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const [channel, setChannel] = useState<Village | null>(null);
  const [items, setItems] = useState<ChannelMagazine[]>([]);
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

  function addMagazine() {
    const now = new Date().toISOString();
    setItems((current) => [
      {
        createdAt: now,
        id: `channel-magazine-draft-${Date.now()}`,
        title: "새 매거진 글",
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
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-2053)]">
      <section className="min-w-0 flex-1 overflow-x-clip bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader activeLabel="매거진형" channel={channel} publicHref={publicHref} />

          <section className="relative min-h-[var(--host-1806)] border-b border-[#6D7A8A] pb-[var(--host-8)] pt-[var(--host-62)]">
            <button
              aria-label="매거진 게시물 추가"
              className="absolute right-[var(--host-36)] top-[var(--host-34)] size-[var(--host-20)] transition hover:opacity-80"
              onClick={addMagazine}
              type="button"
            >
              <Image alt="" height={24} src={nuvioIcons.channelAddCircle} width={24} />
            </button>

            {items.length > 0 ? (
              <div className="mx-auto grid w-[var(--host-1103)] max-w-full grid-cols-[repeat(2,var(--host-530))] gap-x-[var(--host-43)] gap-y-[var(--host-43)]">
                {items.map((item) => (
                  <MagazineCard item={item} key={item.id} />
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

function MagazineCard({ item }: { item: ChannelMagazine }) {
  return (
    <article className="h-[var(--host-550)] w-[var(--host-530)] min-w-0 overflow-hidden rounded-[8px] bg-[#FCFCFC]">
      <div className="relative h-[var(--host-368)] w-full overflow-hidden rounded-t-[8px] bg-[#D9D9D9]">
        {item.image ? (
          <Image
            alt=""
            className="object-cover opacity-70"
            fill
            sizes="(min-width: 1920px) 707px, 530px"
            src={item.image}
          />
        ) : null}
      </div>
      <div className="mt-[var(--host-30)] rounded-b-[8px] bg-[#FCFCFC] text-center">
        <h2 className="text-[length:var(--host-20)] font-semibold leading-[1.253] text-[#5B3A29]">
          {item.title}
        </h2>
        <p className="mt-[var(--host-13)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#CAC4BC]">
          {formatMagazineDate(item.createdAt)}
        </p>
      </div>
    </article>
  );
}
