import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { JsonLdScript } from "@/components/json-ld";
import { formatDate } from "@/lib/format";
import { sanitizeMagazineHtml } from "@/lib/magazine-content";
import { getPublicMagazinePostBySlug } from "@/lib/magazine-db";
import { getMagazineCategoryLabel } from "@/lib/magazine-types";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  createSeoMetadata,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicMagazinePostBySlug(decodeURIComponent(slug));
  if (!post) return {};

  return createSeoMetadata({
    title: post.title,
    description: post.excerpt || post.subtitle,
    image: post.coverImageUrl || undefined,
    path: `/magazine/${post.slug}`,
  });
}

export default async function MagazineDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublicMagazinePostBySlug(decodeURIComponent(slug));
  if (!post) notFound();
  const canonicalPath = `/magazine/${post.slug}`;
  const contentHtml = sanitizeMagazineHtml(post.contentHtml);
  const authorName = post.authorName || "누비오";

  return (
    <div className="font-pretendard min-h-screen bg-white text-[#2B1E17]">
      <JsonLdScript
        data={[
          articleJsonLd({
            body: contentHtml,
            dateModified: post.updatedAt,
            datePublished: post.publishedAt ?? post.createdAt,
            description: post.excerpt || post.subtitle,
            image: post.coverImageUrl || undefined,
            path: canonicalPath,
            title: post.title,
          }),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: "누비오 소식지", path: "/magazine" },
            { name: post.title, path: canonicalPath },
          ]),
        ]}
      />
      <article className="mx-auto w-full max-w-[980px] px-5 pb-24 pt-12 md:px-8 md:pt-20">
        <Link
          className="inline-flex items-center gap-2 text-[14px] font-black text-[#7A6255] transition hover:text-[#fe701e]"
          href="/magazine"
        >
          <ArrowLeft size={17} strokeWidth={2.2} />
          소식지 목록
        </Link>

        <header className="mt-10">
          <p className="text-[13px] font-black text-[#fe701e]">
            {getMagazineCategoryLabel(post.category)}
          </p>
          <h1 className="mt-4 text-[36px] font-black leading-tight md:text-[58px]">
            {post.title}
          </h1>
          {post.subtitle ? (
            <p className="mt-5 max-w-3xl text-[18px] font-semibold leading-8 text-[#6B5145]">
              {post.subtitle}
            </p>
          ) : null}
          <time className="mt-6 block text-[13px] font-bold text-[#9A8579]">
            {formatDate(post.publishedAt ?? post.createdAt)}
          </time>
          <p className="mt-2 text-[13px] font-bold text-[#9A8579]">
            by.{authorName}
          </p>
        </header>

        {post.coverImageUrl ? (
          <div className="relative mt-10 aspect-[16/10] overflow-hidden rounded-[10px] bg-[#D9D9D9]">
            <Image
              alt={post.coverImageAlt || post.title}
              className="object-cover"
              fill
              priority
              sizes="(min-width: 980px) 980px, 100vw"
              src={post.coverImageUrl}
            />
          </div>
        ) : null}

        <div
          className="magazine-content mt-12 text-[17px] font-medium leading-9 text-[#4B3328]"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>
    </div>
  );
}
