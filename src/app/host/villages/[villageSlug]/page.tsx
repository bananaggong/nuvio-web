import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LockKeyhole, MapPin } from "lucide-react";
import { BoseongAdminConsole } from "@/components/boseong-admin-console";
import { HostAccessBanner } from "@/components/host-access-banner";
import { getHostVillageAccess } from "@/lib/host-village-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "로컬홈 운영 | 누비오 호스트센터",
  description: "특정 로컬홈 권한을 가진 계정이 운영 화면에 접근합니다.",
};

export default async function HostVillageConsolePage({
  params,
}: {
  params: Promise<{ villageSlug: string }>;
}) {
  const { villageSlug } = await params;
  const access = await getHostVillageAccess(villageSlug);

  if (!access.allowed && access.reason === "signedOut") {
    redirect(
      `/login?intent=host&next=${encodeURIComponent(`/host/villages/${villageSlug}`)}`,
    );
  }

  if (!access.allowed) {
    return (
      <>
        <HostAccessBanner />
        <AccessDenied villageSlug={villageSlug} />
      </>
    );
  }

  if (villageSlug === "boseong") {
    return (
      <>
        <HostAccessBanner />
        <BoseongAdminConsole />
      </>
    );
  }

  return (
    <>
      <HostAccessBanner />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <section className="rounded-md border border-slate-200 bg-white p-6">
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <MapPin size={18} />
            로컬홈 운영
          </p>
          <h1 className="mt-3 text-2xl font-black text-slate-950">
            /{villageSlug} 운영 화면
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            이 로컬홈의 전용 운영 화면은 아직 구성 전입니다. 현재는 공통 로컬홈 정보와
            프로젝트 운영 도구를 먼저 사용할 수 있습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <HostLink href="/host/villages" label="로컬홈 정보 수정" />
            <HostLink href="/host/projects" label="운영 프로젝트" />
            <HostLink href={`/${villageSlug}`} label="공개 페이지 보기" />
          </div>
        </section>
      </main>
    </>
  );
}

function AccessDenied({ villageSlug }: { villageSlug: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <section className="rounded-md border border-amber-200 bg-white p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-amber-700">
          <LockKeyhole size={18} />
          권한 확인 필요
        </p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">
          이 로컬홈을 운영할 수 있는 계정이 아닙니다.
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          /{villageSlug} 운영 권한은 로컬홈별로 연결됩니다. 기존 로컬홈은 권한이
          연결된 계정으로 접속하거나, 관리자에게 권한 이전을 요청해야 합니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <HostLink href="/host" label="호스트센터로 이동" />
          <HostLink href="/me" label="내 계정 확인" />
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
