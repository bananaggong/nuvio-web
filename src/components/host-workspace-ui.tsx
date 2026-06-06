"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  Minus,
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const messageView = searchParams.get("view");
  const onMessagesPage = pathname === "/host/messages";
  const ongoingMessagesActive = onMessagesPage && messageView !== "ended";
  const endedMessagesActive = onMessagesPage && messageView === "ended";

  return (
    <aside
      className={`w-[15.833vw] min-w-[228px] shrink-0 border-r border-[#6D7A8A] bg-white shadow-[2px_5px_5.2px_rgba(0,0,0,0.23)] ${sidebarHeight} max-md:w-full max-md:min-h-0 max-md:border-r-0 max-md:shadow-none`}
    >
      <div className="px-[0.417vw] max-md:px-5">
        <div className="w-[15vw] min-w-[216px] max-md:w-full">
          <section className="h-[5.972vw] min-h-[86px]">
            <div className="flex h-[2.778vw] min-h-10 items-center justify-center pb-[0.556vw] pt-[0.833vw]">
              <span className="w-[12.222vw] min-w-[176px] text-[16px] font-semibold leading-[1.253] text-[#5B3A29]">
                로컬 호스트님
              </span>
              <Bell
                size={20}
                strokeWidth={1.8}
                className="size-5 shrink-0 text-[#FF9A3D]"
              />
            </div>
            <div className="flex h-[3.194vw] min-h-[46px] items-end border-b border-[#D9D9D9] pt-[0.833vw] text-center">
              <Link
                className="flex h-[2.361vw] min-h-[34px] flex-1 items-center justify-center border-b-2 border-[#FF9A3D] pb-[0.556vw] pt-[0.347vw] text-[14px] font-medium leading-[1.253] text-[#FE701E]"
                href="/host"
              >
                호스트
              </Link>
              <span className="mb-[0.417vw] h-[1.528vw] min-h-[22px] w-px bg-[#D9D9D9]" />
              <Link
                className="flex h-[2.361vw] min-h-[34px] flex-1 items-center justify-center py-[0.556vw] text-[14px] font-normal leading-[1.253] text-[#CAC4BC] transition hover:text-[#FE701E]"
                href="/host/villages"
              >
                로컬
              </Link>
              <span className="mb-[0.417vw] h-[1.528vw] min-h-[22px] w-px bg-[#D9D9D9]" />
              <Link
                className="flex h-[2.361vw] min-h-[34px] flex-1 items-center justify-center py-[0.556vw] text-[14px] font-normal leading-[1.253] text-[#CAC4BC] transition hover:text-[#FE701E]"
                href="/admin"
              >
                관리자
              </Link>
            </div>
          </section>

          <nav className="mt-[0.833vw] px-[0.833vw] text-[#5B3A29]">
            <section className="flex flex-col gap-[0.417vw]">
              <Link
                className="block w-full text-[14px] font-semibold leading-[1.253]"
                href="/host"
              >
                내 프로그램
              </Link>
              <div className="flex w-full flex-col gap-[3px] border-b-[0.8px] border-[#6D7A8A] pb-[0.833vw] pl-[0.417vw]">
                <HostSidebarSubLink href="/host?status=open" label="오픈 프로그램" />
                <HostSidebarSubLink href="/host?status=upcoming" label="예정 프로그램" />
                <HostSidebarSubLink href="/host?status=closed" label="마감 프로그램" />
              </div>
            </section>
            <div className="mt-[0.903vw] grid gap-[0.903vw]">
              <section className="flex flex-col gap-[6px]">
                <p
                  className={`text-[14px] leading-[1.253] ${
                    onMessagesPage ? "font-semibold" : "font-normal"
                  }`}
                >
                  메세지
                </p>
                <div className="flex w-full flex-col gap-[3px] border-b-[0.8px] border-[#6D7A8A] pb-[0.833vw] pl-[0.417vw]">
                  <HostSidebarSubLink
                    active={ongoingMessagesActive}
                    href="/host/messages"
                    label="진행 중인 메세지"
                  />
                  <HostSidebarSubLink
                    active={endedMessagesActive}
                    href="/host/messages?view=ended"
                    label="종료된 메세지"
                  />
                </div>
              </section>
              <Link
                className="text-[14px] font-normal leading-[1.253] text-[#5B3A29] hover:text-[#FE701E]"
                href="/host/forms"
              >
                신청서 양식
              </Link>
              <Link
                className="text-[14px] font-normal leading-[1.253] text-[#5B3A29] hover:text-[#FE701E]"
                href="/host/settings"
              >
                설정
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
}

function HostSidebarSubLink({
  active = false,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`block w-fit rounded-[4px] px-[0.556vw] py-[0.139vw] text-[12px] leading-[1.253] transition ${
        active
          ? "bg-[#FF9A3D] font-semibold text-[#F9F9F9]"
          : "font-normal text-[#5B3A29] hover:text-[#FE701E]"
      }`}
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
          ? "pl-[1.944vw] pr-[3.611vw] max-md:px-5"
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
  deleteActive = false,
  onAdd,
  onDelete,
  title,
}: {
  count: number;
  deleteActive?: boolean;
  onAdd: () => void;
  onDelete: () => void;
  title: string;
}) {
  return (
    <div className="flex h-5 w-full items-center gap-[0.972vw]">
      <Link
        aria-label="내 프로그램으로 돌아가기"
        className="inline-flex h-5 w-[0.833vw] min-w-3 items-center justify-center text-[#6D7A8A] transition hover:text-[#FE701E]"
        href="/host"
      >
        <ChevronLeft size={18} strokeWidth={1.8} />
      </Link>
      <h1 className="shrink-0 text-[16px] font-medium leading-[1.253] text-[#6D7A8A]">
        {title} ({count})
      </h1>
      <div className="flex flex-1 items-center justify-end" />
      <button
        aria-label={deleteActive ? "삭제 선택 취소" : "폴더에서 프로그램 제거"}
        className="inline-flex size-[1.111vw] min-h-4 min-w-4 items-center justify-center rounded-full bg-[#FF9A3D] text-white"
        onClick={onDelete}
        type="button"
      >
        <Minus size={10} strokeWidth={2.4} />
      </button>
      <button
        aria-label="새 프로그램 만들기"
        className="inline-flex h-[29px] items-center justify-center gap-1 rounded-[4px] bg-[#7C8794] px-3 text-[12px] font-black leading-[1.253] text-white transition hover:bg-[#667482]"
        onClick={onAdd}
        type="button"
      >
        <Plus size={13} strokeWidth={2.4} />
        새 프로그램
      </button>
    </div>
  );
}
