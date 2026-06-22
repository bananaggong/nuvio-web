"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import { villagePath } from "@/lib/village-routing";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
  error?: string;
};

type HostProgramsPayload = {
  data?: HostProgramDraft[];
  error?: string;
};

export const fallbackChannel: Village = {
  accentColor: "#FE701E",
  address: "전남 보성군",
  brandColor: "#5B3A29",
  city: "보성군",
  contactEmail: "hello@nuvio.kr",
  contactPhone: "010-0000-0000",
  description: "차를 매개로 지역의 시간과 사람을 연결하는 채널입니다.",
  heroImage: "",
  id: "demo-channel",
  kakaoUrl: "",
  links: [],
  name: "호스트 채널 명",
  programIds: [],
  published: true,
  region: "지역명",
  sections: [],
  slug: "host-channel",
  summary: "호스트 채널 소개내용",
  tagline: "호스트 채널 소개내용",
  updatedAt: new Date().toISOString(),
};

export const fallbackPrograms: HostProgramDraft[] = [
  {
    activityEnd: "2026-07-26",
    activityStart: "2026-07-22",
    applyUrl: "/programs/mokpo-sea-record-workation-2026/apply",
    capacity: "12명",
    city: "목포시",
    description: "목포 바다와 원도심을 기록하며 나만의 여행 프로젝트를 완성합니다.",
    detailImages: [],
    fee: "50,000원",
    guideInfo: {
      excludedItems: [],
      includedItems: [],
      preparationItems: [],
      refundRules: [],
    },
    hashtags: ["워케이션", "기록", "로컬"],
    id: "mokpo-sea-record-workation-2026",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    itineraryDays: [],
    periodKey: "week",
    phone: "010-0000-0000",
    placeInfo: {
      accommodationEnabled: false,
      accommodationMemo: "",
      accommodationName: "",
      meetingAddress: "전라남도 목포시 영산로 98",
      meetingAddressDetail: "목포역 1번 출구 앞",
      meetingMemo: "",
      parkingGuide: "",
      transportGuide: "",
    },
    published: true,
    recruitEnd: "2026-07-05",
    recruitStart: "2026-06-14",
    region: "전남",
    slug: "mokpo-sea-record-workation-2026",
    sourceName: "전체차LAB 운영팀",
    sourceUrl: "/boseong",
    status: "open",
    subsidyAmount: 0,
    subsidyLabel: "자유신청",
    summary: "목포 원도심에서 숙소, 코워킹, 로컬 리서치를 연결하는 5일 워케이션입니다.",
    target: "기록과 로컬 리서치에 관심 있는 청년",
    theme: "workation",
    title: "목포 바다와 기록 워케이션 5일",
    updatedAt: new Date().toISOString(),
  },
];

const galleryCards = [
  "채널 이미지 제목",
  "채널 이미지 제목",
  "채널 이미지 제목",
  "채널 이미지 제목",
];

const reviews = [
  {
    body: "호스트가 안내한 일정과 장소가 분명해서 처음 방문한 지역에서도 편하게 참여할 수 있었어요.",
    title: "지역을 천천히 만나는 방식이 좋았어요",
  },
  {
    body: "프로그램 중간마다 기록을 정리할 시간이 있어서 결과물을 만들기 쉬웠습니다.",
    title: "작은 기록이 프로젝트가 되는 경험",
  },
  {
    body: "숙소와 작업 공간, 로컬 만남이 자연스럽게 연결되어 다음 프로그램도 기대됩니다.",
    title: "다시 찾고 싶은 운영",
  },
];

