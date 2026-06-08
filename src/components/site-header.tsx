"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  CalendarDays,
  Menu,
  MessageCircle,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";

const navItems = [
  { href: "/magazine", label: "매거진", match: ["/magazine"] },
  { href: "/villages", label: "채널", match: ["/villages"] },
];

type HeaderSession =
  | {
      profile: {
        displayName?: string | null;
        email?: string | null;
      } | null;
      user: {
        email?: string | null;
        id: string;
      } | null;
    }
  | "loading";

type SessionPayload = {
  data?: Exclude<HeaderSession, "loading">;
  error?: string;
};

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<HeaderSession>("loading");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const signedIn = session !== "loading" && Boolean(session.user);
  const isHostRoute = pathname === "/host" || pathname.startsWith("/host/");
  const isMypageRoute = pathname === "/mypage" || pathname.startsWith("/mypage/");
  const showAccountActions = signedIn || isHostRoute || isMypageRoute;
  const profileName =
    session !== "loading"
      ? session.profile?.displayName?.trim() ||
        session.user?.email?.split("@")[0] ||
        "닉네임"
      : "닉네임";

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const payload = (await response.json()) as SessionPayload;

        if (active) {
          setSession(payload.data ?? { profile: null, user: null });
        }
      } catch {
        if (active) setSession({ profile: null, user: null });
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !profileMenuRef.current?.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [profileMenuOpen]);

  async function logoutFromHeader() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="font-pretendard sticky top-0 z-50 h-[4.861vw] min-h-[56px] border-b border-[#f1e7df] bg-white">
      <div className="mx-auto flex h-full w-full items-center px-[2.083vw] min-[1440px]:px-[2.083vw]">
        <Link
          aria-label="누비오 홈"
          className="flex min-w-fit items-center"
          href="/"
          onClick={() => setOpen(false)}
        >
          <Image
            alt="누비오"
            className="h-[1.875vw] min-h-[22px] w-[5.594vw] min-w-[66px]"
            height={27}
            priority
            src="/brand/nuvio-wordmark.svg"
            width={81}
          />
        </Link>

        <div className="ml-auto hidden items-center gap-[1.458vw] md:flex">
          <Link
            className="inline-flex h-[2.292vw] min-h-[29px] w-[16.111vw] min-w-[196px] items-center gap-[0.486vw] rounded-full border border-[#FF9A3D] bg-white px-[0.694vw] text-[0.833vw] font-semibold leading-none text-[#6D7A8A] transition-colors hover:bg-[#fff8f1]"
            href="/search"
          >
            <Search
              aria-hidden="true"
              className="size-[0.903vw] min-h-[11px] min-w-[11px] text-[#FF9A3D]"
              strokeWidth={2}
            />
            새로운 여행을 떠나볼까요?
          </Link>

          <nav className="flex items-center gap-[1.181vw]">
            {navItems.map((item) => (
              <HeaderLink item={item} key={item.href} pathname={pathname} />
            ))}
          </nav>

          <DesktopAuthAction
            loading={session === "loading"}
            menuOpen={profileMenuOpen}
            menuRef={profileMenuRef}
            onLogout={logoutFromHeader}
            onToggleMenu={() => setProfileMenuOpen((value) => !value)}
            profileName={profileName}
            showAccountActions={showAccountActions}
            signedIn={signedIn}
          />
        </div>

        <button
          aria-expanded={open}
          aria-label="메뉴 열기"
          className="ml-auto inline-flex size-10 items-center justify-center rounded-[8px] border border-[#FF9A3D] text-[#FF9A3D] md:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#f1e7df] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(91,58,41,0.08)] md:hidden">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-2">
            <Link
              className="mb-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#FF9A3D] px-3 text-[12px] font-semibold text-[#6D7A8A]"
              href="/search"
              onClick={() => setOpen(false)}
            >
              <Search
                aria-hidden="true"
                className="size-[13px] text-[#FF9A3D]"
                strokeWidth={2}
              />
              새로운 여행을 떠나볼까요?
            </Link>
            {navItems.map((item) => (
              <MobileLink
                item={item}
                key={item.href}
                onSelect={() => setOpen(false)}
                pathname={pathname}
              />
            ))}
            <MobileAuthAction
              loading={session === "loading"}
              onSelect={() => setOpen(false)}
              showAccountActions={showAccountActions}
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}

