import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { HostNotificationSettingsContent } from "@/components/host-notification-settings";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { HostTeamSettingsContent } from "@/components/host-team-permission-settings";
import {
  HostWorkspaceContent,
  HostWorkspaceLayout,
} from "@/components/host-workspace-ui";
import {
  buildHostRouteNextPath,
  type HostRouteSearchParams,
  requireHostConsoleAccess,
} from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "호스트 설정 | 누비오",
  description:
    "채널 호스트가 팀 권한, 알림, 데이터 설정을 관리하는 화면입니다.",
};

type SettingsPanel = "data" | "general" | "notifications" | "team";
type OpenSettingsPanel = Exclude<SettingsPanel, "general">;

const settingSections: Array<{
  description: string;
  href: string;
  key: OpenSettingsPanel;
  title: string;
}> = [
  {
    description: "호스트 초대, 역할 및 접근 범위 관리",
    href: "/host/settings?panel=team",
    key: "team",
    title: "팀 / 권한",
  },
  {
    description: "알람 수신 설정 및 메세지 템플릿 관리",
    href: "/host/settings?panel=notifications",
    key: "notifications",
    title: "알람 / 안내 메세지",
  },
  {
    description: "프로그램 운영 데이터 백업 및 내보내기",
    href: "/host/settings?panel=data",
    key: "data",
    title: "데이터 관리",
  },
];

export default async function HostSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<HostRouteSearchParams>;
}) {
  const params = await searchParams;
  const overview = await requireHostConsoleAccess(
    buildHostRouteNextPath("/host/settings", params),
  );

  const activePanel = normalizePanel(params?.panel);
  const canManageRolePermissions =
    overview.isAdmin ||
    overview.workspaces.some((workspace) => workspace.role === "owner");

  return (
    <HostWorkspaceLayout
      sidebarHeight={
        activePanel === "notifications"
          ? "min-h-[calc(1302px*var(--host-scale))]"
          : undefined
      }
    >
      <HostWorkspaceContent insideFolder>
        <div className="w-[var(--host-959)] max-w-full pt-[var(--host-24)]">
          <Link
            className="flex h-[var(--host-20)] min-h-11 w-fit items-center gap-[var(--host-14)] text-[var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E] md:min-h-0"
            href="/host"
          >
            <Image
              alt=""
              aria-hidden
              className="h-[var(--host-17)] w-[var(--host-11)]"
              height={17}
              src={nuvioIcons.formEditorBack}
              width={11}
            />
            <span>설정</span>
          </Link>

          <div className="mt-[var(--host-46)] flex w-[var(--host-959)] max-w-full flex-col gap-[var(--host-18)]">
            {settingSections.map((section) => (
              <SettingsAccordion
                key={section.key}
                open={activePanel === section.key}
                section={section}
              >
                {section.key === "team" ? (
                  <HostTeamSettingsContent
                    canManageRolePermissions={canManageRolePermissions}
                  />
                ) : null}
                {section.key === "notifications" ? (
                  <HostNotificationSettingsContent />
                ) : null}
                {section.key === "data" ? <DataSettingsContent /> : null}
              </SettingsAccordion>
            ))}
          </div>
        </div>
      </HostWorkspaceContent>
    </HostWorkspaceLayout>
  );
}

function SettingsAccordion({
  children,
  open,
  section,
}: {
  children: ReactNode;
  open: boolean;
  section: (typeof settingSections)[number];
}) {
  if (!open) {
    return (
      <Link
        className="flex h-auto min-h-16 w-[var(--host-782)] max-w-full items-start gap-2 rounded-[var(--host-4)] border border-[#6D7A8A] px-[var(--host-16)] py-3 transition hover:border-[#FE701E] md:h-[var(--host-36)] md:min-h-0 md:items-center md:gap-[var(--host-12)] md:py-[var(--host-8)]"
        href={section.href}
      >
        <AccordionHeaderText section={section} />
        <AccordionIcon open={false} />
      </Link>
    );
  }

  return (
    <section className="flex w-[var(--host-782)] max-w-full flex-col items-center gap-[var(--host-22)] rounded-[var(--host-4)] border border-[#6D7A8A] px-[var(--host-16)] pb-[var(--host-18)] pt-[var(--host-12)]">
      <Link
        className="flex h-auto min-h-14 w-full items-start gap-2 border-b border-[#6D7A8A] py-3 transition hover:text-[#FE701E] md:h-[var(--host-44)] md:min-h-0 md:items-center md:gap-[var(--host-12)] md:py-[var(--host-12)]"
        href="/host/settings"
      >
        <AccordionHeaderText section={section} />
        <AccordionIcon open />
      </Link>
      {children}
    </section>
  );
}

