import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink, PlayCircle } from "lucide-react";
import {
  BoseongFigmaMediaDetailPage,
  BoseongFigmaMediaAspectIndexPage,
  BoseongFigmaMediaIndexPage,
} from "@/components/boseong-figma-site";
import { ChannelGuestGalleryPage } from "@/components/channel-guest-gallery";
import { ChannelGuestMagazinePage } from "@/components/channel-guest-magazine";
import {
  VillageSiteFooter,
  VillageSiteHeader,
} from "@/components/village-site-chrome";
import { formatDate } from "@/lib/format";
import { villagePath } from "@/lib/village-routing";
import type { Program, VillageMediaContent } from "@/lib/types";
import type { PublishedVillagePageSection } from "@/lib/village-page-content";
import type { Village } from "@/lib/village-types";

const mediaCategoryLabels: Record<VillageMediaContent["category"], string> = {
  original: "자체 컨텐츠",
  broadcast: "방송출연",
  archive: "아카이브",
};

export function VillageMediaIndexPage({
  media,
  pageSections,
  programs,
  village,
  viewType = "gallery",
}: {
  media: VillageMediaContent[];
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  village: Village;
  viewType?: "gallery" | "magazine";
}) {
  if (village.slug === "boseong") {
    if (viewType === "magazine") {
      return (
        <BoseongFigmaMediaAspectIndexPage
          media={media}
          programs={programs}
          village={village}
        />
      );
    }

    return (
      <BoseongFigmaMediaIndexPage
        media={media}
        pageSections={pageSections}
        programs={programs}
        village={village}
      />
    );
  }

  if (viewType === "magazine") {
    return <ChannelGuestMagazinePage media={media} village={village} />;
  }

  return <ChannelGuestGalleryPage media={media} village={village} />;
}

export function VillageMediaDetailPage({
  content,
  media,
  programs,
  village,
}: {
  content: VillageMediaContent;
  media: VillageMediaContent[];
  programs: Program[];
  village: Village;
}) {
  if (village.slug === "boseong") {
    return (
      <BoseongFigmaMediaDetailPage
        content={content}
        media={media}
        programs={programs}
        village={village}
      />
    );
  }

  const related = media
    .filter((item) => item.id !== content.id)
    .slice(0, 3);
  const isPortraitEmbed = content.provider === "instagram";

  return (
    <VillageMediaFrame primaryProgram={programs[0]} title={content.title} village={village}>
      <article className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div
            className={
              isPortraitEmbed
                ? "relative mx-auto aspect-[9/16] max-h-[760px] w-full max-w-[430px] overflow-hidden bg-[#11130f]"
                : "relative aspect-video overflow-hidden bg-[#11130f]"
            }
          >
            {content.embedUrl ? (
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
                referrerPolicy="strict-origin-when-cross-origin"
                src={content.embedUrl}
                title={content.title}
              />
            ) : (
              <Image
                alt={content.title}
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 70vw"
                src={content.thumbnail}
              />
            )}
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 bg-black/78 px-3 py-1.5 text-sm font-black text-white">
              <PlayCircle size={16} />
              {mediaCategoryLabels[content.category]}
            </span>
          </div>

          <div className="border-x border-b border-[#d9d6c9] bg-white px-6 py-7 md:px-8">
            <p className="text-sm font-bold text-slate-500">
              {formatDate(content.date)} · {content.sourceName}
            </p>
            <p className="mt-5 text-lg font-bold leading-8 text-slate-800">
              {content.summary}
            </p>
            <div className="mt-7 space-y-5 text-base leading-8 text-slate-700">
              {content.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <a
              className="mt-8 inline-flex h-11 items-center justify-center gap-2 bg-[#11130f] px-4 text-sm font-black text-white hover:bg-[#4E7C3A]"
              href={content.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              {getSourceButtonLabel(content.provider)}
              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        <aside className="space-y-3">
          <Link
            className="flex items-center justify-between border border-[#d9d6c9] bg-white px-4 py-4 text-sm font-black hover:border-[#4E7C3A]"
            href={`${villagePath(village.slug)}/media`}
          >
            미디어 목록
            <ArrowRight size={16} />
          </Link>
          <Link
            className="flex items-center justify-between border border-[#d9d6c9] bg-white px-4 py-4 text-sm font-black hover:border-[#4E7C3A]"
            href={villagePath(village.slug)}
          >
            {village.name} 홈
            <ArrowRight size={16} />
          </Link>
          {related.length > 0 ? (
            <div className="border border-[#d9d6c9] bg-white p-4">
              <h2 className="text-sm font-black text-slate-950">다른 미디어</h2>
              <div className="mt-4 space-y-3">
                {related.map((item) => (
                  <Link
                    className="block text-sm font-bold leading-6 text-slate-700 hover:text-[#4E7C3A]"
                    href={`${villagePath(village.slug)}/media/${item.id}`}
                    key={item.id}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </article>
    </VillageMediaFrame>
  );
}

function VillageMediaFrame({
  children,
  primaryProgram,
  title,
  village,
}: {
  children: React.ReactNode;
  primaryProgram?: Program;
  title: string;
  village: Village;
}) {
  return (
    <div className="bg-[#f7f7f0] text-[#181a16]">
      <VillageSiteHeader
        primaryProgram={primaryProgram}
        variant="dark"
        village={village}
      />
      <section className="border-b border-[#d9d6c9] bg-white px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-5xl">
            {title}
          </h1>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        {children}
      </section>
      <VillageSiteFooter primaryProgram={primaryProgram} village={village} />
    </div>
  );
}

function getSourceButtonLabel(provider?: VillageMediaContent["provider"]): string {
  if (provider === "youtube") return "유튜브에서 보기";
  if (provider === "instagram") return "인스타그램에서 보기";
  return "원문 보기";
}
