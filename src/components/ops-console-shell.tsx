"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FilePlus2,
  FolderOpen,
  Home,
  Menu,
  MessageSquareText,
  Search,
  Settings,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";

type ConsoleArea = "host" | "admin";

type ChildItem = {
  href: string;
  name: string;
};

type NavigationItem = {
  children: ChildItem[];
  href: string;
  icon: LucideIcon;
  name: string;
};

const navigationByArea: Record<ConsoleArea, NavigationItem[]> = {
  host: [
    {
      name: "홈",
      href: "/host",
      icon: Home,
      children: [],
    },
    {
      name: "프로그램",
      href: "/host?status=open",
      icon: ClipboardList,
      children: [],
    },
    {
      name: "문의",
      href: "/host/messages",
      icon: MessageSquareText,
      children: [],
    },
    {
      name: "양식 저장",
      href: "/host/forms",
      icon: FilePlus2,
      children: [],
    },
    {
      name: "채널",
      href: "/host/channels/settings",
      icon: FolderOpen,
      children: [],
    },
    {
      name: "설정",
      href: "/host/settings",
      icon: Settings,
      children: [],
    },
  ],
  admin: [
    {
      name: "대시보드",
      href: "/admin",
      icon: Home,
      children: [],
    },
    {
      name: "캘린더",
      href: "/admin",
      icon: Calendar,
      children: [],
    },
    {
      name: "프로그램",
      href: "/host?status=open",
      icon: FolderOpen,
      children: [
        { name: "프로그램 검수", href: "/host?status=open" },
        { name: "공고 피드", href: "/announcements" },
      ],
    },
    {
      name: "회원",
      href: "/host/applications",
      icon: Users,
      children: [
        { name: "신청자 CRM", href: "/host/applications" },
        { name: "운영 문의", href: "/partners/apply" },
      ],
    },
    {
      name: "운영 검토",
      href: "/admin/reports",
      icon: BarChart3,
      children: [
        { name: "마감 검토", href: "/admin/reports" },
        { name: "구현 현황", href: "/admin/implementation" },
      ],
    },
    {
      name: "소식지",
      href: "/admin/magazine",
      icon: FilePlus2,
      children: [
        { name: "소식지 관리", href: "/admin/magazine" },
        { name: "새 글 작성", href: "/admin/magazine/new" },
      ],
    },
    {
      name: "채널 관리",
      href: "/host/channels/settings",
      icon: Settings,
      children: [
        { name: "호스트센터", href: "/host" },
        { name: "공개 홈", href: "/" },
      ],
    },
    {
      name: "관리자 전용",
      href: "/admin/implementation",
      icon: Settings,
      children: [
        { name: "PRD 구현 현황", href: "/admin/implementation" },
        { name: "감사 로그", href: "/admin/logs" },
        { name: "시스템 상태", href: "/admin/health" },
      ],
    },
  ],
};

const titleByArea: Record<ConsoleArea, string> = {
  host: "호스트센터",
  admin: "관리자 운영",
};

const headerTitleByArea: Record<ConsoleArea, string> = {
  host: "호스트센터",
  admin: "관리자 운영",
};

