import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { JsonLdScript } from "@/components/json-ld";
import { getProgramById, reviewCategories } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { programPath } from "@/lib/program-routing";
import { getPublicReviewFromDb } from "@/lib/review-db";
import {
  breadcrumbJsonLd,
  createSeoMetadata,
  reviewJsonLd,
} from "@/lib/seo";

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  if (!launchFeatureFlags.reviews) return {};

  const { id } = await params;
  const review = await getPublicReviewFromDb(id);
  if (!review) return {};

  return createSeoMetadata({
    title: review.title,
    description: review.excerpt,
    image: review.images[0],
    path: `/reviews/${review.id}`,
  });
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!launchFeatureFlags.reviews) notFound();

  const { id } = await params;
  const review = await getPublicReviewFromDb(id);
  if (!review) notFound();

  const program = review.programId ? getProgramById(review.programId) : undefined;
  const programTitle = program?.title ?? review.programTitle;
  const programHref = program
    ? programPath(program)
    : review.programSlug || review.programUuid
      ? `/programs/${review.programSlug ?? review.programUuid}`
      : undefined;
  const categoryLabel =
    reviewCategories.find((item) => item.key === review.category)?.label ?? "후기";
  const canonicalPath = `/reviews/${review.id}`;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <JsonLdScript
        data={[
          reviewJsonLd(review, canonicalPath, programTitle ?? "누비오 후기"),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: "후기", path: "/reviews" },
            { name: review.title, path: canonicalPath },
          ]),
        ]}
      />
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-[var(--primary)]">{categoryLabel}</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950">
          {review.title}
        </h1>
        <div className="mt-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-[var(--surface-muted)] text-sm font-black text-slate-600">
              {review.author.slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">{review.author}</p>
              <p className="text-xs text-slate-400">{formatDateTime(review.date)}</p>
            </div>
          </div>
          <div className="flex gap-3 text-sm font-bold text-slate-500">
            {review.rating ? <span>{review.rating}.0</span> : null}
            <span className="inline-flex items-center gap-1">
              <Heart size={16} /> {review.likes}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle size={16} /> {review.comments}
            </span>
            <span className="inline-flex items-center gap-1">
              <Share2 size={16} />
            </span>
          </div>
        </div>
        {programTitle && programHref ? (
          <Link
            className="mt-5 block rounded-md border border-teal-100 bg-teal-50 p-4 text-sm font-bold text-[var(--primary-strong)]"
            href={programHref}
          >
            연결 프로그램: {programTitle}
          </Link>
        ) : programTitle ? (
          <div className="mt-5 rounded-md border border-teal-100 bg-teal-50 p-4 text-sm font-bold text-[var(--primary-strong)]">
            연결 프로그램: {programTitle}
          </div>
        ) : null}

        {review.images.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {review.images.map((src, index) => (
              <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-slate-100" key={src}>
                <Image
                  alt={`${review.title} 이미지 ${index + 1}`}
                  className="object-cover"
                  fill
                  sizes="(max-width: 768px) 100vw, 760px"
                  src={src}
                />
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6 space-y-4 text-base leading-8 text-slate-700">
          <p>{review.body}</p>
        </div>
      </article>
    </div>
  );
}