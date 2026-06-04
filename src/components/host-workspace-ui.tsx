"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import type { ReactNode } from "react";
import { hostProjectPath, type HostProgramOverview } from "@/lib/host-projects";

export type HostProgramListItem = HostProgramOverview & {
  projectId?: string;
  projectTitle: string;
  villageName: string;
};

type HostWorkspaceLayoutProps = {
  children: ReactNode;
  sidebarHeight?: string;
};

export function HostWorkspaceLayout({
  children,
  sidebarHeight = "min-h-[calc(100vh-4.861vw)]",
}: HostWorkspaceLayoutProps) {
  return (
    <main className="font-pretendard min-h-[calc(100vh-4.861vw)] bg-white text-[#33241C]">
      <div className="flex min-h-[calc(100vh-4.861vw)] max-md:flex-col">
        <HostWorkspaceSidebar sidebarHeight={sidebarHeight} />
        {children}
      </div>
    </main>
  );
}

function HostWorkspaceSidebar({ sidebarHeight }: { sidebarHeight: string }) {
  return (
    <aside
      className={`w-[15.833vw] min-w-[228px] shrink-0 bg-white ${sidebarHeight} max-md:w-full max-md:min-h-0`}
    >
      <div className="px-[0.417vw] max-md:px-5">
        <div className="w-[15vw] min-w-[216px] max-md:w-full">
          <section className="h-[5.972vw] min-h-[86px] border-b border-[#E7E1DD]">
            <div className="flex h-10 items-center justify-between px-2 text-[13px] font-black text-[#33241C]">
              <span>로컬 호스트님</span>
              <Bell size={17} className="text-[#FF9A3D]" />
            </div>
            <div className="grid h-[46px] grid-cols-3 items-end text-center">
              {["프로필", "채널", "관리자"].map((label, index) => (
                <Link
                  className={`flex h-[34px] items-center justify-center border-r border-[#F0D5C5] text-[12px] font-black last:border-r-0 ${
                    index === 0 ? "text-[#FE701E]" : "text-[#A99A90]"
                  }`}
                  href={index === 0 ? "/host" : index === 1 ? "/host/villages" : "/admin"}
                  key={label}
                >
                  {label}
                </Link>
              ))}
            </div>
          </section>

          <nav className="mt-3 px-3 text-[13px] font-black leading-[18px]">
            <section>
              <Link className="block text-[#33241C]" href="/host">
                내 프로그램
              </Link>
              <div className="mt-2 grid gap-1.5 pl-1">
                <HostSidebarSubLink href="/host?status=open" label="오픈 프로그램" />
                <HostSidebarSubLink href="/host?status=upcoming" label="예정 프로그램" />
                <HostSidebarSubLink href="/host?status=closed" label="마감 프로그램" />
              </div>
            </section>
            <div className="mt-3 grid gap-3 border-t border-[#E7E1DD] pt-3">
              <Link className="text-[#33241C] hover:text-[#FE701E]" href="/host/messages">
                메세지함
              </Link>
              <Link className="text-[#33241C] hover:text-[#FE701E]" href="/host/forms">
                신청서 양식
              </Link>
              <Link className="text-[#FE701E]" href="/host/settings">
                설정
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
}

function HostSidebarSubLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="block rounded-[3px] px-1.5 py-0.5 text-[12px] font-bold text-[#7C8794] transition hover:bg-[#FFF1E8] hover:text-[#FE701E]"
      href={href}
    >
      {label}
    </Link>
  );
}

export function HostWorkspaceContent({
  children,
  insideFolder = false,
}: {
  children: ReactNode;
  insideFolder?: boolean;
}) {
  return (
    <section
      className={`min-w-0 flex-1 ${
        insideFolder
          ? "pl-[1.944vw] max-md:px-5"
          : "pl-[2.778vw] pr-[3.75vw] max-md:px-5"
      }`}
    >
      {children}
    </section>
  );
}

