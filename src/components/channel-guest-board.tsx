import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ChannelProfileHeader,
  channelGuestScaleRootStyle,
  px,
} from "@/components/channel-guest-gallery";
import type { VillageNotice } from "@/lib/village-template";
import { villagePath } from "@/lib/village-routing";
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
  maxWidth: `calc(100% - ${px(396)})`,
  width: px(1044),
} as CSSProperties;

export function ChannelGuestBoardPage({
  notices,
  village,
}: ChannelGuestBoardPageProps) {
  const homeHref = villagePath(village.slug);
  const rows = buildBoardRows(notices, homeHref);

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
            paddingTop: px(29),
          }}
        >
          <div className="w-full">
            {rows.map((row) => (
              <BoardListRow key={row.id} row={row} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function BoardListRow({ row }: { row: BoardRow }) {
  return (
    <Link
      className="grid items-center border-b border-[#F0D8C8] transition hover:bg-[#FFF9F4]"
      href={row.href}
      style={{
        gridTemplateColumns: `${px(90)} minmax(0, 1fr) ${px(170)}`,
        height: px(43),
      }}
    >
      <span className="flex items-center">
        {row.badge ? <BoardBadge type={row.badge} /> : null}
      </span>
      <span
        className="truncate font-medium leading-[1.253] text-[#5B3A29]"
        style={{ fontSize: px(14) }}
      >
        {row.title}
      </span>
      <span
        className="text-right font-medium leading-[1.253] text-[#D3CBC4]"
        style={{ fontSize: px(14) }}
      >
        {row.date}
      </span>
    </Link>
  );
}

function BoardBadge({ type }: { type: "fixed" | "new" }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold leading-none text-white"
      style={{
        backgroundColor: type === "fixed" ? "#789157" : "#FF6422",
        fontSize: px(12),
        height: px(19),
        width: px(39),
      }}
    >
      {type === "fixed" ? "고정" : "새글"}
    </span>
  );
}

function buildBoardRows(notices: VillageNotice[], homeHref: string): BoardRow[] {
  const rows = notices.slice(0, 4).map((notice, index) => ({
    badge: index === 0 ? ("fixed" as const) : index === 1 ? ("new" as const) : undefined,
    date: formatBoardDate(notice.date),
    href: notice.href,
    id: `${notice.type}-${notice.title}-${index}`,
    title: notice.title || "제목",
  }));

  return rows.concat(
    Array.from({ length: Math.max(0, 4 - rows.length) }, (_, index) => ({
      badge: index === 0 && rows.length === 0 ? ("fixed" as const) : undefined,
      date: "2000. 00. 00 00:00",
      href: `${homeHref}/notice`,
      id: `board-fallback-${index}`,
      title: "제목",
    })),
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
