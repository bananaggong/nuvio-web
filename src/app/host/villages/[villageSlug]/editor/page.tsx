import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { BoseongPageEditor } from "@/components/boseong-page-editor";
import { getHostVillageAccess } from "@/lib/host-village-access";
import {
  getPublicVillageBySlug,
  getVillagePrograms,
  getVillageReviews,
} from "@/lib/village-db";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { listVillageAssets } from "@/lib/village-assets-db";
import { listPublicVillageMedia } from "@/lib/village-media-db";
import { listHostVillagePageSections } from "@/lib/village-page-cms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "로컬페이지 편집 | 누비오",
  description: "권한이 연결된 로컬페이지를 실제 화면 위에서 편집합니다.",
};

export default async function HostVillageEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ villageSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { villageSlug } = await params;
  const access = await getHostVillageAccess(villageSlug);

  if (!access.allowed && access.reason === "signedOut") {
    redirect(
      `/login?intent=host&next=${encodeURIComponent(
        `/host/villages/${villageSlug}/editor`,
      )}`,
    );
  }

  if (!access.allowed) {
    return (
      <>
        <AccessDenied villageSlug={villageSlug} />
      </>
    );
  }

  const village = await getPublicVillageBySlug(villageSlug);
  if (!village) notFound();

  const { page } = await searchParams;
  const initialPageKey = normalizeEditorPageKey(page);
  const programs = await getVillagePrograms(village);
  const [
    reviews,
    media,
    homeSections,
    aboutSections,
    mediaSections,
    programsSections,
    reviewsSections,
    noticeSections,
    assets,
  ] = await Promise.all([
    launchFeatureFlags.reviews ? getVillageReviews(village, programs) : [],
    listPublicVillageMedia(village.slug, { limit: 12 }),
    listHostVillagePageSections(village.slug, "home"),
    listHostVillagePageSections(village.slug, "about"),
    listHostVillagePageSections(village.slug, "media"),
    listHostVillagePageSections(village.slug, "programs"),
    launchFeatureFlags.reviews
      ? listHostVillagePageSections(village.slug, "reviews")
      : [],
    listHostVillagePageSections(village.slug, "notice"),
    safeListVillageAssets(village.slug),
  ]);

  return (
    <BoseongPageEditor
      assets={assets}
      initialPageKey={initialPageKey}
      media={media}
      programs={programs}
      reviews={reviews}
      sectionsByPage={{
        about: aboutSections,
        home: homeSections,
        media: mediaSections,
        notice: noticeSections,
        programs: programsSections,
        reviews: launchFeatureFlags.reviews ? reviewsSections : [],
      }}
      village={village}
    />
  );
}

async function safeListVillageAssets(villageSlug: string) {
  try {
    return await listVillageAssets(villageSlug);
  } catch {
    return [];
  }
}

function normalizeEditorPageKey(value?: string) {
  if (
    value === "about" ||
    value === "media" ||
    value === "programs" ||
    (launchFeatureFlags.reviews && value === "reviews") ||
    value === "notice"
  ) {
    return value;
  }
  return "home";
}

function AccessDenied({ villageSlug }: { villageSlug: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <section className="rounded-md border border-amber-200 bg-white p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-amber-700">
          <LockKeyhole size={18} />
          편집 권한 확인 필요
        </p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">
          이 로컬페이지를 편집할 수 있는 계정이 아닙니다.
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          /{villageSlug} 편집 권한은 로컬페이지별로 연결됩니다. 관리자에게 운영 계정
          연결 상태를 확인해 주세요.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <HostLink href={`/host/villages/${villageSlug}`} label="운영 화면" />
          <HostLink href="/host" label="호스트센터" />
        </div>
      </section>
    </main>
  );
}

function HostLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
      href={href}
    >
      {label}
      <ArrowRight size={15} />
    </Link>
  );
}
