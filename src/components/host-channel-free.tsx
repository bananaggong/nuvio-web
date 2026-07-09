"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChannelContentSkeleton,
  ChannelEmptyState,
  ChannelProfileHeader,
} from "@/components/host-channel-home";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { selectHostChannel } from "@/lib/host-channel-selection";
import { channelPath } from "@/lib/channel-routing";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
};

type FreeBlock = {
  id: string;
  label: string;
};

export function HostChannelFree() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const [channel, setChannel] = useState<Village | null>(null);
  const [blocks, setBlocks] = useState<FreeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);

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
        setIsLoading(false);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as HostChannelPayload;
      setChannel(selectHostChannel(payload.data, requestedChannelSlug));
      setIsLoading(false);
    }

    void loadChannel();

    return () => {
      active = false;
    };
  }, [requestedChannelSlug]);

  const publicHref = channel?.slug ? channelPath(channel.slug) : "";

  function addBlock() {
    setBlocks((current) => [
      ...current,
      { id: `free-block-${Date.now()}`, label: `자유 블록 ${current.length + 1}` },
    ]);
    setSaved(false);
  }

  function saveDraft() {
    window.localStorage.setItem("nuvio-channel-free-draft", JSON.stringify(blocks));
    setSaved(true);
  }

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[clamp(383px,26.597vw,510.667px)]">
      <section className="min-w-0 flex-1 overflow-x-hidden bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader
            activeLabel="자유형"
            channel={channel}
            loading={isLoading}
            publicHref={publicHref}
          />

          <section className="border-b border-[#6D7A8A] pb-[var(--host-8)] pt-[var(--host-8)]">
            {isLoading ? (
              <div className="px-[var(--host-18)] py-[var(--host-24)]">
                <ChannelContentSkeleton variant="grid" />
              </div>
            ) : blocks.length > 0 ? (
              <div className="grid grid-cols-3 gap-[var(--host-8)] border-b border-[#F3E2D5] px-[var(--host-18)] py-[var(--host-12)]">
                {blocks.map((block) => (
                  <div
                    className="h-[var(--host-34)] rounded-[4px] border border-[#F3E2D5] bg-[#FFF6EC] px-[var(--host-10)] py-[var(--host-8)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#5B3A29]"
                    key={block.id}
                  >
                    {block.label}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-[var(--host-18)] py-[var(--host-24)]">
                <ChannelEmptyState
                  description="블록을 추가하면 자유형 메뉴 페이지에 표시됩니다."
                  title="아직 구성한 자유형 블록이 없습니다."
                />
              </div>
            )}

            <div className="flex h-[var(--host-56)] items-center px-[var(--host-18)]">
              <FreeCanvasTools onAdd={addBlock} />
            </div>
          </section>

          <footer className="flex h-[var(--host-69)] items-center gap-[var(--host-12)] border-b border-[#6D7A8A] px-[var(--host-28)]">
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

function FreeCanvasTools({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex items-center gap-[var(--host-13)]">
      <button
        aria-label="자유 블록 추가"
        className="grid size-[var(--host-20)] place-items-center transition hover:opacity-70"
        onClick={onAdd}
        type="button"
      >
        <Image alt="" height={19} src={nuvioIcons.channelFreeAdd} width={19} />
      </button>
      <button
        aria-label="자유 영역 선택"
        className="grid size-[var(--host-22)] place-items-center transition hover:opacity-70"
        type="button"
      >
        <Image alt="" height={22} src={nuvioIcons.channelFreeBlock} width={22} />
      </button>
    </div>
  );
}
