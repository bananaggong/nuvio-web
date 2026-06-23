import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
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

const channelToggles = [
  ["브라우저 알람", "off"],
  ["이메일 알람", "off"],
  ["앱푸시 알람", "ready"],
] as const;

const notificationToggles = [
  "새 신청 접수",
  "새 메세지",
  "예약 취소",
  "후기 등록",
];

const templates = [
  {
    body: (
      <>
        <TemplateToken>{"{게스트명}"}</TemplateToken>님,{" "}
        <TemplateToken>{"{프로그램명}"}</TemplateToken> 신청을 해주셔서
        감사합니다. 검토 후 결과를 안내드릴게요.
      </>
    ),
    description: (
      <>
        프로그램 신청시 <strong>자동 발송</strong>되는 메세지 입니다.
      </>
    ),
    title: "신청 완료 템플릿",
  },
  {
    body: (
      <>
        <TemplateToken>{"{게스트명}"}</TemplateToken>님,{" "}
        <TemplateToken>{"{프로그램명}"}</TemplateToken> 예약이 확정되었습니다.
      </>
    ),
    description: (
      <>
        프로그램 예약 확정시 <strong>자동 발송</strong>되는 메세지 입니다.
      </>
    ),
    title: "예약 확정 템플릿",
  },
  {
    body: (
      <>
        <TemplateToken>{"{게스트명}"}</TemplateToken>님, 이번
        <TemplateToken>{"{프로그램명}"}</TemplateToken>에 선정되셨습니다! 🎉
      </>
    ),
    description: (
      <>
        프로그램 선정된 게스트에게 <strong>버튼 발송</strong>되는 메세지
        입니다.
      </>
    ),
    title: "선정 안내 템플릿",
  },
  {
    body: (
      <>
        <TemplateToken>{"{게스트명}"}</TemplateToken>님, 아쉽게도 이번
        <TemplateToken>{"{프로그램명}"}</TemplateToken>에 선정되지
        못하셨습니다.
      </>
    ),
    description: (
      <>
        프로그램 탈락된 게스트에게 <strong>버튼 발송</strong>되는 메세지
        입니다.
      </>
    ),
    title: "탈락 안내 템플릿",
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
            className="flex h-[var(--host-20)] w-fit items-center gap-[var(--host-14)] text-[var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
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
                  <NotificationSettingsContent />
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
        className="flex h-[var(--host-36)] w-[var(--host-782)] max-w-full items-center gap-[var(--host-12)] rounded-[var(--host-4)] border border-[#6D7A8A] px-[var(--host-16)] py-[var(--host-8)] transition hover:border-[#FE701E]"
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
        className="flex h-[var(--host-44)] w-full items-center gap-[var(--host-12)] border-b border-[#6D7A8A] py-[var(--host-12)] transition hover:text-[#FE701E]"
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
    <>
      <span className="shrink-0 text-[var(--host-16)] font-medium leading-[1.253] text-[#0D0D0C]">
        {section.title}
      </span>
      <span className="shrink-0 text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
        {section.description}
      </span>
    </>
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

function NotificationSettingsContent() {
  return (
    <>
      <SettingsSubSection title="알람 수신 채널">
        {channelToggles.map(([label, state]) => (
          <ToggleLine key={label} label={label} state={state} />
        ))}
      </SettingsSubSection>

      <SettingsSubSection title="알람 수신 항목">
        {notificationToggles.map((label) => (
          <ToggleLine key={label} label={label} state="off" />
        ))}
      </SettingsSubSection>

      <div className="flex w-[var(--host-546)] max-w-full flex-col gap-[var(--host-14)]">
        <h2 className="text-[var(--host-16)] font-medium leading-[1.253] text-[#0D0D0C]">
          메세지 템플릿
        </h2>
        <p className="text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
          발송될 메세지의 내용 수정이 가능해요.
        </p>
        <div className="flex w-[var(--host-427)] max-w-full flex-col gap-[var(--host-28)]">
          {templates.map((template) => (
            <MessageTemplateCard key={template.title} template={template} />
          ))}
          <NewTemplateCard />
          <button
            className="flex w-fit items-center gap-[var(--host-4)] text-[var(--host-12)] font-normal leading-[1.253] text-[#FF9A3D]"
            type="button"
          >
            <span className="grid size-[var(--host-12)] place-items-center rounded-full bg-[#FF9A3D] text-[10px] font-semibold leading-none text-white">
              +
            </span>
            <span>템플릿 추가</span>
          </button>
        </div>
      </div>
    </>
  );
}

function SettingsSubSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="flex w-[var(--host-547)] max-w-full flex-col gap-[var(--host-14)] border-b border-[#D9D9D9] pb-[var(--host-20)]">
      <h2 className="text-[var(--host-16)] font-medium leading-[1.253] text-[#0D0D0C]">
        {title}
      </h2>
      <div className="flex w-full flex-col gap-[var(--host-7)] px-[var(--host-10)]">
        {children}
      </div>
    </div>
  );
}

