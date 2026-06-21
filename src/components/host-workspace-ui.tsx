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
import { formatProgramDisplayCode } from "@/lib/display-code";
import { hostProjectPath, type HostProgramOverview } from "@/lib/host-projects";

const hostWorkspaceScaleStyle = {
  "--host-scale": "clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333)",
  "--host-3": "clamp(3px, 0.208vw, 4px)",
  "--host-4": "clamp(4px, 0.278vw, 5.333px)",
  "--host-5": "clamp(5px, 0.347vw, 6.667px)",
  "--host-6": "clamp(6px, 0.417vw, 8px)",
  "--host-7": "clamp(7px, 0.486vw, 9.333px)",
  "--host-8": "clamp(8px, 0.556vw, 10.667px)",
  "--host-9": "clamp(9px, 0.625vw, 12px)",
  "--host-10": "clamp(10px, 0.694vw, 13.333px)",
  "--host-11": "clamp(11px, 0.764vw, 14.667px)",
  "--host-12": "clamp(12px, 0.833vw, 16px)",
  "--host-13": "clamp(13px, 0.903vw, 17.333px)",
  "--host-14": "clamp(14px, 0.972vw, 18.667px)",
  "--host-15": "clamp(15px, 1.042vw, 20px)",
  "--host-16": "clamp(16px, 1.111vw, 21.333px)",
  "--host-17": "clamp(17px, 1.181vw, 22.667px)",
  "--host-18": "clamp(18px, 1.25vw, 24px)",
  "--host-19": "clamp(19px, 1.319vw, 25.333px)",
  "--host-20": "clamp(20px, 1.389vw, 26.667px)",
  "--host-21": "clamp(21px, 1.458vw, 28px)",
  "--host-22": "clamp(22px, 1.528vw, 29.333px)",
  "--host-23": "clamp(23px, 1.597vw, 30.667px)",
  "--host-24": "clamp(24px, 1.667vw, 32px)",
  "--host-25": "clamp(25px, 1.736vw, 33.333px)",
  "--host-27": "clamp(27px, 1.875vw, 36px)",
  "--host-28": "clamp(28px, 1.944vw, 37.333px)",
  "--host-29": "clamp(29px, 2.014vw, 38.667px)",
  "--host-30": "clamp(30px, 2.083vw, 40px)",
  "--host-31": "clamp(31px, 2.153vw, 41.333px)",
  "--host-32": "clamp(32px, 2.222vw, 42.667px)",
  "--host-33": "clamp(33px, 2.292vw, 44px)",
  "--host-34": "clamp(34px, 2.361vw, 45.333px)",
  "--host-35": "clamp(35px, 2.431vw, 46.667px)",
  "--host-36": "clamp(36px, 2.5vw, 48px)",
  "--host-37": "clamp(37px, 2.569vw, 49.333px)",
  "--host-38": "clamp(38px, 2.639vw, 50.667px)",
  "--host-40": "clamp(40px, 2.778vw, 53.333px)",
  "--host-42": "clamp(42px, 2.917vw, 56px)",
  "--host-44": "clamp(44px, 3.056vw, 58.667px)",
  "--host-45": "clamp(45px, 3.125vw, 60px)",
  "--host-46": "clamp(46px, 3.194vw, 61.333px)",
  "--host-48": "clamp(48px, 3.333vw, 64px)",
  "--host-50": "clamp(50px, 3.472vw, 66.667px)",
  "--host-52": "clamp(52px, 3.611vw, 69.333px)",
  "--host-56": "clamp(56px, 3.889vw, 74.667px)",
  "--host-58": "clamp(58px, 4.028vw, 77.333px)",
  "--host-66": "clamp(66px, 4.583vw, 88px)",
  "--host-69": "clamp(69px, 4.792vw, 92px)",
  "--host-70": "clamp(70px, 4.861vw, 93.333px)",
  "--host-71": "clamp(71px, 4.931vw, 94.667px)",
  "--host-77": "clamp(77px, 5.347vw, 102.667px)",
  "--host-82": "clamp(82px, 5.694vw, 109.333px)",
  "--host-86": "clamp(86px, 5.972vw, 114.667px)",
  "--host-87": "clamp(87px, 6.042vw, 116px)",
  "--host-90": "clamp(90px, 6.25vw, 120px)",
  "--host-93": "clamp(93px, 6.458vw, 124px)",
  "--host-105": "clamp(105px, 7.292vw, 140px)",
  "--host-110": "clamp(110px, 7.639vw, 146.667px)",
  "--host-133": "clamp(133px, 9.236vw, 177.333px)",
  "--host-135": "clamp(135px, 9.375vw, 180px)",
  "--host-142": "clamp(142px, 9.861vw, 189.333px)",
  "--host-150": "clamp(150px, 10.417vw, 200px)",
  "--host-166": "clamp(166px, 11.528vw, 221.333px)",
  "--host-176": "clamp(176px, 12.222vw, 234.667px)",
  "--host-179": "clamp(179px, 12.431vw, 238.667px)",
  "--host-188": "clamp(188px, 13.056vw, 250.667px)",
  "--host-194": "clamp(194px, 13.472vw, 258.667px)",
  "--host-216": "clamp(216px, 15vw, 288px)",
  "--host-219": "clamp(219px, 15.208vw, 292px)",
  "--host-222": "clamp(222px, 15.417vw, 296px)",
  "--host-228": "clamp(228px, 15.833vw, 304px)",
  "--host-235": "clamp(235px, 16.319vw, 313.333px)",
  "--host-243": "clamp(243px, 16.875vw, 324px)",
  "--host-245": "clamp(245px, 17.014vw, 326.667px)",
  "--host-254": "clamp(254px, 17.639vw, 338.667px)",
  "--host-264": "clamp(264px, 18.333vw, 352px)",
  "--host-270": "clamp(270px, 18.75vw, 360px)",
  "--host-281": "clamp(281px, 19.514vw, 374.667px)",
  "--host-288": "clamp(288px, 20vw, 384px)",
  "--host-351": "clamp(351px, 24.375vw, 468px)",
  "--host-354": "clamp(354px, 24.583vw, 472px)",
  "--host-386": "clamp(386px, 26.806vw, 514.667px)",
  "--host-427": "clamp(427px, 29.653vw, 569.333px)",
  "--host-457": "clamp(457px, 31.736vw, 609.333px)",
  "--host-509": "clamp(509px, 35.347vw, 678.667px)",
  "--host-511": "clamp(511px, 35.486vw, 681.333px)",
  "--host-514": "clamp(514px, 35.694vw, 685.333px)",
  "--host-521": "clamp(521px, 36.181vw, 694.667px)",
  "--host-546": "clamp(546px, 37.917vw, 728px)",
  "--host-547": "clamp(547px, 37.986vw, 729.333px)",
  "--host-557": "clamp(557px, 38.681vw, 742.667px)",
  "--host-567": "clamp(567px, 39.375vw, 756px)",
  "--host-577": "clamp(577px, 40.069vw, 769.333px)",
  "--host-603": "clamp(603px, 41.875vw, 804px)",
  "--host-782": "clamp(782px, 54.306vw, 1042.667px)",
  "--host-959": "clamp(959px, 66.597vw, 1278.667px)",
  "--host-1118": "clamp(1118px, 77.639vw, 1490.667px)",
  "--host-1158": "clamp(1158px, 80.417vw, 1544px)",
  "--host-1261": "clamp(1261px, 87.569vw, 1681.333px)",
  "--host-1794": "clamp(1794px, 124.583vw, 2392px)",
  "--host-1864": "clamp(1864px, 129.444vw, 2485.333px)",
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
  const messagePanel = searchParams.get("panel");
  const messageStatus = searchParams.get("status");
  const messageView = searchParams.get("view");
  const activeWorkspaceTab = pathname.startsWith("/host/channels")
    ? "channel"
    : "host";
  const onMessagesPage = pathname === "/host/messages";
  const onFormsPage = pathname === "/host/forms" || pathname.startsWith("/host/forms/");
  const onSettingsPage = pathname === "/host/settings";
  const endedMessagesRequested =
    messageView === "ended" ||
    messageStatus === "ended" ||
    messageStatus === "end" ||
    messagePanel === "ended" ||
    messagePanel === "end";
  const ongoingMessagesActive = onMessagesPage && !endedMessagesRequested;
  const endedMessagesActive = onMessagesPage && endedMessagesRequested;

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
              <HostWorkspaceSwitchTab
                active={activeWorkspaceTab === "host"}
                href="/host"
                label="호스트"
              />
              <span className="mb-[0.417vw] h-[1.528vw] min-h-[22px] w-px bg-[#D9D9D9]" />
              <HostWorkspaceSwitchTab
                active={activeWorkspaceTab === "channel"}
                href="/host/channels/settings"
                label="채널"
              />
              <span className="mb-[0.417vw] h-[1.528vw] min-h-[22px] w-px bg-[#D9D9D9]" />
              <HostWorkspaceSwitchTab href="/admin" label="관리자" />
            </div>
          </section>

          {activeWorkspaceTab === "channel" ? (
            <HostChannelSidebarNav pathname={pathname} />
          ) : (
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
                <HostSidebarRootLink
                  active={onFormsPage}
                  href="/host/forms"
                  label="신청서 양식"
                />
                <HostSidebarRootLink
                  active={onSettingsPage}
                  href="/host/settings"
                  label="설정"
                />
              </div>
            </nav>
          )}
        </div>
      </div>
    </aside>
  );
}