function DesktopAuthAction({
  loading,
  menuOpen,
  menuRef,
  onLogout,
  onToggleMenu,
  profileName,
  showAccountActions,
  signedIn,
}: {
  loading: boolean;
  menuOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onLogout: () => void;
  onToggleMenu: () => void;
  profileName: string;
  showAccountActions: boolean;
  signedIn: boolean;
}) {
  if (loading && !showAccountActions) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-[2.5vw] min-h-[30px] w-[2.153vw] min-w-[26px]"
      />
    );
  }

  if (showAccountActions) {
    return (
      <div
        className="relative flex h-[2.5vw] min-h-[30px] items-center gap-[1.111vw]"
        ref={menuRef}
      >
        <span
          aria-hidden="true"
          className="h-[1.736vw] min-h-[25px] w-px bg-[#F7B267]"
        />
        <Link
          aria-label="알림"
          className="inline-flex size-[2.153vw] min-h-[26px] min-w-[26px] items-center justify-center transition-opacity hover:opacity-75"
          href="/mypage"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="size-[1.389vw] min-h-[20px] min-w-[20px]"
            height={21}
            src={nuvioIcons.bell}
            width={20}
          />
        </Link>
        <button
          aria-expanded={menuOpen}
          aria-label="마이페이지 메뉴"
          className="inline-flex size-[2.153vw] min-h-[26px] min-w-[26px] items-center justify-center transition-opacity hover:opacity-75"
          onClick={onToggleMenu}
          type="button"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="size-[1.458vw] min-h-[21px] min-w-[21px]"
            height={21}
            src={nuvioIcons.user}
            width={21}
          />
        </button>
        {menuOpen ? (
          <ProfileMenu
            onLogout={onLogout}
            profileName={profileName}
            signedIn={signedIn}
          />
        ) : null}
      </div>
    );
  }

  return (
    <Link
      aria-label="로그인"
      className="inline-flex h-[2.5vw] min-h-[30px] w-[2.153vw] min-w-[26px] items-center justify-center"
      href="/login"
    >
      <Image
        alt=""
        aria-hidden="true"
        className="h-full w-full"
        height={36}
        src={nuvioIcons.headerActionFrame}
        width={31}
      />
    </Link>
  );
}

function ProfileMenu({
  onLogout,
  profileName,
  signedIn,
}: {
  onLogout: () => void;
  profileName: string;
  signedIn: boolean;
}) {
  return (
    <div className="absolute right-0 top-[calc(100%+0.833vw)] z-[70] w-[14.722vw] min-w-[212px] rounded-[0.417vw] bg-[#F3F3F3] px-[1.319vw] py-[0.833vw] shadow-[0_18px_42px_rgba(91,58,41,0.12)] ring-1 ring-[#F5E1D3]">
      <div className="flex items-center justify-between gap-[0.833vw]">
        <div className="flex min-w-0 flex-col items-center gap-[0.278vw]">
          <span
            aria-hidden="true"
            className="size-[1.944vw] min-h-[28px] min-w-[28px] rounded-full bg-[#D9D9D9]"
          />
          <span className="max-w-[4.861vw] truncate text-[0.694vw] font-normal leading-[1.253] text-[#6D7A8A] max-[1100px]:text-[10px]">
            {profileName}
          </span>
        </div>
        <Link
          className="inline-flex h-[1.736vw] min-h-[25px] items-center justify-center rounded-[0.278vw] border border-[#D9D9D9] bg-[#F9F9F9] px-[0.833vw] text-[0.694vw] font-medium leading-[1.253] text-[#6D7A8A] transition-colors hover:border-[#FF9A3D] hover:text-[#FF9A3D] max-[1100px]:text-[10px]"
          href={signedIn ? "/mypage" : "/login?next=/mypage"}
        >
          마이페이지
        </Link>
      </div>

      <div className="mt-[1.111vw] grid grid-cols-3 gap-[0.972vw]">
        <ProfileMenuMetric icon={CalendarDays} label="내 여행" />
        <ProfileMenuMetric icon={Bookmark} label="저장" />
        <ProfileMenuMetric icon={MessageCircle} label="메시지" />
      </div>

      <div className="mt-[1.111vw] flex items-center justify-between text-[0.833vw] leading-[1.253] max-[1100px]:text-xs">
        <span className="font-medium text-[#7A8B52]">포인트</span>
        <span className="font-semibold text-[#FF9A3D]">0 P</span>
        {launchFeatureFlags.coupons ? (
          <>
            <span className="h-[1.563vw] min-h-[22px] w-px bg-[#7A8B52]" />
            <span className="font-medium text-[#7A8B52]">쿠폰</span>
            <span className="font-semibold text-[#FF9A3D]">0 개</span>
          </>
        ) : null}
      </div>

      <div className="mt-[1.111vw] flex items-center justify-between">
        <button
          className="text-[0.833vw] font-normal leading-[1.6] text-[#CAC4BC] transition-colors hover:text-[#FF9A3D] max-[1100px]:text-xs"
          onClick={onLogout}
          type="button"
        >
          로그아웃
        </button>
        <Link
          aria-label="설정"
          className="inline-flex size-[1.458vw] min-h-[21px] min-w-[21px] items-center justify-center text-[#CAC4BC] transition-colors hover:text-[#FF9A3D]"
          href="/mypage"
        >
          <Settings aria-hidden="true" size={17} strokeWidth={1.8} />
        </Link>
      </div>
    </div>
  );
}