export function HostSectionTitle({
  action,
  title,
}: {
  action?: ReactNode;
  title: string;
}) {
  return (
    <div className="flex h-[29px] items-center gap-[2.361vw]">
      <h2 className="text-[14px] font-black leading-5 text-[#33241C]">{title}</h2>
      {action}
    </div>
  );
}

export function HostSmallButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        className="inline-flex h-[29px] items-center justify-center rounded-[3px] bg-[#7C8794] px-3 text-[12px] font-black text-white transition hover:bg-[#667482]"
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <span className="inline-flex h-[29px] items-center justify-center rounded-[3px] bg-[#7C8794] px-3 text-[12px] font-black text-white">
      {children}
    </span>
  );
}

export function HostFolderCard({
  folder,
  programCount,
  programs,
}: {
  folder: { applicationCount: number; id: string; title: string };
  programCount: number;
  programs: HostProgramListItem[];
}) {
  const previews = programs.slice(0, 3);

  return (
    <Link
      className="group block h-[24.375vw] min-h-[351px] w-[20vw] min-w-[288px] rounded-[5px] border border-[#E5D8D0] bg-white p-[0.556vw] transition hover:border-[#FE701E] max-md:w-full"
      href={hostProjectPath(folder.id)}
    >
      <div className="grid grid-cols-2 gap-[0.417vw]">
        {[0, 1, 2].map((index) => (
          <div
            className="relative aspect-square overflow-hidden rounded-[7px] bg-[#D9D9D9]"
            key={index}
          >
            {previews[index]?.imageUrl ? (
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="140px"
                src={previews[index].imageUrl}
              />
            ) : null}
          </div>
        ))}
        <div className="grid aspect-square place-items-center rounded-[7px] bg-white">
          <span className="grid size-7 place-items-center rounded-full bg-[#FF9A3D] text-white">
            <Plus size={16} />
          </span>
          <span className="-mt-8 text-[11px] font-black text-[#8B7A6E]">
            전체보기
          </span>
        </div>
      </div>
      <div className="mt-[0.972vw]">
        <p className="line-clamp-2 text-[13px] font-black leading-5 text-[#33241C]">
          {folder.title}
        </p>
        <p className="mt-[0.278vw] text-[12px] font-bold text-[#7C8794]">
          저장된 프로그램 {programCount}개
        </p>
        <p className="mt-[0.278vw] text-[12px] font-bold text-[#7C8794]">
          신청 {folder.applicationCount}명
        </p>
      </div>
    </Link>
  );
}

export function HostProgramRow({
  actionLabel,
  items,
  title,
}: {
  actionLabel: string;
  items: HostProgramListItem[];
  title: string;
}) {
  const visibleItems = items.slice(0, 4);

  return (
    <section className="h-[15.208vw] min-h-[219px]">
      <div className="flex h-[18px] items-center">
        <h3 className="w-[135px] shrink-0 text-[13px] font-black leading-[18px] text-[#33241C]">
          {title} ({String(items.length).padStart(2, "0")})
        </h3>
        <span className="h-px flex-1 bg-[#B6C0CA]" />
      </div>
      <div className="mt-[2.569vw] flex items-center gap-[1.597vw] max-md:mt-6 max-md:flex-wrap">
        {visibleItems.map((program) => (
          <HostMiniProgramCard
            actionLabel={actionLabel}
            key={`${program.projectId ?? "standalone"}-${program.id}`}
            program={program}
          />
        ))}
        {visibleItems.length < 4
          ? Array.from({ length: 4 - visibleItems.length }).map((_, index) => (
              <HostMiniProgramCardPlaceholder key={index} />
            ))
          : null}
        <Link
          className="grid h-[43px] w-[42px] shrink-0 place-items-center text-center text-[11px] font-black text-[#7C8794]"
          href={`/host?status=${encodeURIComponent(title)}`}
        >
          <span className="grid size-5 place-items-center rounded-full bg-[#FF9A3D] text-white">
            <Plus size={13} />
          </span>
          <span>전체보기</span>
        </Link>
      </div>
    </section>
  );
}