function HostWorkspaceSwitchTab({
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
      className={`flex h-[2.361vw] min-h-[34px] flex-1 items-center justify-center pb-[0.556vw] pt-[0.347vw] text-[var(--host-14)] leading-[1.253] transition ${
        active
          ? "border-b-2 border-[#FF9A3D] font-medium text-[#FE701E]"
          : "font-normal text-[#CAC4BC] hover:text-[#FE701E]"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

const channelSidebarItems = [
  { href: "/host/channels", label: "채널 홈" },
  { href: "/host/channels/programs", label: "프로그램" },
  { href: "/host/channels/reviews", label: "후기" },
  { href: "/host/channels/galleries", label: "갤러리함" },
  { href: "/host/channels/magazines", label: "매거진함" },
  { href: "/host/channels/boards", label: "게시판함" },
  { href: "/host/channels/free", label: "자유함" },
  { href: "/host/channels/menu", label: "+메뉴 설정", muted: true },
];

function HostChannelSidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="mt-[0.833vw] px-[0.833vw] text-[#5B3A29]">
      <section className="flex flex-col gap-[0.556vw] border-b-[0.8px] border-[#6D7A8A] pb-[0.833vw]">
        {channelSidebarItems.map((item) => (
          <HostSidebarRootLink
            active={pathname === item.href}
            href={item.href}
            key={item.href}
            label={item.label}
            muted={item.muted}
          />
        ))}
      </section>
      <div className="mt-[0.903vw]">
        <HostSidebarRootLink
          active={pathname === "/host/channels/settings"}
          href="/host/channels/settings"
          label="채널 설정"
        />
      </div>
    </nav>
  );
}

function HostSidebarRootLink({
  active = false,
  href,
  label,
  muted = false,
}: {
  active?: boolean;
  href: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <Link
      className={`block w-fit rounded-[4px] py-[0.139vw] text-[var(--host-14)] leading-[1.253] transition ${
        active
          ? `${muted ? "text-[#FE701E]" : "text-[#5B3A29]"} font-semibold`
          : `${muted ? "text-[var(--host-12)] text-[#8B7A6E]" : "text-[#5B3A29]"} font-normal hover:text-[#FE701E]`
      }`}
      href={href}
    >
      {label}
    </Link>
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
      <h2
        className="text-[var(--host-16)] font-medium leading-[1.253] text-[#6d7a8a]"
        style={{ color: "#6D7A8A" }}
      >
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
        className="inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] bg-[#6d7a8a] px-[var(--host-12)] py-[var(--host-4)] text-[var(--host-12)] font-medium leading-[1.253] text-[#fff6ec] transition hover:bg-[#5f6b79]"
        onClick={onClick}
        style={{ backgroundColor: "#6D7A8A", color: "#FFF6EC" }}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <span
      className="inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] bg-[#6d7a8a] px-[var(--host-12)] py-[var(--host-4)] text-[var(--host-12)] font-medium leading-[1.253] text-[#fff6ec]"
      style={{ backgroundColor: "#6D7A8A", color: "#FFF6EC" }}
    >
      {children}
    </span>
  );
}

export function HostFolderCard({
  folder,
  programCount,
  programs,
}: {
  folder: { id: string; title: string };
  programCount: number;
  programs: HostProgramListItem[];
}) {
  const previews = programs.slice(0, 3);

  return (
    <article className="block h-[var(--host-351)] w-[var(--host-288)] min-w-[288px] rounded-[8px] border border-[#D9D9D9] bg-white p-[var(--host-12)] transition max-md:h-auto max-md:w-full">
      <div className="grid h-[var(--host-270)] w-full grid-cols-2 grid-rows-[repeat(2,minmax(0,1fr))] gap-[var(--host-6)]">
        {[0, 1, 2].map((index) => {
          const preview = previews[index];

          if (!preview) {
            return (
              <div
                className="relative overflow-hidden rounded-[16px] bg-[#D9D9D9]"
                key={index}
              />
            );
          }

          return (
            <Link
              aria-label={`${preview.title} 프로그램으로 이동`}
              className="relative overflow-hidden rounded-[16px] bg-[#D9D9D9] transition hover:ring-2 hover:ring-[#FE701E] hover:ring-offset-1"
              href={hostProgramHref(preview)}
              key={preview.id}
            >
              {preview.imageUrl ? (
                <Image
                  alt=""
                  className="object-cover transition duration-200 hover:scale-[1.03]"
                  fill
                  sizes="(min-width: 1920px) 176px, 132px"
                  src={preview.imageUrl}
                />
              ) : null}
            </Link>
          );
        })}
        <Link
          aria-label={`${folder.title} 폴더 전체보기`}
          className="group/view flex flex-col items-center justify-center gap-[var(--host-8)] rounded-[16px] bg-white transition hover:text-[#FE701E]"
          href={hostProjectPath(folder.id)}
        >
          <span className="grid size-[var(--host-20)] place-items-center rounded-full bg-[#FF9A3D] text-white">
            <Plus className="size-[var(--host-14)]" strokeWidth={2.4} />
          </span>
          <span className="text-[var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A] transition group-hover/view:text-[#FE701E]">
            전체보기
          </span>
        </Link>
      </div>
      <div className="mt-[var(--host-10)] flex w-full flex-col gap-[var(--host-8)]">
        <p className="text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
          저장된 프로그램 ({String(programCount).padStart(2, "0")})
        </p>
        <p className="line-clamp-2 text-[var(--host-16)] font-normal leading-[1.253] text-[#5B3A29]">
          {folder.title}
        </p>
      </div>
    </article>
  );
}

export function HostFolderPlaceholderCard({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      className="group block h-[var(--host-351)] w-[var(--host-288)] min-w-[288px] rounded-[8px] border border-[#D9D9D9] bg-white p-[var(--host-12)] text-left transition hover:border-[#FE701E] max-md:h-auto max-md:w-full"
      onClick={onClick}
      type="button"
    >
      <div className="grid h-[var(--host-270)] w-full grid-cols-2 grid-rows-[repeat(2,minmax(0,1fr))] gap-[var(--host-6)]">
        {[0, 1, 2].map((index) => (
          <div
            className="relative overflow-hidden rounded-[16px] bg-[#D9D9D9]"
            key={index}
          />
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
        <p className="text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
          저장된 프로그램 (00)
        </p>
        <p className="text-[var(--host-16)] font-normal leading-[1.253] text-[#5B3A29]">
          폴더명
        </p>
      </div>
    </button>
  );
}

export function HostProgramRow({
  actionLabel,
  expanded = false,
  statusFilter,
  items,
  title,
}: {
  actionLabel: string;
  expanded?: boolean;
  statusFilter: string;
  items: HostProgramListItem[];
  title: string;
}) {
  const visibleItems = expanded ? items : items.slice(0, 4);

  return (
    <section
      className={
        expanded
          ? "min-h-[var(--host-219)] pb-[var(--host-16)]"
          : "h-[var(--host-219)] min-h-[219px]"
      }
    >
      <div className="flex h-[var(--host-18)] items-center gap-[var(--host-16)]">
        <h3 className="shrink-0 text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
          {title} ({String(items.length).padStart(2, "0")})
        </h3>
        <span className="h-px flex-1 bg-[#B6C0CA]" />
      </div>
      <div
        className={`mt-[var(--host-37)] flex items-center gap-[var(--host-23)] max-md:mt-6 max-md:flex-wrap ${
          expanded ? "flex-wrap" : ""
        }`}
      >
        {visibleItems.map((program) => (
          <HostMiniProgramCard
            actionLabel={actionLabel}
            key={`${program.projectId ?? "standalone"}-${program.id}`}
            program={program}
          />
        ))}
        {!expanded && visibleItems.length < 4
          ? Array.from({ length: 4 - visibleItems.length }).map((_, index) => (
              <HostMiniProgramCardPlaceholder key={index} />
            ))
          : null}
        {!expanded ? (
          <Link
            className="flex h-[var(--host-42)] w-[var(--host-42)] shrink-0 flex-col items-center justify-center gap-[var(--host-8)] text-center text-[var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]"
            href={`/host?status=${encodeURIComponent(statusFilter)}`}
          >
            <span className="grid size-[var(--host-20)] place-items-center rounded-full bg-[#FF9A3D] text-white">
              <Plus className="size-[var(--host-14)]" strokeWidth={2.4} />
            </span>
            <span>전체보기</span>
          </Link>
        ) : null}
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
  const href = hostProgramHref(program);

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
            프로그램 코드{" "}
            <span className="text-[#FE701E]">{formatProgramDisplayCode(program.id)}</span>
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

function hostProgramHref(program: HostProgramListItem): string {
  return program.projectId
    ? `/host/projects/${encodeURIComponent(program.projectId)}/programs/${encodeURIComponent(program.id)}`
    : `/host/programs/${encodeURIComponent(program.id)}`;
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
