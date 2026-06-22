"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChannelProfileHeader,
  fallbackChannel,
  fallbackPrograms,
} from "@/components/host-channel-home";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import { villagePath } from "@/lib/village-routing";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
};

type HostProgramsPayload = {
  data?: HostProgramDraft[];
};

const fallbackProgramCards = Array.from({ length: 7 }, (_, index) => ({
  ...fallbackPrograms[index % fallbackPrograms.length],
  id: `${fallbackPrograms[index % fallbackPrograms.length].id}-${index}`,
  title:
    index === 0
      ? fallbackPrograms[0].title
      : index % 2 === 0
        ? "채널 프로그램 제목"
        : "호스트 채널 프로그램",
}));

export function HostChannelPrograms() {
  const [channel, setChannel] = useState<Village>(fallbackChannel);
  const [programs, setPrograms] = useState<HostProgramDraft[]>(fallbackProgramCards);

  useEffect(() => {
    let active = true;

    async function load() {
      const [channelResponse, programsResponse] = await Promise.allSettled([
        fetch("/api/host/villages", { cache: "no-store" }),
        fetch("/api/host/programs", { cache: "no-store" }),
      ]);

      if (!active) return;

      if (channelResponse.status === "fulfilled" && channelResponse.value.ok) {
        const payload = (await channelResponse.value.json().catch(() => ({}))) as HostChannelPayload;
        const firstChannel = Array.isArray(payload.data) ? payload.data[0] : undefined;
        if (firstChannel) setChannel(firstChannel);
      }

      if (programsResponse.status === "fulfilled" && programsResponse.value.ok) {
        const payload = (await programsResponse.value.json().catch(() => ({}))) as HostProgramsPayload;
        if (Array.isArray(payload.data) && payload.data.length > 0) {
          setPrograms(payload.data);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const publicHref = useMemo(() => villagePath(channel.slug), [channel.slug]);

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1114)]">
      <section className="min-w-0 flex-1 overflow-x-hidden bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader channel={channel} publicHref={publicHref} />

          <section className="px-[var(--host-58)] pt-[var(--host-34)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[var(--host-8)] text-[length:var(--host-12)] font-medium leading-[1.253]">
                <button className="rounded-full bg-[#FE701E] px-[var(--host-14)] py-[var(--host-5)] text-white" type="button">
                  전체
                </button>
                <button className="rounded-full bg-[#CAC4BC] px-[var(--host-14)] py-[var(--host-5)] text-white" type="button">
                  모집중
                </button>
                <button className="rounded-full bg-[#CAC4BC] px-[var(--host-14)] py-[var(--host-5)] text-white" type="button">
                  예정
                </button>
                <button className="rounded-full bg-[#CAC4BC] px-[var(--host-14)] py-[var(--host-5)] text-white" type="button">
                  마감
                </button>
              </div>
              <div className="flex items-center gap-[var(--host-8)] text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A]">
                <span className="text-[#FE701E]">최신순</span>
                <span className="text-[#CAC4BC]">인기순</span>
                <span className="text-[#CAC4BC]">마감임박순</span>
              </div>
            </div>

            <div className="mt-[var(--host-24)] grid grid-cols-3 gap-x-[var(--host-30)] gap-y-[var(--host-40)] pb-[var(--host-76)]">
              {programs.map((program, index) => (
                <ChannelProgramCard key={`${program.id}-${index}`} program={program} />
              ))}
            </div>
          </section>
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function ChannelProgramCard({ program }: { program: HostProgramDraft }) {
  const href = `/programs/${encodeURIComponent(program.slug || program.id)}`;
  const statusLabel =
    program.status === "open" ? "모집중" : program.status === "upcoming" ? "예정" : "마감";

  return (
    <article className="min-w-0">
      <Link className="group block" href={href} target="_blank">
        <div className="relative h-[var(--host-264)] overflow-hidden rounded-[7px] bg-[#D9D9D9]">
          {program.image ? (
            <Image
              alt=""
              className="object-cover transition duration-200 group-hover:scale-[1.03]"
              fill
              sizes="(min-width: 1920px) 346px, 260px"
              src={program.image}
            />
          ) : null}
        </div>
        <div className="mt-[var(--host-10)] flex items-start justify-between gap-[var(--host-12)]">
          <div className="min-w-0">
            <p className="text-[length:var(--host-11)] font-medium leading-[1.253] text-[#FE701E]">
              {statusLabel}
            </p>
            <h2 className="mt-[var(--host-5)] line-clamp-2 text-[length:var(--host-15)] font-semibold leading-[1.35] text-[#5B3A29]">
              {program.title}
            </h2>
            <p className="mt-[var(--host-8)] line-clamp-2 text-[length:var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
              {program.summary}
            </p>
          </div>
          <Image
            alt=""
            className="mt-[var(--host-3)] size-[var(--host-16)] shrink-0"
            height={21}
            src={nuvioIcons.arrowCircleRight}
            width={21}
          />
        </div>
      </Link>
    </article>
  );
}
