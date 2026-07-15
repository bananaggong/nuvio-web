import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Megaphone } from "lucide-react";
import { JsonLdScript } from "@/components/json-ld";
import { announcements, getAnnouncementById, getProgramById } from "@/lib/data";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { formatDateTime } from "@/lib/format";
import { programPath } from "@/lib/program-routing";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  createSeoMetadata,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  if (!isDemoModeEnabled()) return [];
  return announcements.map((announcement) => ({ id: String(announcement.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  if (!isDemoModeEnabled()) return {};

  const { id } = await params;
  const announcement = getAnnouncementById(Number(id));
  if (!announcement) return {};
  return createSeoMetadata({
    title: announcement.title,
    description: announcement.body,
    path: `/announcements/${announcement.id}`,
  });
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isDemoModeEnabled()) notFound();

  const { id } = await params;
  const announcement = getAnnouncementById(Number(id));
  if (!announcement) notFound();
  const program = announcement.programId
    ? getProgramById(announcement.programId)
    : undefined;
  const canonicalPath = `/announcements/${announcement.id}`;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <JsonLdScript
        data={[
          articleJsonLd({
            title: announcement.title,
            description: announcement.body,
            body: announcement.body,
            datePublished: announcement.date,
            path: canonicalPath,
          }),
          breadcrumbJsonLd([
            { name: "홈", path: "/" },
            { name: "실시간 공지", path: "/announcements" },
            { name: announcement.title, path: canonicalPath },
          ]),
        ]}
      />
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
          <Megaphone size={18} />
          실시간 공지
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-slate-950">
          {announcement.title}
        </h1>
        <time className="mt-3 block text-sm font-bold text-slate-400">
          {formatDateTime(announcement.date)}
        </time>
        <p className="mt-6 rounded-md bg-[var(--surface-muted)] p-4 text-base leading-8 text-slate-700">
          {announcement.body}
        </p>
        {program ? (
          <Link
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-3 text-sm font-black text-white"
            href={programPath(program)}
          >
            연결 프로그램 보기
            <ArrowRight size={18} />
          </Link>
        ) : null}
      </article>
    </div>
  );
}