function AccordionHeaderText({
  section,
}: {
  section: (typeof settingSections)[number];
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-[var(--host-12)] max-md:flex-col max-md:items-start max-md:gap-1">
      <span className="shrink-0 text-[var(--host-16)] font-medium leading-[1.253] text-[#0D0D0C]">
        {section.title}
      </span>
      <span className="min-w-0 text-[var(--host-14)] font-medium leading-[1.45] text-[#6D7A8A] md:shrink-0 md:leading-[1.253]">
        {section.description}
      </span>
    </span>
  );
}

function AccordionIcon({ open }: { open: boolean }) {
  return (
    <span className="ml-auto grid size-[var(--host-21)] shrink-0 place-items-center">
      <Image
        alt=""
        aria-hidden
        className="size-full"
        height={21}
        src={open ? nuvioIcons.dropup : nuvioIcons.dropdown}
        width={21}
      />
    </span>
  );
}

function DataSettingsContent() {
  return (
    <>
      <div className="flex w-[var(--host-546)] max-w-full flex-col gap-[var(--host-5)]">
        <h2 className="text-[var(--host-16)] font-medium leading-[1.253] text-[#0D0D0C]">
          CSV 내보내기
        </h2>
        <p className="text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
          신청 기록과 운영 데이터를 엑셀에서 열 수 있는 CSV 파일로 내보낼 수
          있어요
        </p>
        <div className="flex w-full items-center gap-[var(--host-28)] max-md:flex-col max-md:items-stretch max-md:gap-3">
          <SelectShell label="프로그램 선택" widthClass="w-[var(--host-222)]" />
          <SelectShell label="기간 선택" widthClass="w-[var(--host-194)]" />
          <button
            className="h-11 w-[var(--host-77)] rounded-[var(--host-6)] bg-[#CAC4BC] text-center text-[var(--host-12)] font-bold leading-[1.6] text-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-70 md:h-[var(--host-30)]"
            disabled
            type="button"
          >
            내보내기
          </button>
        </div>
      </div>
      <p className="w-[calc(518px*var(--host-scale))] max-w-full text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
        탈퇴 후 신청 기록 및 운영 데이터는 30일간 보관 후 삭제돼요.
        <br />
        필요한 경우 탈퇴 전 CSV 내보내기를 권장해요.
      </p>
    </>
  );
}

function SelectShell({
  label,
  widthClass,
}: {
  label: string;
  widthClass: string;
}) {
  return (
    <div className={`relative h-11 max-md:w-full md:h-[var(--host-31)] ${widthClass}`}>
      <select
        className="h-full w-full appearance-none rounded-[var(--host-7)] border border-[#CAC4BC] bg-white px-[var(--host-8)] text-base font-medium leading-[1.253] text-[#D9D9D9] outline-none md:text-[var(--host-12)]"
        defaultValue=""
      >
        <option disabled value="">
          {label}
        </option>
      </select>
      <Image
        alt=""
        aria-hidden
        className="pointer-events-none absolute right-[var(--host-8)] top-1/2 h-[10px] w-[10px] -translate-y-1/2"
        height={10}
        src={nuvioIcons.formSelectDropdown}
        width={10}
      />
    </div>
  );
}

function normalizePanel(value: HostRouteSearchParams[string]): SettingsPanel {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (
    rawValue === "team" ||
    rawValue === "notifications" ||
    rawValue === "data"
  ) {
    return rawValue;
  }
  return "general";
}