export function HostMiniProgramCard({
  actionLabel,
  program,
}: {
  actionLabel: string;
  program: HostProgramListItem;
}) {
  const href = program.projectId
    ? `/host/projects/${encodeURIComponent(program.projectId)}/programs/${encodeURIComponent(program.id)}`
    : `/host/programs/${encodeURIComponent(program.id)}`;

  return (
    <article className="h-[142px] w-[235px] shrink-0 rounded-[5px] border border-[#E5D8D0] bg-white p-[7px]">
      <Link className="grid h-full grid-cols-[64px_minmax(0,1fr)] gap-2" href={href}>
        <div className="relative h-[86px] w-[58px] overflow-hidden rounded-[2px] bg-[#D9D9D9]">
          {program.imageUrl ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="58px"
              src={program.imageUrl}
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-[11px] font-black leading-[15px] text-[#33241C]">
            프로그램 제목{" "}
            <span className="text-[#FE701E]">{program.id.slice(0, 6)}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-[10px] font-bold leading-[14px] text-[#6D7A8A]">
            {program.title}
          </p>
          <p className="mt-1 text-[10px] font-bold leading-[14px] text-[#33241C]">
            모집금액 : {program.applicationCount.toLocaleString("ko-KR")}명
          </p>
        </div>
        <div className="col-span-2 mt-auto flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-[#7C8794]">
            신청 {program.applicationCount}명 · 조회 {program.readiness}
          </span>
          <span className="inline-flex h-[24px] min-w-[44px] items-center justify-center rounded-[3px] border border-[#FF9A3D] px-2 text-[11px] font-black text-[#FE701E]">
            {actionLabel}
          </span>
        </div>
      </Link>
    </article>
  );
}

function HostMiniProgramCardPlaceholder() {
  return (
    <div className="h-[142px] w-[235px] shrink-0 rounded-[5px] border border-[#E5D8D0] bg-white p-[7px]">
      <div className="grid h-full grid-cols-[64px_minmax(0,1fr)] gap-2">
        <div className="h-[86px] w-[58px] rounded-[2px] bg-[#D9D9D9]" />
        <div>
          <div className="h-3 w-24 rounded bg-[#EEEAE7]" />
          <div className="mt-2 h-3 w-20 rounded bg-[#EEEAE7]" />
          <div className="mt-2 h-3 w-16 rounded bg-[#EEEAE7]" />
        </div>
        <div className="col-span-2 mt-auto flex justify-end">
          <span className="h-[24px] w-[44px] rounded-[3px] border border-[#FF9A3D]" />
        </div>
      </div>
    </div>
  );
}

export function HostFolderInsideHeader({
  count,
  createHref,
  title,
}: {
  count: number;
  createHref: string;
  title: string;
}) {
  return (
    <div className="flex h-5 w-full items-center">
      <Link
        aria-label="내 프로그램으로 돌아가기"
        className="mr-[0.972vw] inline-flex size-5 items-center justify-center text-[#FE701E]"
        href="/host"
      >
        <ChevronLeft size={18} />
      </Link>
      <h1 className="shrink-0 text-[14px] font-black leading-5 text-[#33241C]">
        {title} ({count})
      </h1>
      <div className="mx-[0.972vw] flex h-4 flex-1 items-center">
        <span className="h-px flex-1 bg-[#B6C0CA]" />
        <button
          aria-label="폴더 옵션"
          className="ml-2 inline-flex size-4 items-center justify-center rounded-full bg-[#FF9A3D] text-white"
          type="button"
        >
          <ChevronDown size={12} />
        </button>
      </div>
      <Link
        aria-label="새 프로그램"
        className="inline-flex size-4 items-center justify-center rounded-full bg-[#FF9A3D] text-white"
        href={createHref}
      >
        <ChevronRight size={12} />
      </Link>
    </div>
  );
}
