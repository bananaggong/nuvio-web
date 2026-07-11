import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { GalleryRichText } from "@/components/channel-gallery-rich-text";
import { ChannelGuestGalleryContent } from "@/components/channel-guest-gallery-content";
import { ChannelGuestProfileHeader } from "@/components/channel-guest-profile-header";
import {
  channelGuestContentStyle,
  channelGuestScaleRootStyle,
  px,
} from "@/components/channel-guest-shared";
import { channelPath } from "@/lib/channel-routing";
import type { VillageMediaContent } from "@/lib/types";
import type { Village } from "@/lib/village-types";

export { channelGuestContentStyle, channelGuestScaleRootStyle, px } from "@/components/channel-guest-shared";

type ChannelGuestGalleryPageProps = {
  media: VillageMediaContent[];
  village: Village;
};

type ChannelGuestGalleryDetailPageProps = {
  content: VillageMediaContent;
  media: VillageMediaContent[];
  village: Village;
};

export type GalleryViewMode = "all" | "photo" | "video";

export type GalleryItem = {
  caption: string;
  date: string;
  embedUrl?: string;
  href: string;
  id: string;
  image?: string;
  imageCount: number;
  provider?: VillageMediaContent["provider"];
  sourceUrl: string;
  title: string;
};

const text = {
  channelHome: "채널 홈",
  fallbackCaption:
    "인스타그램처럼 게시물과 캡션(본문)내용을 함께 적어 올리는 방식으로 홈화면에서의 캡션은 간략하게 보임",
  notice: "알림",
} as const;

export function ChannelGuestGalleryPage({
  media,
  village,
}: ChannelGuestGalleryPageProps) {
  const homeHref = channelPath(village.slug);
  const items = buildGalleryItems(media, village);

  return (
    <div
      className="channel-guest-page min-h-screen overflow-x-clip bg-white font-pretendard text-[#5B3A29]"
      style={channelGuestScaleRootStyle}
    >
      <main className="mx-auto w-full max-w-[1920px]">
        <ChannelGuestProfileHeader activeTab="gallery" homeHref={homeHref} village={village} />

        <section
          className="channel-guest-content mx-auto flex flex-col items-center"
          style={{
            ...channelGuestContentStyle,
            paddingBottom: px(70),
            paddingTop: px(32),
          }}
        >
          <ChannelGuestGalleryContent items={items} />
        </section>
      </main>
    </div>
  );
}