function ProfileMenuMetric({
  icon: Icon,
  label,
}: {
  icon: typeof CalendarDays;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-[0.278vw] text-center">
      <Icon
        aria-hidden="true"
        className="size-[1.181vw] min-h-[16px] min-w-[16px] text-[#7A8B52]"
        strokeWidth={1.8}
      />
      <span className="whitespace-nowrap text-[0.596vw] font-medium leading-[1.253] text-[#7A8B52] max-[1100px]:text-[8.5px]">
        {label}
      </span>
    </div>
  );
}

function HeaderLink({
  item,
  pathname,
}: {
  item: { href: string; label: string; match: string[] };
  pathname: string;
}) {
  const active = isActive(item, pathname);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`text-[1.111vw] font-semibold leading-none transition-colors hover:text-[#FF9A3D] ${
        active ? "text-[#FF9A3D]" : "text-[#5B3A29]"
      }`}
      href={item.href}
    >
      {item.label}
    </Link>
  );
}

function MobileAuthAction({
  loading,
  onSelect,
  showAccountActions,
}: {
  loading: boolean;
  onSelect: () => void;
  showAccountActions: boolean;
}) {
  if (loading && !showAccountActions) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex min-h-12 rounded-[8px] px-3"
      />
    );
  }

  if (showAccountActions) {
    return (
      <Link
        className="inline-flex min-h-12 items-center justify-between rounded-[8px] px-3 text-sm font-semibold text-[#5B3A29] hover:bg-[#fff8f1]"
        href="/mypage"
        onClick={onSelect}
      >
        마이페이지
        <span className="grid size-9 place-items-center rounded-full border border-[#FF9A3D] text-[#FF9A3D]">
          <Image
            alt=""
            aria-hidden="true"
            className="size-[21px]"
            height={21}
            src={nuvioIcons.user}
            width={21}
          />
        </span>
      </Link>
    );
  }

  return (
    <Link
      className="inline-flex min-h-12 items-center justify-between rounded-[8px] px-3 text-sm font-semibold text-[#5B3A29] hover:bg-[#fff8f1]"
      href="/login"
      onClick={onSelect}
    >
      로그인
      <Image
        alt=""
        aria-hidden="true"
        className="h-[36px] w-[31px]"
        height={36}
        src={nuvioIcons.headerActionFrame}
        width={31}
      />
    </Link>
  );
}

function MobileLink({
  item,
  onSelect,
  pathname,
}: {
  item: { href: string; label: string; match: string[] };
  onSelect: () => void;
  pathname: string;
}) {
  const active = isActive(item, pathname);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 items-center justify-between rounded-[8px] px-3 text-sm font-semibold hover:bg-[#fff8f1] ${
        active ? "text-[#FF9A3D]" : "text-[#5B3A29]"
      }`}
      href={item.href}
      onClick={onSelect}
    >
      {item.label}
    </Link>
  );
}

function isActive(
  item: { href: string; match: string[] },
  pathname: string,
): boolean {
  if (item.href === "/") {
    return pathname === "/" || item.match.some((path) => pathname.startsWith(path));
  }

  return pathname.startsWith(item.href) || item.match.some((path) => pathname.startsWith(path));
}
