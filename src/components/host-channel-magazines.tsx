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

type ChannelMagazine = VillageMediaContent;

function normalizeMagazineItem(item: VillageMediaContent): ChannelMagazine {
  return item;
}

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
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

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

  function addMagazine() {
    const now = new Date().toISOString();
    setItems((current) => [
      {
        body: ["새 매거진 본문을 입력하세요."],
        category: "original",
        date: now,
        featured: false,
        id: `channel-magazine-draft-${Date.now()}`,
        provider: "link",
        published: true,
        sourceName: channel?.name || "호스트 채널",
        sourceUrl: "/host/channels/magazines",
        summary: "새 매거진 설명을 입력하세요.",
        thumbnail: "",
        title: "새 매거진 글",
        updatedAt: now,
        villageSlug: channel?.slug || "",
      },
      ...current,
    ]);
    setSaveMessage("");
  }

  async function saveDraft() {
    if (!channel?.slug) {
      setSaveMessage("채널을 먼저 선택해 주세요.");
      return;
    }

    if (items.length === 0) {
      setSaveMessage("저장할 매거진 게시물이 없습니다.");
      return;
    }

    setSaving(true);
    setSaveMessage("저장 중입니다...");

    try {
      const savedItems: ChannelMagazine[] = [];

      for (const item of items) {
        const response = await fetch("/api/host/media", {
          body: JSON.stringify({ ...item, villageSlug: channel.slug }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json().catch(() => ({}))) as SaveHostMediaPayload;

        if (!response.ok || !payload.data) {
          throw new Error(payload.error || "매거진 게시물을 저장하지 못했습니다.");
        }

        savedItems.push(normalizeMagazineItem(payload.data));
      }

      setItems(savedItems);
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
              disabled={saving}
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
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function MagazineCard({ item }: { item: ChannelMagazine }) {
  return (
    <article className="h-[var(--host-550)] w-[var(--host-530)] min-w-0 overflow-hidden rounded-[8px] bg-[#FCFCFC]">
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