export function ChannelGuestGalleryDetailPage({
  content,
  media,
  village,
}: ChannelGuestGalleryDetailPageProps) {
  const homeHref = channelPath(village.slug);
  const backHref = `${homeHref}/media`;
  const related = buildGalleryItems(
    media.filter((item) => item.id !== content.id).slice(0, 4),
    village,
  );
  const bodyLines = content.body.length > 0 ? content.body : [content.summary];
  const wideVideo = isWideVideoDetail(content);

  return (
    <div
      className="channel-guest-page min-h-screen overflow-x-clip bg-white font-pretendard text-[#5B3A29]"
      style={channelGuestScaleRootStyle}
    >
      <main className="mx-auto w-full max-w-[1920px]">
        <ChannelGuestProfileHeader activeTab="gallery" homeHref={homeHref} village={village} />

        <section
          className="channel-guest-content mx-auto"
          style={{
            ...channelGuestContentStyle,
            paddingBottom: px(80),
            paddingTop: px(38),
          }}
        >
          <Link
            className="channel-gallery-back inline-flex items-center text-[length:var(--channel-font-14)] font-semibold leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
            href={backHref}
          >
            갤러리 목록
          </Link>

          <article
            className="channel-gallery-detail flex w-full items-start"
            style={{
              gap: px(12),
              paddingTop: px(18),
            }}
          >
            <div className="channel-gallery-detail-media relative flex min-w-0 flex-1 items-start justify-center">
              <GalleryDetailMedia
                className={
                  wideVideo
                    ? "channel-gallery-media-wide h-[clamp(430px,29.861111vw,573.333333px)] w-[clamp(765px,53.125000vw,1020px)]"
                    : "channel-gallery-media-portrait h-[clamp(600px,41.666667vw,800px)] w-[clamp(480px,33.333333vw,640px)]"
                }
                content={content}
              />
            </div>

            <aside
              className="channel-gallery-detail-copy min-w-0 shrink-0"
              style={{
                paddingTop: px(6),
                width: px(340),
              }}
            >
              <p className="text-[length:var(--channel-font-16)] font-semibold leading-[1.253] text-[#6D7A8A]">
                {formatGalleryDetailDate(content.date)}{" "}
                <span className="font-normal">(작성일)</span>
              </p>
              <GalleryRichText
                className="channel-gallery-detail-body mt-[clamp(16px,1.111111vw,21.333333px)] h-[clamp(429px,29.791667vw,572px)] overflow-y-auto whitespace-pre-wrap text-[length:var(--channel-font-16)] font-normal leading-[1.253] text-[#0D0D0C] [&>p]:mb-[clamp(2px,0.138889vw,2.666667px)]"
                lines={bodyLines}
              />
            </aside>
          </article>

          {related.length > 0 ? (
            <section
              aria-label="다른 갤러리 게시물"
              className="channel-gallery-related grid"
              style={{
                columnGap: px(6.211),
                gridTemplateColumns: `repeat(${Math.min(related.length, 4)}, ${px(222.031)})`,
                paddingTop: px(58),
                rowGap: px(24),
              }}
            >
              {related.map((item) => (
                <Link
                  className="channel-gallery-related-card group block"
                  href={item.href}
                  key={item.id}
                  style={{ width: px(222.031) }}
                >
                  <span
                    className="relative block overflow-hidden bg-[#D9D9D9]"
                    style={{
                      aspectRatio: "4 / 5",
                      borderRadius: px(5),
                      width: px(222.031),
                    }}
                  >
                    {item.image ? (
                      <Image
                        alt={item.caption}
                        className="object-cover transition duration-200 group-hover:scale-[1.02]"
                        fill
                        sizes="296px"
                        src={item.image}
                      />
                    ) : null}
                    {isVideoGalleryItem(item) ? (
                      <span className="absolute inset-0 grid place-items-center text-[#FFF6EC]">
                        <Play fill="currentColor" size={28} strokeWidth={0} />
                      </span>
                    ) : null}
                  </span>
                  <span
                    className="mt-[clamp(8px,0.555556vw,10.666667px)] line-clamp-2 block text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#0D0D0C]"
                    style={{
                      paddingLeft: px(6.211),
                      paddingRight: px(6.211),
                    }}
                  >
                    {item.caption}
                  </span>
                </Link>
              ))}
            </section>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function buildGalleryItems(
  media: VillageMediaContent[],
  village: Village,
): GalleryItem[] {
  const homeHref = channelPath(village.slug);
  return media.map((item) => ({
    caption: item.summary || item.title || text.fallbackCaption,
    date: item.date,
    embedUrl: item.embedUrl,
    href: `${homeHref}/media/${item.id}`,
    id: item.id,
    image: item.thumbnail,
    imageCount: item.images?.length ?? 0,
    provider: item.provider,
    sourceUrl: item.sourceUrl,
    title: item.title || item.summary || text.fallbackCaption,
  }));
}

function GalleryDetailMedia({
  className,
  content,
}: {
  className: string;
  content: VillageMediaContent;
}) {
  const isUploadedVideo = content.provider === "video";
  const isEmbeddedVideo = Boolean(content.embedUrl);

  return (
    <div className={`relative overflow-hidden rounded-[6px] bg-[#0D0D0C] ${className}`}>
      {isEmbeddedVideo ? (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
          referrerPolicy="strict-origin-when-cross-origin"
          src={content.embedUrl}
          title={content.title}
        />
      ) : isUploadedVideo ? (
        <video
          className="absolute inset-0 h-full w-full object-contain"
          controls
          playsInline
          poster={content.thumbnail || undefined}
          src={content.sourceUrl}
        />
      ) : (
        <Image
          alt={content.title}
          className="object-cover"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 640px"
          src={content.thumbnail}
        />
      )}
    </div>
  );
}

function isWideVideoDetail(content: VillageMediaContent) {
  return (
    content.provider === "youtube" ||
    content.provider === "video" ||
    (Boolean(content.embedUrl) && content.provider !== "instagram")
  );
}

function formatGalleryDetailDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}. ${month}. ${day}`;
}

function isVideoGalleryItem(item: GalleryItem) {
  return (
    item.provider === "youtube" ||
    item.provider === "instagram" ||
    item.provider === "video" ||
    Boolean(item.embedUrl) ||
    /\.(mp4|mov|webm)(\?|#|$)/iu.test(item.sourceUrl)
  );
}
