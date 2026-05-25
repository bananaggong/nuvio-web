import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FilePlus2,
  FolderKanban,
  Globe2,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { HostCenterHome } from "@/components/host-center-home";
import { HostAccessBanner } from "@/components/host-access-banner";
import { HostLocalHomeCreate } from "@/components/host-local-home-create";
import {
  getHostConsoleOverview,
  type HostVillageWorkspace,
} from "@/lib/host-village-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "호스트센터 | 누비오",
  description:
    "누비오 호스트가 로컬페이지, 프로그램, 신청자, 메시지, 정산 자료를 운영하는 시작 화면입니다.",
};

const operations = [
  {
    href: "/host/projects",
    title: "폴더",
    helper: "프로그램별 신청, 활동, 증빙, 보고 흐름을 폴더 단위로 봅니다.",
    icon: FolderKanban,
  },
  {
    href: "/host/programs",
    title: "프로그램 등록",
    helper: "모집 페이지로 노출할 프로그램 초안을 만들고 공개 상태를 관리합니다.",
    icon: ClipboardList,
  },
  {
    href: "/host/forms",
    title: "신청폼",
    helper: "프로그램별 신청 질문과 제출 양식을 구성합니다.",
    icon: FilePlus2,
  },
  {
    href: "/host/applications",
    title: "신청자 CRM",
    helper: "접수, 심사, 선정, 체크인 상태를 이어서 관리합니다.",
    icon: Users,
  },
  {
    href: "/host/messages",
    title: "안내 메시지",
    helper: "선정 안내, 리마인드, 제출 요청 메시지를 준비합니다.",
    icon: MessageSquareText,
  },
  {
    href: "/host/reports",
    title: "활동/증빙",
    helper: "참여 기록, 영수증, 만족도, 마감 보고 자료를 모읍니다.",
    icon: WalletCards,
  },
] as const;

export default async function HostPage() {
  const overview = await getHostConsoleOverview();

  if (overview.signedIn && overview.workspaces.length === 0) {
    return <HostLocalHomeCreate />;
  }

  if (overview.signedIn && overview.workspaces[0]) {
    return <HostCenterHome workspace={overview.workspaces[0]} />;
  }

  return (
    <>
      <HostAccessBanner />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <section className="rounded-md border border-slate-200 bg-white p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
                <ShieldCheck size={18} />
                호스트센터
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950">
                내 계정에 연결된 로컬페이지와 운영 업무를 시작해요.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                누비오의 호스트 권한은 계정 전체 권한이 아니라 로컬페이지 단위로 연결돼요.
                새 운영자는 로컬페이지를 직접 만들고, 기존 로컬페이지는 권한이 연결된 계정에서
                운영 화면을 열 수 있어요.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <PrimaryLink href="/host/projects" label="폴더 보기" />
                <SecondaryLink href="/host/villages" label="로컬페이지 정보 관리" />
              </div>
            </div>

            <div className="rounded-md bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-950">접속 상태</p>
              <div className="mt-3 grid gap-3 text-sm">
                <StatusRow label="로그인" value={overview.signedIn ? "완료" : "필요"} />
                <StatusRow
                  label="운영 공간"
                  value={`${overview.workspaces.length}개 연결`}
                />
                <StatusRow
                  label="계정"
                  value={overview.profile?.email ?? "로그인 후 확인"}
                />
              </div>
              {!overview.signedIn ? (
                <Link
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
                  href="/login?intent=host&next=/host"
                >
                  로그인하고 시작
                  <ArrowRight size={15} />
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">내 로컬페이지</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                운영 권한이 연결된 로컬페이지만 전용 운영 화면으로 들어갈 수 있어요.
              </p>
            </div>
            <Link
              className="hidden h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)] sm:inline-flex"
              href="/host/villages"
            >
              로컬페이지 관리
              <ArrowRight size={15} />
            </Link>
          </div>

          {overview.workspaces.length > 0 ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {overview.workspaces.map((workspace) => (
                <WorkspaceCard key={workspace.membershipId || workspace.slug} workspace={workspace} />
              ))}
            </div>
          ) : (
            <EmptyWorkspace signedIn={overview.signedIn} />
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-black text-slate-950">운영 도구</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {operations.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="group rounded-md border border-slate-200 bg-white p-4 hover:border-[var(--primary)] hover:bg-teal-50"
                  href={item.href}
                  key={item.href}
                >
                  <span className="grid size-10 place-items-center rounded-md bg-slate-100 text-[var(--primary)] group-hover:bg-white">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-4 text-base font-black text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.helper}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

function WorkspaceCard({ workspace }: { workspace: HostVillageWorkspace }) {
  return (
    <article className="grid overflow-hidden rounded-md border border-slate-200 bg-white sm:grid-cols-[220px_minmax(0,1fr)]">
      <Link
        className="relative block min-h-48 bg-slate-100"
        href={workspace.consolePath}
      >
        <Image
          alt={workspace.title}
          className="object-cover"
          fill
          sizes="(max-width: 768px) 100vw, 220px"
          src={workspace.heroImage}
        />
      </Link>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-700">
            {roleLabel(workspace.role)}
          </span>
          <span
            className={`rounded-md px-2 py-1 text-xs font-black ${
              workspace.status === "active"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {workspace.status === "active" ? "활성" : "대기"}
          </span>
        </div>
        <h3 className="mt-3 text-xl font-black text-slate-950">
          {workspace.title}
        </h3>
        <p className="mt-1 text-sm font-bold text-slate-500">
          {workspace.region} {workspace.city} · /{workspace.slug}
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
          {workspace.summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryLink href={workspace.consolePath} label="운영 화면" />
          <SecondaryLink href={workspace.editorPath} label="페이지 편집" />
          <SecondaryLink href={workspace.publicPath} label="공개 보기" />
        </div>
      </div>
    </article>
  );
}

function EmptyWorkspace({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mt-4 rounded-md border border-dashed border-slate-300 bg-white p-6">
      <p className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
        <LockKeyhole size={18} />
        연결된 로컬페이지가 없습니다.
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        {signedIn
          ? "아직 이 계정에 연결된 로컬페이지가 없습니다. 새 로컬페이지를 만들거나 기존 로컬페이지 권한을 연결해 주세요."
          : "로그인하면 이 계정에 연결된 로컬페이지 운영 공간이 표시돼요."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryLink
          href={signedIn ? "/host/villages?new=1" : "/login?intent=host&next=/host"}
          label={signedIn ? "로컬페이지 만들기" : "로그인"}
        />
        <SecondaryLink href="/partners/apply" label="운영 문의" />
      </div>
    </section>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-4 rounded-md bg-white px-3 py-2">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="truncate font-black text-slate-950">{value}</span>
    </p>
  );
}

function PrimaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
      href={href}
    >
      {label}
      <ArrowRight size={15} />
    </Link>
  );
}

function SecondaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
      href={href}
    >
      <Globe2 size={15} />
      {label}
    </Link>
  );
}

function roleLabel(role: HostVillageWorkspace["role"]) {
  if (role === "owner") return "소유자";
  if (role === "manager") return "매니저";
  if (role === "editor") return "편집자";
  return "조회";
}
