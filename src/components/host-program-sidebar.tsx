"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import type { CSSProperties } from "react";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";

export type HostProgramSidebarActiveItem =
  | "dashboard"
  | "basic"
  | "detail"
  | "schedule"
  | "place"
  | "guide"
  | "management"
  | "forms"
  | "applications"
  | "result"
  | "messages"
  | "receipts"
  | "reviews"
  | "delete";

type HostProgramSidebarProps = {
  activeItem: HostProgramSidebarActiveItem;
  applicationsHref: string;
  formsHref: string;
  messagesHref: string;
  hostName?: string;
  programId: string;
  programPath: string;
  status: string;
  title: string;
};

const hostProgramSidebarScaleStyle = {
  "--host-program-sidebar-8": "clamp(8px, 0.556vw, 10.667px)",
  "--host-program-sidebar-12": "clamp(12px, 0.833vw, 16px)",
  "--host-program-sidebar-14": "clamp(14px, 0.972vw, 18.667px)",
  "--host-program-sidebar-16": "clamp(16px, 1.111vw, 21.333px)",
  "--host-program-sidebar-18": "clamp(18px, 1.25vw, 24px)",
  "--host-program-sidebar-22": "clamp(22px, 1.528vw, 29.333px)",
  "--host-program-sidebar-24": "clamp(24px, 1.667vw, 32px)",
  "--host-program-sidebar-28": "clamp(28px, 1.944vw, 37.333px)",
  "--host-program-sidebar-34": "clamp(34px, 2.361vw, 45.333px)",
  "--host-program-sidebar-40": "clamp(40px, 2.778vw, 53.333px)",
  "--host-program-sidebar-46": "clamp(46px, 3.194vw, 61.333px)",
  "--host-program-sidebar-86": "clamp(86px, 5.972vw, 114.667px)",
  "--host-program-sidebar-176": "clamp(176px, 12.222vw, 234.667px)",
  "--host-program-sidebar-216": "clamp(216px, 15vw, 288px)",
  "--host-program-sidebar-228": "clamp(228px, 15.833vw, 304px)",
} as CSSProperties;

const settingsItems: Array<{
  activeItem: HostProgramSidebarActiveItem;
  label: string;
  panel: string;
}> = [
  { activeItem: "basic", label: "기본정보", panel: "basic" },
  { activeItem: "detail", label: "상세정보", panel: "detail" },
  { activeItem: "schedule", label: "일정안내", panel: "schedule" },
  { activeItem: "place", label: "장소안내", panel: "place" },
  { activeItem: "guide", label: "안내사항", panel: "guide" },
];