export function OpsConsoleShell({
  area,
  children,
}: {
  area: ConsoleArea;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentPath = search ? `${pathname}?${search}` : pathname;
  const [mobileOpen, setMobileOpen] = useState(false);
  const programBuilderPath = area === "host" ? getCurrentProgramBasePath(pathname) : undefined;
  const isProgramBuilderCreate =
    area === "host" &&
    (/^\/host\/programs\/new(?:\/|$)/u.test(pathname) ||
      /^\/host\/projects\/[^/]+\/programs\/new(?:\/|$)/u.test(pathname));
  const isHostWorkspacePage =
    area === "host" &&
    (pathname === "/host" ||
      pathname === "/host/forms" ||
      pathname.startsWith("/host/forms/") ||
      pathname === "/host/messages" ||
      pathname === "/host/programs" ||
      pathname.startsWith("/host/channels") ||
      pathname === "/host/settings" ||
      /^\/host\/projects\/[^/]+\/?$/u.test(pathname));

  if (programBuilderPath || isProgramBuilderCreate || isHostWorkspacePage) {
    return (
      <div className="min-h-screen bg-white text-[#33241C]">
        <SiteHeader />
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F9F9F9] text-[#0D0D0C]">
      <Sidebar area={area} currentPath={currentPath} pathname={pathname} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          area={area}
          mobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen((value) => !value)}
        />

        {mobileOpen ? (
          <div className="border-b border-[#F3E2D5] bg-white md:hidden">
            <SidebarContent
              area={area}
              currentPath={currentPath}
              onNavigate={() => setMobileOpen(false)}
              pathname={pathname}
            />
          </div>
        ) : null}

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function Header({
  area,
  mobileOpen,
  onToggleMobile,
}: {
  area: ConsoleArea;
  mobileOpen: boolean;
  onToggleMobile: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#F3E2D5] bg-white/95 shadow-[0_8px_24px_rgba(91,58,41,0.06)] backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-fit items-center gap-3">
          <button
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="inline-flex size-11 items-center justify-center rounded-md border border-[#F3E2D5] text-[#5B3A29] hover:border-[#FE701E] hover:text-[#FE701E] md:hidden"
            onClick={onToggleMobile}
            type="button"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link
            className="flex min-h-11 items-center gap-3 text-sm font-black text-[#5B3A29] hover:text-[#FE701E]"
            href={area === "host" ? "/host" : "/admin"}
          >
            <Image
              alt="누비오"
              className="h-[25px] w-auto"
              height={27}
              priority
              src="/brand/nuvio-wordmark.svg"
              width={81}
            />
            <span className="hidden border-l border-[#F3E2D5] pl-3 sm:inline">
              {headerTitleByArea[area]}
            </span>
          </Link>
        </div>

        <div className="hidden max-w-md flex-1 md:block">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#FF9A3D]" />
            <input
              className="w-full rounded-full border border-[#F3C3A5] bg-[#FFFDFB] py-2 pl-10 pr-4 text-sm font-semibold text-[#5B3A29] outline-none placeholder:text-[#A59A92] focus:border-[#FE701E] focus:ring-2 focus:ring-[#FE701E]/10"
              placeholder="프로그램, 문의, 양식 검색..."
              type="text"
            />
          </label>
        </div>

        <div className="flex min-w-fit items-center gap-2">
          <Link
            className="hidden rounded-md px-3 py-2 text-sm font-bold text-[#5B3A29] hover:bg-[#FFF6EC] hover:text-[#FE701E] lg:inline-flex"
            href={area === "host" ? "/admin" : "/host"}
          >
            {area === "host" ? "관리자 페이지" : "호스트센터"}
          </Link>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#F3E2D5] bg-[#FFFDFB] px-2 py-1.5 text-sm font-semibold text-[#5B3A29] hover:border-[#FE701E]"
            href="/mypage"
          >
            <span className="grid size-8 place-items-center rounded-full bg-[#FFF6EC] text-[#FE701E]">
              <UserRound size={17} />
            </span>
            <span className="hidden text-left md:block">
              <span className="block text-sm leading-none">로컬 호스트님</span>
              <span className="mt-1 block text-xs text-[#8B7A6E]">
                {area === "host" ? "호스트" : "관리자"}
              </span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Sidebar({
  area,
  currentPath,
  pathname,
}: {
  area: ConsoleArea;
  currentPath: string;
  pathname: string;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[#F3E2D5] bg-white md:flex">
      <SidebarContent area={area} currentPath={currentPath} pathname={pathname} />
    </aside>
  );
}

function SidebarContent({
  area,
  currentPath,
  pathname,
  onNavigate,
}: {
  area: ConsoleArea;
  currentPath: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const navigation = buildNavigation(area, pathname);
  const [expandedItems, setExpandedItems] = useState<string[]>(() =>
    navigation.map((item) => item.name),
  );

  function toggleExpanded(itemName: string) {
    setExpandedItems((current) =>
      current.includes(itemName)
        ? current.filter((name) => name !== itemName)
        : [...current, itemName],
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto pt-5">
      <div className="flex shrink-0 items-center px-4">
        <Link className="flex min-w-0 items-center gap-3" href={area === "host" ? "/host" : "/admin"}>
          <Image
            alt="누비오"
            className="h-[30px] w-auto shrink-0"
            height={37}
            priority
            src="/brand/nuvio-logo-combined.svg"
            width={120}
          />
          <span className="sr-only">{titleByArea[area]}</span>
        </Link>
      </div>

      <nav className="mt-5 flex-1 space-y-1 px-2 pb-6">
        {navigation.map((item) => (
          <NavigationGroup
            expanded={expandedItems.includes(item.name)}
            currentPath={currentPath}
            item={item}
            key={`${area}-${item.name}`}
            onNavigate={onNavigate}
            onToggle={() => toggleExpanded(item.name)}
          />
        ))}
      </nav>
    </div>
  );
}

function buildNavigation(area: ConsoleArea, pathname: string): NavigationItem[] {
  if (area !== "host") return navigationByArea[area];

  const programBasePath = getCurrentProgramBasePath(pathname);

  if (programBasePath) {
    return buildProgramNavigation(programBasePath);
  }

  return navigationByArea.host;
}

function buildProgramNavigation(programBasePath: string): NavigationItem[] {
  const programPanelHref = (panel: string) => `${programBasePath}?panel=${panel}`;
  const scopedHref = (path: string, panel?: string) =>
    `${programBasePath}${path}${panel ? `?panel=${panel}` : ""}`;

  return [
    {
      name: "대시보드",
      href: programBasePath,
      icon: BarChart3,
      children: [],
    },
    {
      name: "프로그램 설정",
      href: programPanelHref("basic"),
      icon: Settings,
      children: [
        { name: "기본정보", href: programPanelHref("basic") },
        { name: "상세 정보", href: programPanelHref("detail") },
        { name: "일정 안내", href: programPanelHref("schedule") },
        { name: "장소 정보", href: programPanelHref("place") },
        { name: "안내사항", href: programPanelHref("guide") },
        { name: "신청폼 작성", href: scopedHref("/forms") },
      ],
    },
    {
      name: "공지 / 문의 / 알림",
      href: scopedHref("/messages"),
      icon: MessageSquareText,
      children: [
        { name: "공지사항", href: scopedHref("/messages", "notice") },
        { name: "문의사항", href: scopedHref("/messages", "inquiry") },
        { name: "알림 안내 설정", href: scopedHref("/messages", "notification") },
      ],
    },
    {
      name: "신청자 관리",
      href: scopedHref("/applications"),
      icon: Users,
      children: [
        { name: "신청 경로 추적", href: scopedHref("/applications", "funnel") },
        { name: "관심도, 찜, 즐겨찾기 관련", href: scopedHref("/applications", "saved") },
        { name: "신청자 목록", href: scopedHref("/applications") },
        { name: "영수증 관리", href: scopedHref("/applications", "receipts") },
        ...(launchFeatureFlags.reviews
          ? [{ name: "후기 관리", href: scopedHref("/applications", "reviews") }]
          : []),
      ],
    },
    {
      name: "관리",
      href: programPanelHref("management"),
      icon: WalletCards,
      children: [
        { name: "호스트 알림 채널", href: "/host/settings?panel=notifications" },
        { name: "프로그램 관리", href: programPanelHref("management") },
        { name: "프로그램 취소 및 삭제", href: programPanelHref("delete") },
      ],
    },
  ];
}

function getCurrentProgramBasePath(pathname: string) {
  const projectProgramMatch = pathname.match(
    /^\/host\/projects\/[^/]+\/programs\/(?!new(?:\/|$))[^/]+/u,
  );
  if (projectProgramMatch) return projectProgramMatch[0];

  const standaloneProgramMatch = pathname.match(
    /^\/host\/programs\/(?!new(?:\/|$))[^/]+/u,
  );
  return standaloneProgramMatch?.[0];
}

function NavigationGroup({
  item,
  currentPath,
  expanded,
  onToggle,
  onNavigate,
}: {
  item: NavigationItem;
  currentPath: string;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const hasChildren = item.children.length > 0;
  const active = isActivePath(currentPath, item.href);
  const childActive = item.children.some((child) =>
    isActivePath(currentPath, child.href),
  );
  const activeGroup = active || childActive;

  if (!hasChildren) {
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={`group flex items-center rounded-md px-2 py-2 text-sm font-bold transition max-md:min-h-11 ${
          active
            ? "border-r-2 border-[#FE701E] bg-[#FFF6EC] text-[#FE701E]"
            : "text-[#5B3A29] hover:bg-[#FFF8F1] hover:text-[#FE701E]"
        }`}
        href={item.href}
        onClick={onNavigate}
      >
        <Icon
          className={`mr-3 size-5 shrink-0 ${
            active ? "text-[#FE701E]" : "text-[#A59A92] group-hover:text-[#FE701E]"
          }`}
        />
        <span className="flex-1">{item.name}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        aria-expanded={expanded}
        className={`group flex w-full items-center rounded-md px-2 py-2 text-left text-sm font-bold transition max-md:min-h-11 ${
          activeGroup
            ? "border-r-2 border-[#FE701E] bg-[#FFF6EC] text-[#FE701E]"
            : "text-[#5B3A29] hover:bg-[#FFF8F1] hover:text-[#FE701E]"
        }`}
        onClick={onToggle}
        type="button"
      >
        <Icon
          className={`mr-3 size-5 shrink-0 ${
            activeGroup
              ? "text-[#FE701E]"
              : "text-[#A59A92] group-hover:text-[#FE701E]"
          }`}
        />
        <span className="flex-1">{item.name}</span>
        {expanded ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </button>

      {expanded ? (
        <div className="ml-6 space-y-1">
          {item.children.map((child) => {
            const activeChild = isActivePath(currentPath, child.href);

            return (
              <Link
                aria-current={activeChild ? "page" : undefined}
                className={`flex rounded-md px-2 py-1.5 text-sm font-semibold transition max-md:min-h-11 max-md:items-center ${
                  activeChild
                    ? "bg-[#FFF6EC] text-[#FE701E]"
                    : "text-[#7D6F65] hover:bg-[#FFF8F1] hover:text-[#FE701E]"
                }`}
                href={child.href}
                key={`${item.name}-${child.name}`}
                onClick={onNavigate}
              >
                {child.name}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function isActivePath(currentPath: string, href: string) {
  const current = splitInternalHref(currentPath);
  const target = splitInternalHref(href);

  if (target.search) {
    return current.pathname === target.pathname && current.search === target.search;
  }

  if (target.pathname === "/") return current.pathname === "/";
  if (target.pathname === "/host") {
    return current.pathname === target.pathname;
  }
  if (target.pathname === "/admin") return current.pathname === target.pathname;

  return current.pathname === target.pathname || current.pathname.startsWith(`${target.pathname}/`);
}

function splitInternalHref(value: string) {
  const [withoutHash] = value.split("#");
  const [pathname = "/", search = ""] = withoutHash.split("?");

  return { pathname: pathname || "/", search };
}
