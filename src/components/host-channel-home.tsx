"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
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
  "목포 원도심 산책",
  "바다 앞 기록 워크숍",
  "로컬 리서치 노트",
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
  {
    body: "낯선 도시에서 나만의 속도로 머물며 기록을 남길 수 있었던 시간이었습니다.",
    title: "머무는 감각을 다시 배웠어요",
  },
];

const storyCards = [
  {
    body: "목포 바다를 따라 걷고, 오래된 골목에서 지역의 이야기를 수집하는 방법.",
    title: "기록으로 남기는 원도심",
  },
  {
    body: "숙소와 코워킹 공간을 연결해 하루의 리듬을 만드는 워케이션 운영 노트.",
    title: "머무는 사람을 위한 동선",
  },
  {
    body: "참여자가 남긴 사진과 문장을 채널 홈에서 다시 읽히게 하는 편집 방식.",
    title: "후기가 콘텐츠가 되는 순간",
  },
];

const noticeRows = [
  { category: "고정", title: "제목", date: "2000. 00. 00 00:00" },
  { category: "새글", title: "제목", date: "2000. 00. 00 00:00" },
  { category: "", title: "제목", date: "2000. 00. 00 00:00" },
  { category: "", title: "제목", date: "2000. 00. 00 00:00" },
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
            <div className="flex flex-col items-center text-center text-[#6D7A8A]">
              <Image
                alt=""
                className="size-[var(--host-20)]"
                height={21}
                src={nuvioIcons.channelUploadMuted}
                width={21}
              />
              <p className="mt-[var(--host-12)] text-[length:var(--host-14)] font-semibold leading-[1.253]">
                파일 업로드
              </p>
              <p className="mt-[var(--host-10)] text-[length:var(--host-12)] font-normal leading-[1.65] text-[#6D7A8A]">
                JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드할 수 있어요
              </p>
              <p className="mt-[var(--host-12)] text-[length:var(--host-12)] font-normal leading-[1.65] text-[#6D7A8A]">
                권장 이미지 사이즈
                <br />
                가로 : 1920px(해상도상이하)
                <br />
                세로 : 200px - 560px
              </p>
            </div>
          </section>

          <ChannelProfileHeader
            activeLabel="채널 홈"
            channel={channel}
            publicHref={publicHref}
            variant="home"
          />

          <section className="px-[var(--host-58)] pb-[var(--host-70)] pt-[var(--host-20)]">
            <ChannelSectionShell title="프로그램">
              <div className="mb-[var(--host-24)] flex items-center gap-[var(--host-8)] text-[length:var(--host-12)] font-medium leading-[1.253]">
                <span className="rounded-full bg-[#FF9A3D] px-[var(--host-16)] py-[var(--host-5)] text-white">
                  전체
                </span>
                <span className="rounded-full bg-[#CAC4BC] px-[var(--host-16)] py-[var(--host-5)] text-white">
                  오픈
                </span>
                <span className="rounded-full bg-[#CAC4BC] px-[var(--host-16)] py-[var(--host-5)] text-white">
                  예정
                </span>
                <span className="rounded-full bg-[#CAC4BC] px-[var(--host-16)] py-[var(--host-5)] text-white">
                  마감
                </span>
              </div>
              <div className="grid grid-cols-4 gap-[var(--host-36)]">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ChannelProgramMiniCard
                    key={visiblePrograms[index]?.id ?? `program-placeholder-${index}`}
                    program={visiblePrograms[index]}
                    variantIndex={index}
                  />
                ))}
              </div>
            </ChannelSectionShell>

            <ChannelSectionShell actionLabel="전체보기 +" title="후기">
              <div className="grid grid-cols-4 gap-[var(--host-36)]">
                {reviews.map((review) => (
                  <article className="min-w-0" key={review.title}>
                    <div className="h-[var(--host-110)] rounded-[4px] bg-[#D9D9D9]" />
                    <div className="mt-[var(--host-10)] flex items-center gap-[var(--host-6)]">
                      <span className="size-[var(--host-12)] rounded-full bg-[#D9D9D9]" />
                      <span className="text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#5B3A29]">
                        닉네임
                      </span>
                      <span className="text-[length:var(--host-11)] font-semibold leading-[1.253] text-[#FE701E]">
                        5.0
                      </span>
                    </div>
                    <h3 className="mt-[var(--host-8)] line-clamp-1 text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#5B3A29]">
                      {review.title}
                    </h3>
                    <p className="mt-[var(--host-4)] line-clamp-3 text-[length:var(--host-10)] font-normal leading-[1.55] text-[#0D0D0C]">
                      {review.body}
                    </p>
                  </article>
                ))}
              </div>
            </ChannelSectionShell>

            <ChannelSectionShell actionLabel="전체보기" badge="갤러리형" title="갤러리">
              <div className="grid grid-cols-3 gap-[var(--host-36)]">
                {galleryCards.map((title, index) => (
                  <article key={`${title}-${index}`}>
                    <div className="relative h-[var(--host-354)] overflow-hidden rounded-[4px] bg-[#D9D9D9]">
                      {index === 1 ? (
                        <span className="absolute left-1/2 top-1/2 size-0 -translate-x-1/2 -translate-y-1/2 border-y-[var(--host-12)] border-l-[var(--host-18)] border-y-transparent border-l-white" />
                      ) : null}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent px-[var(--host-18)] pb-[var(--host-18)] pt-[var(--host-56)]">
                        <p className="line-clamp-3 text-[length:var(--host-12)] font-medium leading-[1.6] text-white">
                          {title}를 따라 채널에서 보여줄 이미지와 영상 설명이 표시됩니다.
                        </p>
                      </div>
                      {index !== 1 ? (
                        <span className="absolute right-[var(--host-12)] top-[var(--host-12)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-white">
                          +3
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </ChannelSectionShell>

            <ChannelSectionShell actionLabel="숨김" badge="매거진형" title="이야기" toggleOn={false}>
              <div className="grid grid-cols-3 gap-[var(--host-36)]">
                {storyCards.map((card) => (
                  <article className="min-w-0 overflow-hidden rounded-[8px] bg-[#F9F9F9]" key={card.title}>
                    <div className="h-[var(--host-288)] rounded-t-[8px] bg-[#D9D9D9]" />
                    <div className="px-[var(--host-18)] py-[var(--host-16)]">
                      <h3 className="text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#5B3A29]">
                        메인 타이틀 제목
                      </h3>
                      <p className="mt-[var(--host-4)] text-[length:var(--host-11)] font-normal leading-[1.253] text-[#CAC4BC]">
                        0000. 00. 00
                      </p>
                      <p className="sr-only">{card.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </ChannelSectionShell>

            <ChannelSectionShell actionLabel="숨김" badge="게시판형" title="공지" toggleOn={false}>
              <div className="border-t border-[#F3E2D5]">
                {noticeRows.map((row, index) => (
                  <div
                    className="grid h-[var(--host-37)] grid-cols-[var(--host-82)_minmax(0,1fr)_var(--host-166)] items-center border-b border-[#F3E2D5] text-[length:var(--host-11)] leading-[1.253]"
                    key={`${row.category}-${index}`}
                  >
                    <div>
                      {row.category ? (
                        <span
                          className={`inline-flex h-[var(--host-16)] items-center rounded-[4px] px-[var(--host-8)] text-[length:var(--host-10)] font-semibold text-white ${
                            row.category === "고정" ? "bg-[#6BAA50]" : "bg-[#FE701E]"
                          }`}
                        >
                          {row.category}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-medium text-[#5B3A29]">{row.title}</p>
                    <p className="text-right font-normal text-[#CAC4BC]">{row.date}</p>
                  </div>
                ))}
              </div>
            </ChannelSectionShell>

            <ChannelSectionShell badge="블록형" title="자유형">
              <div className="relative border border-dashed border-[#D9D9D9] px-[var(--host-36)] py-[var(--host-18)] text-center text-[length:var(--host-12)] font-normal leading-[1.45] text-[#6D7A8A]">
                이미지나 텍스트를 추가해서 자유롭게 꾸밀 수 있어요
                <br />
                바뀌두어 섹션 사이 여백(40px)으로 사용 가능해요
              </div>
              <div className="mt-[var(--host-10)] rounded-[8px] border border-[#F3E2D5] bg-white p-[var(--host-18)]">
                <p className="text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#5B3A29]">
                  블록 편집
                </p>
                <div className="mt-[var(--host-18)] h-[var(--host-194)] rounded-[4px] border border-[#F3C3A5] bg-[#FFFDFB] p-[var(--host-18)] text-[length:var(--host-12)] font-medium leading-[1.65] text-[#0D0D0C]">
                  지정 폰트 : Pretendard
                  <br />
                  <br />
                  사이즈
                  <br />
                  - 제목 : 20
                  <br />
                  - 소제목 : 16
                  <br />
                  - 본문 : 14
                </div>
              </div>
              <div className="mt-[var(--host-28)] flex flex-col items-center gap-[var(--host-6)] text-[length:var(--host-11)] font-medium text-[#6D7A8A]">
                <span>블록 추가</span>
                <Image alt="" className="size-[var(--host-24)]" height={24} src={nuvioIcons.channelAddCircle} width={24} />
              </div>
            </ChannelSectionShell>
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
  variant = "section",
}: {
  activeLabel?: string;
  channel: Village;
  publicHref: string;
  variant?: "home" | "section";
}) {
  const menuLabels = ["채널 홈", "프로그램", "갤러리형", "매거진형", "게시판형", "자유형"];
  const sectionVariant = variant === "section";

  return (
    <section
      className={`relative border-b border-[#6D7A8A] bg-white ${
        sectionVariant ? "h-[var(--host-178)]" : "h-[var(--host-156)]"
      }`}
    >
      <div
        className={`flex items-start gap-[var(--host-42)] px-[var(--host-58)] ${
          sectionVariant ? "pt-[var(--host-36)]" : "pt-[var(--host-14)]"
        }`}
      >
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
            <Image alt="" height={16} src={nuvioIcons.channelLink} width={16} />
            이름&nbsp;&nbsp; 연결링크
          </Link>
        </div>
      </div>
      <nav
        className={`absolute left-[var(--host-228)] flex items-end gap-[var(--host-40-7)] text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29] ${
          sectionVariant ? "top-[var(--host-142)]" : "top-[var(--host-128)]"
        }`}
      >
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

export function ChannelSectionShell({
  actionLabel,
  badge,
  children,
  title,
  toggleOn = true,
}: {
  actionLabel?: string;
  badge?: string;
  children: ReactNode;
  title: string;
  toggleOn?: boolean;
}) {
  return (
    <section className="border-t border-[#D9D9D9] py-[var(--host-22)]">
      <div className="mb-[var(--host-18)] flex items-center justify-between">
        <div className="flex items-center gap-[var(--host-8)]">
          <span className="grid size-[var(--host-16)] place-items-center rounded-[4px] border border-[#D9D9D9] bg-white">
            <span className="size-[var(--host-5)] rounded-full bg-[#CAC4BC]" />
          </span>
          <h2 className="text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
            {title}
          </h2>
          {badge ? (
            <span className="inline-flex h-[var(--host-20)] items-center rounded-full bg-[#6D7A8A] px-[var(--host-10)] text-[length:var(--host-10)] font-semibold leading-[1.253] text-white">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-[var(--host-10)]">
          {actionLabel ? (
            <button
              className="text-[length:var(--host-11)] font-medium leading-[1.253] text-[#FE701E]"
              type="button"
            >
              {actionLabel}
            </button>
          ) : null}
          <Image
            alt=""
            className="h-[var(--host-16)] w-[var(--host-20)]"
            height={20}
            src={toggleOn ? nuvioIcons.formRequiredToggleOn : nuvioIcons.formRequiredToggleOff}
            width={23}
          />
        </div>
      </div>
      {children}
    </section>
  );
}

function ChannelProgramMiniCard({
  program,
  variantIndex,
}: {
  program?: HostProgramDraft;
  variantIndex: number;
}) {
  const href = program ? `/programs/${encodeURIComponent(program.slug || program.id)}` : "/host/channels/programs";
  const title = program?.title || "프로그램 제목 입력";
  const statusLabel =
    variantIndex === 0 ? "오픈" : variantIndex === 1 ? "오픈" : variantIndex === 2 ? "예정" : "마감";

  return (
    <article className="min-w-0">
      <Link className="group block" href={href} target={program ? "_blank" : undefined}>
        <div className="h-[var(--host-194)] rounded-[4px] bg-[#D9D9D9]" />
        <div className="mt-[var(--host-10)] flex items-center gap-[var(--host-8)]">
          <span
            className={`inline-flex h-[var(--host-18)] items-center rounded-[4px] px-[var(--host-8)] text-[length:var(--host-10)] font-semibold leading-[1.253] text-white ${
              statusLabel === "오픈"
                ? "bg-[#FF9A3D]"
                : statusLabel === "예정"
                  ? "bg-[#FE701E]"
                  : "bg-[#6D7A8A]"
            }`}
          >
            {statusLabel}
          </span>
          <span className="truncate text-[length:var(--host-10)] font-normal leading-[1.253] text-[#6D7A8A]">
            D+ 00일오픈마감
          </span>
          <Image alt="" className="ml-auto size-[var(--host-16)]" height={16} src={nuvioIcons.bookmark} width={16} />
        </div>
        <h3 className="mt-[var(--host-8)] line-clamp-1 text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#5B3A29]">
          {title}
        </h3>
        <p className="mt-[var(--host-8)] line-clamp-3 text-[length:var(--host-10)] font-normal leading-[1.55] text-[#CAC4BC]">
          프로그램 소개 간략한 후킹을 작성해 주세요. 얼마나 길게 남길지 프레임에 맞춰 표시됩니다.
        </p>
        <p className="mt-[var(--host-16)] text-[length:var(--host-10)] font-normal leading-[1.253] text-[#6D7A8A]">
          프로그램 기간
        </p>
      </Link>
    </article>
  );
}