export function HostProgramSidebar({
  activeItem,
  applicationsHref,
  formsHref,
  hostName = "로컬 호스트님",
  messagesHref,
  programId,
  programPath,
  status,
  title,
}: HostProgramSidebarProps) {
  return (
    <aside
      className="w-[var(--host-program-sidebar-228)] min-w-[228px] shrink-0 border-r border-[#6D7A8A] bg-white shadow-[2px_5px_5.2px_rgba(0,0,0,0.23)] max-md:w-full max-md:min-h-0 max-md:border-r-0 max-md:shadow-none"
      style={hostProgramSidebarScaleStyle}
    >
      <div className="min-h-[650px] px-[0.417vw] max-md:px-5">
        <div className="w-[var(--host-program-sidebar-216)] min-w-[216px] max-md:w-full">
          <section className="h-[var(--host-program-sidebar-86)] min-h-[86px]">
            <div className="flex h-[var(--host-program-sidebar-40)] min-h-10 items-center justify-center pb-[0.556vw] pt-[0.833vw]">
              <Link
                className="w-[var(--host-program-sidebar-176)] min-w-[176px] truncate text-[var(--host-program-sidebar-16)] font-semibold leading-[1.253] text-[#5B3A29] transition hover:text-[#FE701E]"
                href="/host"
              >
                {hostName}
              </Link>
              <Link
                aria-label="호스트 알림 보기"
                className="flex size-5 shrink-0 items-center justify-center text-[#FF9A3D] transition hover:text-[#FE701E]"
                href="/host/settings?panel=notifications"
              >
                <Bell aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </Link>
            </div>
            <div className="flex h-[var(--host-program-sidebar-46)] min-h-[46px] items-end border-b border-[#D9D9D9] pt-[0.833vw] text-center">
              <HostSwitchTab active href="/host" label="호스트" />
              <span className="mb-[6px] h-[22px] w-px bg-[#D9D9D9]" />
              <HostSwitchTab href="/host/villages" label="로컬" />
              <span className="mb-[6px] h-[22px] w-px bg-[#D9D9D9]" />
              <HostSwitchTab href="/admin" label="관리자" />
            </div>
          </section>

        <section className="border-b border-[#D9D9D9] px-[12px] pb-[var(--host-program-sidebar-12)] pt-[var(--host-program-sidebar-12)]">
          <div className="flex items-start gap-[var(--host-program-sidebar-8)]">
            <p className="min-h-[40px] min-w-0 flex-1 break-keep text-[var(--host-program-sidebar-16)] font-semibold leading-[1.253] text-[#5B3A29]">
              {title || "프로그램 제목"}
            </p>
            <span className="mt-[1px] shrink-0 rounded-[6px] bg-[#7A8B52] px-[6px] py-[3px] text-[12px] font-semibold leading-[1.253] text-[#F3F3F3]">
              {status}
            </span>
          </div>
          <p className="mt-[var(--host-program-sidebar-8)] text-[var(--host-program-sidebar-14)] font-semibold leading-[1.253] text-[#5B3A29]">
            프로그램 넘버 :{" "}
            <span className="text-[#FE701E]">{formatProgramNumber(programId)}</span>
          </p>
        </section>

        <nav className="px-[12px] pt-[var(--host-program-sidebar-24)] text-[#5B3A29]">
          <section className="border-b-[0.8px] border-[#6D7A8A] pb-[var(--host-program-sidebar-16)]">
            <SidebarNavLink
              active={activeItem === "dashboard"}
              href={`${programPath}?panel=dashboard`}
              label="대시보드"
            />
            <p className="mt-[var(--host-program-sidebar-18)] text-[14px] font-normal leading-[1.253]">
              프로그램 설정
            </p>
            <div className="mt-[var(--host-program-sidebar-8)] flex flex-col gap-[var(--host-program-sidebar-8)] pl-[var(--host-program-sidebar-18)]">
              {settingsItems.map((item) => (
                <SidebarSubLink
                  active={activeItem === item.activeItem}
                  href={`${programPath}?panel=${item.panel}`}
                  key={item.panel}
                  label={item.label}
                />
              ))}
            </div>
          </section>

          <section className="mt-[var(--host-program-sidebar-28)] border-b-[0.8px] border-[#6D7A8A] pb-[var(--host-program-sidebar-16)]">
            <p className="text-[14px] font-normal leading-[1.253]">
              신청폼 현황
            </p>
            <div className="mt-[var(--host-program-sidebar-8)] flex flex-col gap-[var(--host-program-sidebar-8)] pl-[var(--host-program-sidebar-18)]">
              <SidebarSubLink
                active={activeItem === "forms"}
                href={formsHref}
                label="신청폼 연결"
              />
              <SidebarSubLink
                active={activeItem === "applications"}
                href={applicationsHref}
                label="신청 관리"
              />
              <SidebarSubLink
                active={activeItem === "result"}
                href={messagesHref}
                label="결과 메세지 관리"
              />
            </div>
          </section>

          <div className="mt-[var(--host-program-sidebar-22)] flex flex-col gap-[var(--host-program-sidebar-22)]">
            {launchFeatureFlags.coupons || launchFeatureFlags.promotions ? (
              <SidebarNavLink
                active={activeItem === "management"}
                href={`${programPath}?panel=management`}
                label="쿠폰 / 프로모션"
              />
            ) : null}
            <SidebarNavLink
              active={activeItem === "messages"}
              href={messagesHref}
              label="메시지함"
            />
            <SidebarNavLink
              active={activeItem === "receipts"}
              href={`${applicationsHref}?panel=receipts`}
              label="결제 관리"
            />
            {launchFeatureFlags.reviews ? (
              <SidebarNavLink
                active={activeItem === "reviews"}
                href={`${applicationsHref}?panel=reviews`}
                label="후기 관리"
              />
            ) : null}
            <SidebarNavLink
              active={activeItem === "delete"}
              href={`${programPath}?panel=delete`}
              label="프로그램 삭제"
            />
          </div>
        </nav>
        </div>
      </div>
    </aside>
  );
}

function HostSwitchTab({
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
      className={`flex h-[var(--host-program-sidebar-34)] min-h-[34px] flex-1 items-center justify-center pb-[0.556vw] pt-[0.347vw] text-[var(--host-program-sidebar-14)] leading-[1.253] transition ${
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

function SidebarNavLink({
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
      className={`block text-[var(--host-program-sidebar-14)] leading-[1.253] text-[#5B3A29] ${
        active ? "font-semibold" : "font-normal"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

function SidebarSubLink({
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
      className={`flex h-[19px] w-fit items-center rounded-[4px] px-[5px] text-[var(--host-program-sidebar-12)] leading-[1.253] ${
        active
          ? "bg-[#FF9A3D] font-semibold text-[#F9F9F9]"
          : "font-normal text-[#5B3A29]"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

function formatProgramNumber(programId: string): string {
  const normalizedId = programId.trim();
  if (!normalizedId) return "0000000000";

  return normalizedId.length > 12 ? normalizedId.slice(0, 12) : normalizedId;
}
