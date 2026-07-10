import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ChannelProfileHeader,
  channelGuestScaleRootStyle,
  px,
} from "@/components/channel-guest-gallery";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import type { ChannelBoardPost } from "@/lib/channel-board-posts";
import type { VillageNotice } from "@/lib/village-template";
import { channelPath } from "@/lib/channel-routing";
import type { Village } from "@/lib/village-types";

type ChannelGuestBoardPageProps = {
  notices: VillageNotice[];
  village: Village;
};

type BoardRow = {
  badges: Array<"fixed" | "new">;
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

export function ChannelGuestBoardDetailPage({
  post,
  village,
}: {
  post: ChannelBoardPost;
  village: Village;
}) {
  const homeHref = channelPath(village.slug);
  const boardHref = `${homeHref}/notice`;
  const bodyHtml = post.body?.trim();

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
            paddingBottom: px(88),
            paddingTop: px(30),
          }}
        >
          <Link
            className="inline-flex items-center font-semibold leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
            href={boardHref}
            style={{ fontSize: px(13), marginBottom: px(24) }}
          >
            게시판 목록
          </Link>

          <article
            className="border-y border-[#F7B267]"
            style={{
              paddingBottom: px(52),
              paddingTop: px(31),
            }}
          >
            <div className="flex flex-wrap items-center justify-between" style={{ gap: px(18) }}>
              <div className="flex min-w-0 items-center" style={{ gap: px(8) }}>
                {post.pinned ? <BoardBadge type="fixed" /> : null}
                {isRecentBoardDate(post.createdAt) ? <BoardBadge type="new" /> : null}
                <h1
                  className="min-w-0 font-semibold leading-[1.253] text-[#5B3A29]"
                  style={{ fontSize: px(24) }}
                >
                  {post.title}
                </h1>
              </div>
              <time
                className="shrink-0 font-normal leading-[1.6] text-[#CAC4BC]"
                dateTime={post.createdAt}
                style={{ fontSize: px(13) }}
              >
                {formatBoardDate(post.createdAt)}
              </time>
            </div>

            {bodyHtml ? (
              <div
                className="magazine-content text-[#5B3A29]"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
                style={{
                  fontSize: px(15),
                  marginTop: px(38),
                }}
              />
            ) : (
              <p
                className="font-medium leading-[1.8] text-[#CAC4BC]"
                style={{ fontSize: px(15), marginTop: px(38) }}
              >
                작성된 내용이 없습니다.
              </p>
            )}
          </article>
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
        gridTemplateColumns: `${row.badges.length > 0 ? px(108) : px(44)} minmax(0, 1fr) ${px(138)}`,
        minHeight: px(43),
        paddingBottom: px(12),
        paddingTop: px(12),
      }}
    >
      <span className="flex items-center" style={{ gap: px(4) }}>
        {row.badges.map((badge) => (
          <BoardBadge key={badge} type={badge} />
        ))}
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
  return notices.map((notice, index) => {
    const badges: BoardRow["badges"] = [];
    if (notice.type.includes("고정")) badges.push("fixed");
    if (notice.type.includes("새글")) badges.push("new");

    return {
      badges,
      date: formatBoardDate(notice.date),
      href: notice.href,
      id: `${notice.type}-${notice.title}-${notice.href}-${index}`,
      title: notice.title || "제목",
    };
  });
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
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}. ${month}. ${day} ${hours}:${minutes}`;
}

function isRecentBoardDate(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const age = Date.now() - date.getTime();
  return age >= 0 && age <= 10 * 24 * 60 * 60 * 1000;
}
