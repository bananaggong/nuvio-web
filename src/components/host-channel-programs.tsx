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
import type { ProgramStatus } from "@/lib/types";
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

const filters = [
  { label: "전체", value: "all" },
  { label: "오픈", value: "open" },
  { label: "예정", value: "upcoming" },
  { label: "마감", value: "closed" },
] as const;

type ProgramFilter = (typeof filters)[number]["value"];
type SortOrder = "latest" | "oldest";

export function HostChannelPrograms() {
  const [channel, setChannel] = useState<Village>(fallbackChannel);
  const [programs, setPrograms] = useState<HostProgramDraft[]>(fallbackProgramCards);
  const [activeFilter, setActiveFilter] = useState<ProgramFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");

  useEffect(() => {
    let active = true;

    async function load() {
      const [channelResponse, programsResponse] = await Promise.allSettled([
        fetch("/api/host/channels", { cache: "no-store" }),
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
  const visiblePrograms = useMemo(() => {
    return programs
      .filter((program) => {
        if (activeFilter === "all") return true;
        if (activeFilter === "closed") {
          return program.status === "closed" || program.status === "earlyClosed";
        }

        return program.status === activeFilter;
      })
      .sort((a, b) => {
        const latest = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
        return sortOrder === "latest" ? latest : -latest;
      });
  }, [activeFilter, programs, sortOrder]);

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1114)]">
      <section className="min-w-0 flex-1 overflow-x-clip bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelProfileHeader activeLabel="프로그램" channel={channel} publicHref={publicHref} />

          <section className="px-[var(--host-44)] pt-[var(--host-8)]">
            <div className="flex h-[var(--host-48)] items-start justify-between pt-[var(--host-6)]">
              <div className="flex items-center gap-[var(--host-10)] pl-[var(--host-9)] text-[length:var(--host-12)] font-semibold leading-[1.253]">
                {filters.map((filter) => {
                  const active = activeFilter === filter.value;

                  return (
                    <button
                      className={`inline-flex h-[var(--host-30)] w-[var(--host-70)] items-center justify-center rounded-full transition ${
                        active
                          ? "bg-[#FF9A3D] text-white"
                          : "bg-[#CAC4BC] text-white hover:bg-[#BEB7AF]"
                      }`}
                      key={filter.value}
                      onClick={() => setActiveFilter(filter.value)}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex h-[var(--host-18)] items-center gap-[var(--host-6)] pt-[var(--host-6)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
                <span className="mr-[var(--host-2)] text-[#6D7A8A]">순서</span>
                <SortButton active={sortOrder === "latest"} label="최신순" onClick={() => setSortOrder("latest")} />
                <SortButton active={sortOrder === "oldest"} label="오래된순" onClick={() => setSortOrder("oldest")} />
              </div>
            </div>

            <p className="mt-[var(--host-30)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
              편집을 원하는 프로그램을 클릭 시, 해당 프로그램의 설정 페이지로 이동해요
            </p>

            <div className="mt-[var(--host-30)] grid grid-cols-[repeat(3,var(--host-344))] gap-x-[var(--host-36-7)] gap-y-[var(--host-40)] pl-[var(--host-20)]">
              {visiblePrograms.map((program, index) => (
                <ChannelProgramCard key={`${program.id}-${index}`} program={program} />
              ))}
            </div>
          </section>

          <footer className="mt-[var(--host-8)] flex h-[var(--host-69)] items-start border-t border-[#6D7A8A] px-[var(--host-28)] pt-[var(--host-20)]">
            <button
              className="inline-flex h-[var(--host-29)] w-[var(--host-58)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E]"
              type="button"
            >
              저장
            </button>
          </footer>
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function SortButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-[var(--host-18)] items-center gap-[var(--host-3)] transition ${
        active ? "text-[#6D7A8A]" : "text-[#CAC4BC]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`grid size-[var(--host-14)] place-items-center rounded-full border ${
          active ? "border-[#FE701E]" : "border-[#CAC4BC]"
        }`}
      >
        <span
          className={`size-[var(--host-8)] rounded-full ${
            active ? "bg-[#FE701E]" : "bg-transparent"
          }`}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}

function ChannelProgramCard({ program }: { program: HostProgramDraft }) {
  const href = `/host/programs/${encodeURIComponent(program.id)}`;
  const status = program.status === "earlyClosed" ? "closed" : program.status;
  const statusCopy = getProgramStatusCopy(status);
  const dayCopy = status === "open" ? "D+ 00(오픈날짜)" : "D- 00(오픈일 카운터)";
  const imageSrc = getDisplayableImage(program.image);

  return (
    <article className="h-[var(--host-591)] w-[var(--host-344)]" data-channel-program-card>
      <Link className="group block h-full" href={href}>
        <div className="relative h-[var(--host-430)] w-full overflow-hidden rounded-[16px] bg-[#D9D9D9]" data-channel-program-thumb>
          {imageSrc ? (
            <Image
              alt=""
              className="object-cover transition duration-200 group-hover:scale-[1.03]"
              fill
              sizes="(min-width: 1920px) 459px, 344px"
              src={imageSrc}
            />
          ) : null}
        </div>
        <div className="mt-[var(--host-12)] flex items-center gap-[var(--host-8)]">
          <span
            className={`inline-flex h-[var(--host-20)] items-center rounded-[5px] px-[var(--host-8)] text-[length:var(--host-11)] font-semibold leading-[1.253] text-white ${statusCopy.className}`}
          >
            {statusCopy.label}
          </span>
          <span className="truncate text-[length:var(--host-11)] font-semibold leading-[1.253] text-[#6D7A8A]">
            {dayCopy}
          </span>
          <Image
            alt=""
            className="ml-auto size-[var(--host-18)] shrink-0 opacity-70"
            height={18}
            src={status === "open" ? nuvioIcons.bookmark : nuvioIcons.bell}
            width={18}
          />
        </div>
        <h2 className="mt-[var(--host-14)] line-clamp-1 text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
          {program.title || "프로그램 제목 입력"}
        </h2>
        <p className="mt-[var(--host-12)] line-clamp-3 text-[length:var(--host-12)] font-normal leading-[1.62] text-[#CAC4BC]">
          {program.summary ||
            "프로그램 소개 간략한 후킹을 작성해 주세요. 얼마나 길게 넣을건지 생각을 해야하는데 두 줄 정도로 생각을 합니다."}
        </p>
        <p className="mt-[var(--host-24)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
          프로그램 기간
        </p>
      </Link>
    </article>
  );
}

function getDisplayableImage(src: string): string | undefined {
  const value = src.trim();
  if (!value) return undefined;
  if (/^https?:\/\//u.test(value)) return value;
  if (/^\/.+\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/iu.test(value)) return value;

  return undefined;
}

function getProgramStatusCopy(status: ProgramStatus): {
  className: string;
  label: string;
} {
  switch (status) {
    case "open":
      return { className: "bg-[#FF9A3D]", label: "오픈" };
    case "upcoming":
      return { className: "bg-[#C95A33]", label: "예정" };
    case "closed":
    case "earlyClosed":
      return { className: "bg-[#6D7A8A]", label: "마감" };
    default:
      return { className: "bg-[#6D7A8A]", label: "마감" };
  }
}
