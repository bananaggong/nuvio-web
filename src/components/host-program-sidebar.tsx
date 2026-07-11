"use client";

import Image from "next/image";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import {
  HostSidebarRootLink,
  HostSidebarSubLink,
  HostWorkspaceSwitchTab,
  hostWorkspaceScaleStyle,
} from "@/components/host-workspace-ui";
import { formatProgramDisplayCode } from "@/lib/display-code";
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
  programId: string;
  programPath: string;
  status: string;
  title: string;
};

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
  messagesHref,
  programId,
  programPath,
  status,
  title,
}: HostProgramSidebarProps) {
  return (
    <aside
      className="w-[var(--host-210)] min-w-[210px] shrink-0 border-r border-[#6D7A8A] bg-white shadow-[2px_5px_5.2px_rgba(0,0,0,0.23)] max-md:w-full max-md:min-h-0 max-md:border-r-0 max-md:shadow-none"
      style={hostWorkspaceScaleStyle}
    >
      <div className="min-h-[650px] px-[0.417vw] max-md:px-5">
        <div className="w-[var(--host-198)] min-w-[198px] max-md:w-full">
          <section className="h-[var(--host-86)] min-h-[86px]">
            <div className="flex h-[var(--host-40)] min-h-10 items-center justify-center pb-[var(--host-8)] pt-[var(--host-12)]">
              <span className="w-[var(--host-176)] min-w-[176px] text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
                로컬 호스트님
              </span>
              <Image
                alt="알림"
                className="size-[var(--host-20)] shrink-0"
                height={20}
                src={nuvioIcons.bell}
                width={20}
              />
            </div>
            <div className="flex h-[var(--host-46)] min-h-[46px] items-end border-b border-[#D9D9D9] pt-[var(--host-12)] text-center">
              <HostWorkspaceSwitchTab active href="/host" label="호스트" />
              <span className="mb-[var(--host-6)] h-[var(--host-22)] min-h-[22px] w-px bg-[#D9D9D9]" />
              <HostWorkspaceSwitchTab href="/host/channels" label="채널" />
            </div>
          </section>

        <section className="border-b border-[#D9D9D9] px-[var(--host-12)] pb-[var(--host-12)] pt-[var(--host-12)]">
          <div className="flex items-start gap-[var(--host-8)]">
            <p className="min-h-[40px] min-w-0 flex-1 break-keep text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
              {title || "프로그램 제목"}
            </p>
            <span className="mt-[1px] shrink-0 rounded-[var(--host-6)] bg-[#7A8B52] px-[var(--host-6)] py-[var(--host-3)] text-[length:var(--host-12)] font-semibold leading-[1.253] text-[#F3F3F3]">
              {status}
            </span>
          </div>
          <p className="mt-[var(--host-8)] text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#5B3A29]">
            프로그램 넘버 :{" "}
            <span className="text-[#FE701E]">{formatProgramNumber(programId)}</span>
          </p>
        </section>

        <nav className="px-[var(--host-12)] pt-[var(--host-12)] text-[#5B3A29]">
          <section className="border-b-[0.8px] border-[#6D7A8A] pb-[var(--host-12)]">
            <HostSidebarRootLink
              active={activeItem === "dashboard"}
              href={`${programPath}?panel=dashboard`}
              label="대시보드"
            />
            <p className="mt-[var(--host-13)] text-[length:var(--host-14)] font-normal leading-[1.253]">
              프로그램 설정
            </p>
            <div className="mt-[var(--host-6)] flex flex-col gap-[3px] pl-[var(--host-6)]">
              {settingsItems.map((item) => (
                <HostSidebarSubLink
                  active={activeItem === item.activeItem}
                  href={`${programPath}?panel=${item.panel}`}
                  key={item.panel}
                  label={item.label}
                />
              ))}
            </div>
          </section>

          <section className="mt-[var(--host-13)] border-b-[0.8px] border-[#6D7A8A] pb-[var(--host-12)]">
            <p className="text-[length:var(--host-14)] font-normal leading-[1.253]">
              신청폼 현황
            </p>
            <div className="mt-[var(--host-6)] flex flex-col gap-[3px] pl-[var(--host-6)]">
              <HostSidebarSubLink
                active={activeItem === "forms"}
                href={formsHref}
                label="신청폼 연결"
              />
              <HostSidebarSubLink
                active={activeItem === "applications"}
                href={applicationsHref}
                label="신청 관리"
              />
              <HostSidebarSubLink
                active={activeItem === "result"}
                href={messagesHref}
                label="결과 메세지 관리"
              />
            </div>
          </section>

          <div className="mt-[var(--host-13)] flex flex-col gap-[var(--host-13)]">
            {launchFeatureFlags.coupons || launchFeatureFlags.promotions ? (
              <HostSidebarRootLink
                active={activeItem === "management"}
                href={`${programPath}?panel=management`}
                label="쿠폰 / 프로모션"
              />
            ) : null}
            <HostSidebarRootLink
              active={activeItem === "messages"}
              href="/host/messages"
              label="메시지함"
            />
            <HostSidebarRootLink
              active={activeItem === "receipts"}
              href={`${applicationsHref}?panel=receipts`}
              label="결제 관리"
            />
            {launchFeatureFlags.reviews ? (
              <HostSidebarRootLink
                active={activeItem === "reviews"}
                href={`${applicationsHref}?panel=reviews`}
                label="후기 관리"
              />
            ) : null}
            <HostSidebarRootLink
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

function formatProgramNumber(programId: string): string {
  return formatProgramDisplayCode(programId);
}
