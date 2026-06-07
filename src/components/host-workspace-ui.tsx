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
import type { CSSProperties, ReactNode } from "react";
import { hostProjectPath, type HostProgramOverview } from "@/lib/host-projects";

const hostWorkspaceScaleStyle = {
  "--host-scale": "clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333)",
  "--host-3": "clamp(3px, 0.208vw, 4px)",
  "--host-4": "clamp(4px, 0.278vw, 5.333px)",
  "--host-6": "clamp(6px, 0.417vw, 8px)",
  "--host-7": "clamp(7px, 0.486vw, 9.333px)",
  "--host-8": "clamp(8px, 0.556vw, 10.667px)",
  "--host-10": "clamp(10px, 0.694vw, 13.333px)",
  "--host-12": "clamp(12px, 0.833vw, 16px)",
  "--host-14": "clamp(14px, 0.972vw, 18.667px)",
  "--host-16": "clamp(16px, 1.111vw, 21.333px)",
  "--host-18": "clamp(18px, 1.25vw, 24px)",
  "--host-20": "clamp(20px, 1.389vw, 26.667px)",
  "--host-21": "clamp(21px, 1.458vw, 28px)",
  "--host-22": "clamp(22px, 1.528vw, 29.333px)",
  "--host-23": "clamp(23px, 1.597vw, 30.667px)",
  "--host-24": "clamp(24px, 1.667vw, 32px)",
  "--host-27": "clamp(27px, 1.875vw, 36px)",
  "--host-29": "clamp(29px, 2.014vw, 38.667px)",
  "--host-30": "clamp(30px, 2.083vw, 40px)",
  "--host-32": "clamp(32px, 2.222vw, 42.667px)",
  "--host-34": "clamp(34px, 2.361vw, 45.333px)",
  "--host-37": "clamp(37px, 2.569vw, 49.333px)",
  "--host-40": "clamp(40px, 2.778vw, 53.333px)",
  "--host-42": "clamp(42px, 2.917vw, 56px)",
  "--host-58": "clamp(58px, 4.028vw, 77.333px)",
  "--host-69": "clamp(69px, 4.792vw, 92px)",
  "--host-82": "clamp(82px, 5.694vw, 109.333px)",
  "--host-86": "clamp(86px, 5.972vw, 114.667px)",
  "--host-110": "clamp(110px, 7.639vw, 146.667px)",
  "--host-133": "clamp(133px, 9.236vw, 177.333px)",
  "--host-135": "clamp(135px, 9.375vw, 180px)",
  "--host-142": "clamp(142px, 9.861vw, 189.333px)",
  "--host-176": "clamp(176px, 12.222vw, 234.667px)",
  "--host-216": "clamp(216px, 15vw, 288px)",
  "--host-219": "clamp(219px, 15.208vw, 292px)",
  "--host-228": "clamp(228px, 15.833vw, 304px)",
  "--host-235": "clamp(235px, 16.319vw, 313.333px)",
  "--host-264": "clamp(264px, 18.333vw, 352px)",
  "--host-270": "clamp(270px, 18.75vw, 360px)",
  "--host-288": "clamp(288px, 20vw, 384px)",
  "--host-351": "clamp(351px, 24.375vw, 468px)",
  "--host-457": "clamp(457px, 31.736vw, 609.333px)",
  "--host-567": "clamp(567px, 39.375vw, 756px)",
  "--host-603": "clamp(603px, 41.875vw, 804px)",
  "--host-1118": "clamp(1118px, 77.639vw, 1490.667px)",
} as CSSProperties;

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
    <main
      className="font-pretendard min-h-[calc(100vh-4.861vw)] bg-white text-[#33241C]"
      style={hostWorkspaceScaleStyle}
    >
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
      className={`w-[var(--host-228)] min-w-[228px] shrink-0 border-r border-[#6D7A8A] bg-white shadow-[2px_5px_5.2px_rgba(0,0,0,0.23)] ${sidebarHeight} max-md:w-full max-md:min-h-0 max-md:border-r-0 max-md:shadow-none`}
    >
      <div className="px-[0.417vw] max-md:px-5">
        <div className="w-[var(--host-216)] min-w-[216px] max-md:w-full">
          <section className="h-[5.972vw] min-h-[86px]">
            <div className="flex h-[2.778vw] min-h-10 items-center justify-center pb-[0.556vw] pt-[0.833vw]">
              <span className="w-[var(--host-176)] min-w-[176px] text-[var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
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
                className="flex h-[2.361vw] min-h-[34px] flex-1 items-center justify-center border-b-2 border-[#FF9A3D] pb-[0.556vw] pt-[0.347vw] text-[var(--host-14)] font-medium leading-[1.253] text-[#FE701E]"
                href="/host"
              >
                호스트
              </Link>
              <span className="mb-[0.417vw] h-[1.528vw] min-h-[22px] w-px bg-[#D9D9D9]" />
              <Link
                className="flex h-[2.361vw] min-h-[34px] flex-1 items-center justify-center py-[0.556vw] text-[var(--host-14)] font-normal leading-[1.253] text-[#CAC4BC] transition hover:text-[#FE701E]"
                href="/host/villages"
              >
                로컬
              </Link>
              <span className="mb-[0.417vw] h-[1.528vw] min-h-[22px] w-px bg-[#D9D9D9]" />
              <Link
                className="flex h-[2.361vw] min-h-[34px] flex-1 items-center justify-center py-[0.556vw] text-[var(--host-14)] font-normal leading-[1.253] text-[#CAC4BC] transition hover:text-[#FE701E]"
                href="/admin"
              >
                관리자
              </Link>
            </div>
          </section>

          <nav className="mt-[0.833vw] px-[0.833vw] text-[#5B3A29]">
            <section className="flex flex-col gap-[0.417vw]">
              <Link
                className="block w-full text-[var(--host-14)] font-semibold leading-[1.253]"
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
                  className={`text-[var(--host-14)] leading-[1.253] ${
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
                className="text-[var(--host-14)] font-normal leading-[1.253] text-[#5B3A29] hover:text-[#FE701E]"
                href="/host/forms"
              >
                신청서 양식
              </Link>
              <Link
                className="text-[var(--host-14)] font-normal leading-[1.253] text-[#5B3A29] hover:text-[#FE701E]"
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
      className={`block w-fit rounded-[4px] px-[0.556vw] py-[0.139vw] text-[var(--host-12)] leading-[1.253] transition ${
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
    <div className="flex h-[var(--host-29)] items-center gap-[var(--host-34)]">
      <h2 className="text-[var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
        {title}
      </h2>
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
        className="inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] bg-[#6D7A8A] px-[var(--host-12)] py-[var(--host-4)] text-[var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC] transition hover:bg-[#5F6B79]"
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <span className="inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] bg-[#6D7A8A] px-[var(--host-12)] py-[var(--host-4)] text-[var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC]">
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
      className="group block h-[var(--host-351)] w-[var(--host-288)] min-w-[288px] rounded-[8px] border border-[#D9D9D9] bg-white p-[var(--host-12)] transition hover:border-[#FE701E] max-md:h-auto max-md:w-full"
      href={hostProjectPath(folder.id)}
    >
      <div className="grid h-[var(--host-270)] w-full grid-cols-2 gap-[var(--host-6)]">
        {[0, 1, 2].map((index) => (
          <div
            className="relative overflow-hidden rounded-[16px] bg-[#D9D9D9]"
            key={index}
          >
            {previews[index]?.imageUrl ? (
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="(min-width: 1920px) 176px, 132px"
                src={previews[index].imageUrl}
              />
            ) : null}
          </div>
        ))}
        <div className="flex flex-col items-center justify-center gap-[var(--host-8)] rounded-[16px] bg-white">
          <span className="grid size-[var(--host-20)] place-items-center rounded-full bg-[#FF9A3D] text-white">
            <Plus className="size-[var(--host-14)]" strokeWidth={2.4} />
          </span>
          <span className="text-[var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]">
            전체보기
          </span>
        </div>
      </div>
      <div className="mt-[var(--host-10)] flex w-full flex-col gap-[var(--host-8)]">
        <p className="line-clamp-2 text-[var(--host-16)] font-normal leading-[1.253] text-[#5B3A29]">
          {folder.title}
        </p>
        <p className="text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
          저장된 프로그램 {programCount}개
        </p>
        <p className="text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
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
    <section className="h-[var(--host-219)] min-h-[219px]">
      <div className="flex h-[var(--host-18)] items-center gap-[var(--host-16)]">
        <h3 className="shrink-0 text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
          {title} ({String(items.length).padStart(2, "0")})
        </h3>
        <span className="h-px flex-1 bg-[#B6C0CA]" />
      </div>
      <div className="mt-[var(--host-37)] flex items-center gap-[var(--host-23)] max-md:mt-6 max-md:flex-wrap">
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
          className="flex h-[var(--host-42)] w-[var(--host-42)] shrink-0 flex-col items-center justify-center gap-[var(--host-8)] text-center text-[var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]"
          href={`/host?status=${encodeURIComponent(title)}`}
        >
          <span className="grid size-[var(--host-20)] place-items-center rounded-full bg-[#FF9A3D] text-white">
            <Plus className="size-[var(--host-14)]" strokeWidth={2.4} />
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
    <article className="h-[var(--host-142)] w-[var(--host-235)] shrink-0 rounded-[8px] border border-[#D9D9D9] bg-white p-[var(--host-12)]">
      <Link
        className="grid h-full grid-cols-[var(--host-69)_minmax(0,1fr)] gap-[var(--host-10)]"
        href={href}
      >
        <div className="relative h-[var(--host-82)] w-[var(--host-69)] overflow-hidden rounded-[6px] bg-[#D9D9D9]">
          {program.imageUrl ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(min-width: 1920px) 92px, 69px"
              src={program.imageUrl}
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-[var(--host-4)] text-[#0D0D0C]">
          <p className="truncate text-[var(--host-12)] font-normal leading-[1.253]">
            프로그램 제목{" "}
            <span className="text-[#FE701E]">{program.id.slice(0, 6)}</span>
          </p>
          <p className="line-clamp-1 text-[var(--host-14)] font-medium leading-[1.253]">
            {program.title}
          </p>
          <p className="truncate text-[var(--host-12)] font-normal leading-[1.253]">
            모집금액 : {program.applicationCount.toLocaleString("ko-KR")}명
          </p>
        </div>
        <div className="col-span-2 mt-auto flex items-center gap-[var(--host-6)] text-[var(--host-12)] font-normal leading-[1.253]">
          <span className="min-w-0 flex-1 truncate text-[#0D0D0C]">
            신청 {program.applicationCount}명 · 조회 {program.readiness}
          </span>
          <span className="inline-flex h-[var(--host-29)] shrink-0 items-center justify-center rounded-[4px] border-[0.8px] border-[#FE701E] bg-[#FCFCFC] px-[var(--host-18)] text-[var(--host-12)] font-normal leading-[1.253] text-[#FE701E]">
            {actionLabel}
          </span>
        </div>
      </Link>
    </article>
  );
}

function HostMiniProgramCardPlaceholder() {
  return (
    <div className="h-[var(--host-142)] w-[var(--host-235)] shrink-0 rounded-[8px] border border-[#D9D9D9] bg-white p-[var(--host-12)]">
      <div className="grid h-full grid-cols-[var(--host-69)_minmax(0,1fr)] gap-[var(--host-10)]">
        <div className="h-[var(--host-82)] w-[var(--host-69)] rounded-[6px] bg-[#D9D9D9]" />
        <div>
          <div className="h-3 w-24 rounded bg-[#EEEAE7]" />
          <div className="mt-2 h-3 w-20 rounded bg-[#EEEAE7]" />
          <div className="mt-2 h-3 w-16 rounded bg-[#EEEAE7]" />
        </div>
        <div className="col-span-2 mt-auto flex justify-end">
          <span className="h-[var(--host-29)] w-[var(--host-58)] rounded-[4px] border-[0.8px] border-[#FF9A3D]" />
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
    <div className="flex h-[var(--host-20)] w-full items-center gap-[0.972vw]">
      <Link
        aria-label="내 프로그램으로 돌아가기"
        className="inline-flex h-[var(--host-20)] w-[0.833vw] min-w-3 items-center justify-center text-[#6D7A8A] transition hover:text-[#FE701E]"
        href="/host"
      >
        <ChevronLeft className="size-[var(--host-18)]" strokeWidth={1.8} />
      </Link>
      <h1 className="shrink-0 text-[var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
        {title} ({count})
      </h1>
      <div className="flex flex-1 items-center justify-end" />
      <button
        aria-label={deleteActive ? "삭제 선택 취소" : "폴더에서 프로그램 제거"}
        className="inline-flex size-[var(--host-16)] min-h-4 min-w-4 items-center justify-center rounded-full bg-[#FF9A3D] text-white"
        onClick={onDelete}
        type="button"
      >
        <Minus className="size-[var(--host-10)]" strokeWidth={2.4} />
      </button>
      <button
        aria-label="폴더에 프로그램 추가"
        className="inline-flex size-[var(--host-16)] min-h-4 min-w-4 items-center justify-center rounded-full bg-[#FF9A3D] text-white"
        onClick={onAdd}
        type="button"
      >
        <Plus className="size-[var(--host-10)]" strokeWidth={2.4} />
      </button>
    </div>
  );
}