function ToggleLine({
  label,
  state,
}: {
  label: string;
  state: "off" | "on" | "ready";
}) {
  return (
    <div className="flex h-[var(--host-20)] w-[var(--host-281)] items-center gap-[var(--host-7)] text-[var(--host-12)] font-normal leading-[1.253] text-[#0D0D0C]">
      <span className="min-w-0 flex-1">{label}</span>
      {state === "ready" ? (
        <span>준비중</span>
      ) : (
        <button aria-pressed={state === "on"} type="button">
          <Image
            alt=""
            aria-hidden
            className="h-[var(--host-20)] w-[var(--host-23)]"
            height={20}
            src={
              state === "on"
                ? nuvioIcons.formRequiredToggleOn
                : nuvioIcons.formRequiredToggleOff
            }
            width={23}
          />
        </button>
      )}
    </div>
  );
}

function MessageTemplateCard({
  template,
}: {
  template: (typeof templates)[number];
}) {
  return (
    <article className="flex w-full flex-col items-start justify-center rounded-[var(--host-7)] border border-[#F7B267] pb-[var(--host-6)]">
      <div className="flex w-full flex-col items-start justify-center rounded-t-[var(--host-7)] bg-[#F3F3F3] px-[var(--host-12)] py-[var(--host-8)]">
        <div className="flex w-full items-center gap-[var(--host-8)]">
          <h3 className="shrink-0 text-[var(--host-14)] font-semibold leading-[1.253] text-[#0D0D0C]">
            {template.title}
          </h3>
          <span className="flex flex-1 justify-end">
            <Pencil
              aria-hidden
              className="size-[var(--host-13)] text-[#FE701E]"
              strokeWidth={1.8}
            />
          </span>
        </div>
        <p className="mt-[var(--host-4)] text-[var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]">
          {template.description}
        </p>
      </div>
      <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-[var(--host-12)] py-[var(--host-8)] text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
        {template.body}
      </p>
    </article>
  );
}

function NewTemplateCard() {
  return (
    <article className="flex w-full flex-col items-start justify-center rounded-[var(--host-7)] border border-[#F7B267] pb-[var(--host-6)] opacity-60">
      <div className="flex w-full flex-col gap-[var(--host-4)] rounded-t-[var(--host-7)] bg-[#F3F3F3] px-[var(--host-12)] py-[var(--host-8)]">
        <div className="flex w-full items-center gap-[var(--host-8)]">
          <div className="w-[var(--host-254)] max-w-[60%] border-b-[0.8px] border-[#CAC4BC] px-[var(--host-4)] py-[var(--host-4)] text-[var(--host-14)] font-normal leading-[1.253] text-[#D9D9D9]">
            신규 템플릿 제목
          </div>
          <span className="flex flex-1 justify-end gap-[var(--host-8)]">
            <Pencil
              aria-hidden
              className="size-[var(--host-13)] text-[#FE701E]"
              strokeWidth={1.8}
            />
            <IconButton alt="템플릿 삭제" src={nuvioIcons.formItemTrash} />
          </span>
        </div>
        <div className="w-full border-b-[0.8px] border-[#CAC4BC] px-[var(--host-4)] py-[var(--host-4)] text-[var(--host-12)] font-normal leading-[1.253] text-[#D9D9D9]">
          메세지 사용에 대한 설명 작성
        </div>
      </div>
      <p className="px-[var(--host-12)] py-[var(--host-8)] text-[var(--host-12)] font-normal leading-[1.253] text-[#D9D9D9]">
        템플릿 메세지 내용 작성
      </p>
    </article>
  );
}

function TemplateToken({ children }: { children: ReactNode }) {
  return <span className="text-[#FE701E]">{children}</span>;
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
        <div className="flex w-full items-center gap-[var(--host-28)]">
          <SelectShell label="프로그램 선택" widthClass="w-[var(--host-222)]" />
          <SelectShell label="기간 선택" widthClass="w-[var(--host-194)]" />
          <button
            className="h-[var(--host-30)] w-[var(--host-77)] rounded-[var(--host-6)] bg-[#CAC4BC] text-center text-[var(--host-12)] font-bold leading-[1.6] text-[#F3F3F3]"
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
    <div className={`relative h-[var(--host-31)] ${widthClass}`}>
      <select
        className="h-full w-full appearance-none rounded-[var(--host-7)] border border-[#CAC4BC] bg-white px-[var(--host-8)] text-[var(--host-12)] font-medium leading-[1.253] text-[#D9D9D9] outline-none"
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

function IconButton({ alt, src }: { alt: string; src: string }) {
  return (
    <button
      aria-label={alt}
      className="grid size-[var(--host-16)] place-items-center"
      type="button"
    >
      <Image alt="" aria-hidden className="size-full" height={16} src={src} width={16} />
    </button>
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
