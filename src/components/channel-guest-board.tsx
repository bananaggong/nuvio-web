import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ChannelProfileHeader,
  channelGuestScaleRootStyle,
  px,
} from "@/components/channel-guest-gallery";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import type { VillageNotice } from "@/lib/village-template";
import { channelPath } from "@/lib/channel-routing";
import type { Village } from "@/lib/village-types";

type ChannelGuestBoardPageProps = {
  notices: VillageNotice[];
  village: Village;
};

type BoardRow = {
  badge?: "fixed" | "new";
  date: string;
  href: string;
  id: string;
  title: string;
};

const boardListStyle = {
  maxWidth: `calc(100% - ${px(336)})`,
  width: px(1104),
} as CSSProperties;

export function ChannelGuestBoardPage({
  notices,
  village,
}: ChannelGuestBoardPageProps) {
  const homeHref = channelPath(village.slug);
  const rows = buildBoardRows(notices);

  return (
    <div
      className="min-h-screen overflow-x-clip bg-white font-pretendard text-[#5B3A29]"
      style={channelGuestScaleRootStyle}
    >
      <main className="mx-auto w-full max-w-[1920px]">
        <ChannelProfileHeader activeTab="board" homeHref={homeHref} village={village} />

        <section
          className="mx-auto"
          style={{
            ...boardListStyle,
            paddingBottom: px(48),
            paddingTop: px(8),
          }}
        >
          {rows.length > 0 ? (
            <div
              className="w-full"
              style={{
                borderRadius: px(6),
                padding: `${px(8)} ${px(30)} ${px(14)}`,
              }}
            >
              {rows.map((row) => (
                <BoardListRow key={row.id} row={row} />
              ))}
            </div>
          ) : (
            <ChannelBoardEmptyState />
          )}
        </section>
      </main>
    </div>
  );
}

function BoardListRow({ row }: { row: BoardRow }) {
  return (
    <Link
      className="grid items-center border-b border-[#F7B267] transition hover:bg-[#FFF9F4]"
      href={row.href}
      style={{
        borderBottomWidth: px(0.5),
        gridTemplateColumns: `${row.badge ? px(82) : px(44)} minmax(0, 1fr) ${px(138)}`,
        minHeight: px(43),
        paddingBottom: px(12),
        paddingTop: px(12),
      }}
    >
      <span className="flex items-center">
        {row.badge ? <BoardBadge type={row.badge} /> : null}
      </span>
      <span
        className="truncate font-medium leading-[1.253] text-[#5B3A29]"
        style={{ fontSize: px(12) }}
      >
        {row.title}
      </span>
      <span
        className="text-right font-normal leading-[1.6] text-[#CAC4BC]"
        style={{ fontSize: px(12), paddingRight: px(27) }}
      >
        {row.date}
      </span>
    </Link>
  );
}

function BoardBadge({ type }: { type: "fixed" | "new" }) {
  return (
    <span
      className="inline-flex items-center justify-center font-semibold leading-[1.253] text-[#F9F9F9]"
      style={{
        backgroundColor: type === "fixed" ? "#789157" : "#FF6422",
        fontSize: px(12),
        borderRadius: px(6),
        minHeight: px(19),
        padding: `${px(1)} ${px(9)}`,
      }}
    >
      {type === "fixed" ? "고정" : "새글"}
    </span>
  );
}

function buildBoardRows(notices: VillageNotice[]): BoardRow[] {
  return notices.map((notice, index) => ({
    badge:
      notice.type === "고정"
        ? ("fixed" as const)
        : notice.type === "새글"
          ? ("new" as const)
          : undefined,
    date: formatBoardDate(notice.date),
    href: notice.href,
    id: `${notice.type}-${notice.title}-${notice.href}-${index}`,
    title: notice.title || "제목",
  }));
}

function ChannelBoardEmptyState() {
  return (
    <div
      className="border border-dashed border-[#D6D6D6]"
      style={{
        minHeight: px(320),
      }}
    >
      <NuvioEmptyState className="h-full" message="아직 게시글이 없어요" />
    </div>
  );
}

function formatBoardDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "2000. 00. 00 00:00";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}. ${month}. ${day} 00:00`;
}