export function HostChannelHome() {
  const [channel, setChannel] = useState<Village>(fallbackChannel);
  const [programs, setPrograms] = useState<HostProgramDraft[]>(fallbackPrograms);

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
  const visiblePrograms = programs.slice(0, 8);

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1864)]">
      <section className="min-w-0 flex-1 overflow-x-hidden bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <section className="grid h-[var(--host-386)] place-items-center border-b border-[#D9D9D9] bg-[#F9F9F9]">
            <div className="flex flex-col items-center text-center">
              <span className="grid size-[var(--host-40)] place-items-center rounded-full border border-[#D9D9D9] bg-white">
                <Image alt="" height={20} src={nuvioIcons.message} width={20} />
              </span>
              <p className="mt-[var(--host-12)] text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#6D7A8A]">
                채널 홈에 보여줄 대표 콘텐츠를 준비 중입니다.
              </p>
              <p className="mt-[var(--host-6)] text-[length:var(--host-12)] font-normal leading-[1.6] text-[#CAC4BC]">
                공개 프로그램, 후기, 갤러리가 연결되면 이곳에 자동으로 모입니다.
              </p>
            </div>
          </section>

          <ChannelProfileHeader activeLabel="채널 홈" channel={channel} publicHref={publicHref} />

          <section className="px-[var(--host-58)] pt-[var(--host-20)]">
            <div className="flex items-center gap-[var(--host-8)] text-[length:var(--host-12)] font-medium leading-[1.253]">
              <span className="rounded-full bg-[#FE701E] px-[var(--host-14)] py-[var(--host-5)] text-white">
                전체
              </span>
              <span className="rounded-full bg-[#CAC4BC] px-[var(--host-14)] py-[var(--host-5)] text-white">
                모집중
              </span>
              <span className="rounded-full bg-[#CAC4BC] px-[var(--host-14)] py-[var(--host-5)] text-white">
                예정
              </span>
              <span className="rounded-full bg-[#CAC4BC] px-[var(--host-14)] py-[var(--host-5)] text-white">
                마감
              </span>
            </div>

            <ChannelSectionHeader actionLabel="전체 보기" title="프로그램" />
            <div className="grid grid-cols-4 gap-[var(--host-18)]">
              {visiblePrograms.slice(0, 4).map((program) => (
                <ChannelProgramMiniCard key={program.id} program={program} />
              ))}
            </div>

            <ChannelSectionHeader actionLabel="후기 관리" title="후기" />
            <div className="grid grid-cols-3 gap-[var(--host-18)]">
              {reviews.map((review) => (
                <article
                  className="min-h-[var(--host-156)] rounded-[4px] border border-[#D9D9D9] bg-white px-[var(--host-16)] py-[var(--host-16)]"
                  key={review.title}
                >
                  <h3 className="text-[length:var(--host-14)] font-semibold leading-[1.35] text-[#5B3A29]">
                    {review.title}
                  </h3>
                  <p className="mt-[var(--host-10)] line-clamp-4 text-[length:var(--host-12)] font-normal leading-[1.7] text-[#6D7A8A]">
                    {review.body}
                  </p>
                </article>
              ))}
            </div>

            <ChannelSectionHeader actionLabel="갤러리 관리" title="갤러리" />
            <div className="grid grid-cols-4 gap-[var(--host-18)] pb-[var(--host-70)]">
              {galleryCards.map((title, index) => (
                <article key={`${title}-${index}`}>
                  <div className="h-[var(--host-194)] rounded-[6px] bg-[#D9D9D9]" />
                  <h3 className="mt-[var(--host-10)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#5B3A29]">
                    {title}
                  </h3>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

export function ChannelProfileHeader({
  activeLabel = "채널 홈",
  channel,
  publicHref,
}: {
  activeLabel?: string;
  channel: Village;
  publicHref: string;
}) {
  const menuLabels = ["채널 홈", "프로그램", "후기", "갤러리형", "매거진형", "게시판형", "자유형"];

  return (
    <section className="relative h-[var(--host-156)] border-b border-[#6D7A8A] bg-white">
      <div className="flex items-start gap-[var(--host-42)] px-[var(--host-58)] pt-[var(--host-14)]">
        <div className="relative size-[var(--host-128)] shrink-0 overflow-hidden rounded-full bg-[#D9D9D9]">
          {channel.heroImage ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(min-width: 1920px) 170px, 128px"
              src={channel.heroImage}
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-[var(--host-10)] pt-[var(--host-3)]">
            <h1 className="text-[length:var(--host-24)] font-medium leading-[1.253] text-[#0D0D0C]">
              {channel.name}
            </h1>
            <span className="pb-[var(--host-2)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
              {channel.region}
            </span>
          </div>
          <p className="mt-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
            {channel.tagline || channel.summary}
          </p>
          <Link
            className="mt-[var(--host-10)] inline-flex items-center gap-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
            href={publicHref}
            target="_blank"
          >
            <span className="text-[#FE701E]">ↄ</span>
            이름&nbsp;&nbsp; 연결링크
          </Link>
        </div>
      </div>
      <nav className="absolute left-[var(--host-228)] top-[var(--host-128)] flex items-end gap-[var(--host-40-7)] text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
        {menuLabels.map((label) => (
          <span
            className="relative shrink-0 pb-[var(--host-8)] text-[#5B3A29]"
            key={label}
          >
            {label}
            {activeLabel === label ? (
              <span className="absolute bottom-0 left-0 h-[var(--host-2)] w-full bg-[#FE701E]" />
            ) : null}
          </span>
        ))}
      </nav>
    </section>
  );
}

export function ChannelSectionHeader({
  actionLabel,
  title,
}: {
  actionLabel: string;
  title: string;
}) {
  return (
    <div className="mb-[var(--host-16)] mt-[var(--host-36)] flex items-center justify-between border-t border-[#D9D9D9] pt-[var(--host-16)]">
      <h2 className="text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
        {title}
      </h2>
      <button
        className="text-[length:var(--host-12)] font-medium leading-[1.253] text-[#FE701E]"
        type="button"
      >
        {actionLabel} &gt;
      </button>
    </div>
  );
}

function ChannelProgramMiniCard({ program }: { program: HostProgramDraft }) {
  const href = `/programs/${encodeURIComponent(program.slug || program.id)}`;

  return (
    <article>
      <Link className="group block" href={href} target="_blank">
        <div className="relative h-[var(--host-210)] overflow-hidden rounded-[6px] bg-[#D9D9D9]">
          {program.image ? (
            <Image
              alt=""
              className="object-cover transition duration-200 group-hover:scale-[1.03]"
              fill
              sizes="(min-width: 1920px) 264px, 198px"
              src={program.image}
            />
          ) : null}
        </div>
        <p className="mt-[var(--host-8)] text-[length:var(--host-11)] font-medium leading-[1.253] text-[#FE701E]">
          {program.status === "open" ? "모집중" : program.status === "upcoming" ? "예정" : "마감"}
        </p>
        <h3 className="mt-[var(--host-4)] line-clamp-2 text-[length:var(--host-14)] font-semibold leading-[1.35] text-[#5B3A29]">
          {program.title}
        </h3>
        <p className="mt-[var(--host-6)] line-clamp-2 text-[length:var(--host-12)] font-normal leading-[1.45] text-[#6D7A8A]">
          {program.summary}
        </p>
      </Link>
    </article>
  );
}
