import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import {
  decodeHostVillageSlugParam,
  getHostVillageAccess,
} from "@/lib/host-village-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "채널 편집 | 누비오",
  description: "채널 편집은 호스트센터 채널 탭에서 관리합니다.",
};

export default async function HostVillageEditorPage({
  params,
}: {
  params: Promise<{ villageSlug: string }>;
}) {
  const { villageSlug: encodedVillageSlug } = await params;
  const villageSlug = decodeHostVillageSlugParam(encodedVillageSlug);
  const channelSettingsPath = `/host/channels/settings?channel=${encodeURIComponent(
    villageSlug,
  )}`;
  const access = await getHostVillageAccess(villageSlug);

  if (!access.allowed && access.reason === "signedOut") {
    redirect(
      `/login?intent=host&next=${encodeURIComponent(channelSettingsPath)}`,
    );
  }

  if (!access.allowed) {
    return <AccessDenied villageSlug={villageSlug} />;
  }

  redirect(channelSettingsPath);
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
          이 채널을 편집할 수 있는 계정이 아닙니다.
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          /{villageSlug} 편집 권한은 채널별로 연결됩니다. 관리자에게 운영 계정
          연결 상태를 확인해 주세요.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <HostLink href="/host/channels" label="채널 탭" />
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
