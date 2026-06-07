import type { Metadata } from "next";
import Link from "next/link";
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
    "로컬페이지 호스트가 팀 권한, 알림, 데이터 설정을 관리하는 화면입니다.",
};

type SettingsPanel = "data" | "general" | "notifications" | "team";

const panelTabs: Array<{ href: string; key: SettingsPanel; label: string }> = [
  { href: "/host/settings", key: "general", label: "전체" },
  { href: "/host/settings?panel=team", key: "team", label: "팀" },
  {
    href: "/host/settings?panel=notifications",
    key: "notifications",
    label: "알림",
  },
  { href: "/host/settings?panel=data", key: "data", label: "데이터" },
];

export default async function HostSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<HostRouteSearchParams>;
}) {
  const params = await searchParams;
  await requireHostConsoleAccess(buildHostRouteNextPath("/host/settings", params));

  const activePanel = normalizePanel(params?.panel);

  return (
    <HostWorkspaceLayout>
      <HostWorkspaceContent>
        <div className="w-[77.639vw] max-w-[1491px] pt-[var(--host-24)]">
          <div className="flex h-[var(--host-29)] items-center border-b border-[#D9D9D9]">
            <nav className="flex items-center gap-[var(--host-18)] text-[var(--host-14)] leading-[1.253]">
              {panelTabs.map((tab) => (
                <Link
                  aria-current={activePanel === tab.key ? "page" : undefined}
                  className={`h-[var(--host-29)] border-b-2 px-[4px] transition ${
                    activePanel === tab.key
                      ? "border-[#FE701E] font-semibold text-[#0D0D0C]"
                      : "border-transparent font-medium text-[#CAC4BC] hover:text-[#FE701E]"
                  }`}
                  href={tab.href}
                  key={tab.key}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="pt-[var(--host-24)]">
            {activePanel === "general" ? <GeneralSettingsPanel /> : null}
            {activePanel === "team" ? <TeamSettingsPanel /> : null}
            {activePanel === "notifications" ? <NotificationSettingsPanel /> : null}
            {activePanel === "data" ? <DataSettingsPanel /> : null}
          </div>
        </div>
      </HostWorkspaceContent>
    </HostWorkspaceLayout>
  );
}

function GeneralSettingsPanel() {
  return (
    <section className="w-[64.236vw] max-w-[1233px]">
      <SettingsHeader
        description="로컬페이지 운영에 필요한 기본 설정을 확인하고 세부 설정으로 이동합니다."
        title="설정"
      />
      <div className="mt-[var(--host-24)] grid border-y border-[#6D7A8A]">
        <SettingsLinkRow
          description="호스트 초대, 역할 권한, 초대 링크를 관리합니다."
          href="/host/settings?panel=team"
          label="팀/권한"
          meta="호스트 계정 01명"
        />
        <SettingsLinkRow
          description="신청, 선정, 변경 안내에 사용할 알림 채널을 관리합니다."
          href="/host/settings?panel=notifications"
          label="알림/메시지"
          meta="기본 채널 사용"
        />
        <SettingsLinkRow
          description="프로그램 신청 기록과 운영 데이터를 내보내고 보존 기준을 확인합니다."
          href="/host/settings?panel=data"
          label="데이터"
          meta="CSV 내보내기"
        />
      </div>
      <div className="mt-[var(--host-24)] flex gap-[var(--host-12)]">
        <HostSettingsButton tone="orange">저장하기</HostSettingsButton>
        <HostSettingsButton tone="slate">변경 이력</HostSettingsButton>
      </div>
    </section>
  );
}

function TeamSettingsPanel() {
  return (
    <section className="w-[64.236vw] max-w-[1233px]">
      <SettingsHeader
        description="팀원이 맡을 수 있는 역할과 접근 범위를 확인합니다."
        title="팀/권한"
      />
      <div className="mt-[var(--host-24)] border-y border-[#6D7A8A]">
        <div className="grid grid-cols-[1.15fr_0.75fr_0.7fr_0.5fr] border-b border-[#D9D9D9] px-[var(--host-16)] py-[var(--host-10)] text-[var(--host-12)] font-semibold leading-[1.253] text-[#6D7A8A]">
          <span>계정</span>
          <span>역할</span>
          <span>상태</span>
          <span className="text-right">관리</span>
        </div>
        <TeamMemberRow email="host@nuvio.kr" role="소유자" status="활성" />
        <TeamMemberRow email="manager@nuvio.kr" role="매니저" status="초대 대기" />
      </div>
      <div className="mt-[var(--host-24)] flex w-[38.125vw] max-w-[732px] flex-col gap-[var(--host-12)] border-b border-[#6D7A8A] pb-[var(--host-24)]">
        <SettingsField label="초대 이메일" placeholder="이메일을 입력해주세요." />
        <div className="grid grid-cols-[1fr_123px] gap-[var(--host-12)]">
          <select className="h-[var(--host-31)] rounded-[var(--host-7)] border-[0.5px] border-[#F7B267] bg-white px-[var(--host-12)] text-[var(--host-12)] font-medium text-[#0D0D0C] outline-none">
            <option>매니저</option>
            <option>편집자</option>
            <option>뷰어</option>
          </select>
          <HostSettingsButton tone="orange">초대하기</HostSettingsButton>
        </div>
      </div>
    </section>
  );
}

function NotificationSettingsPanel() {
  return (
    <section className="w-[64.236vw] max-w-[1233px]">
      <SettingsHeader
        description="신청 접수, 선정 결과, 문의 메시지 알림 기준을 설정합니다."
        title="알림/메시지"
      />
      <div className="mt-[var(--host-24)] grid border-y border-[#6D7A8A]">
        <ToggleSettingRow
          description="새 신청서가 접수되면 호스트 알림으로 알려줍니다."
          label="신청 접수 알림"
          on
        />
        <ToggleSettingRow
          description="선정 결과 메시지 발송 예약 전 확인 알림을 표시합니다."
          label="결과 메시지 예약 알림"
          on
        />
        <ToggleSettingRow
          description="게스트가 문의를 남기면 메세지함에 새 알림을 표시합니다."
          label="문의 메시지 알림"
          on
        />
        <ToggleSettingRow
          description="프로그램 모집 마감 하루 전 알림을 받습니다."
          label="마감 예정 알림"
        />
      </div>
      <div className="mt-[var(--host-24)] grid w-[38.125vw] max-w-[732px] gap-[var(--host-12)]">
        <SettingsField label="기본 수신 이메일" placeholder="host@nuvio.kr" />
        <SettingsField label="예비 알림 문구" placeholder="알림 문구를 입력해주세요." />
      </div>
    </section>
  );
}

function DataSettingsPanel() {
  return (
    <section className="w-[64.236vw] max-w-[1233px]">
      <SettingsHeader
        description="신청 기록, 메시지 기록, 결제 기록을 필요한 형식으로 관리합니다."
        title="데이터"
      />
      <div className="mt-[var(--host-24)] grid border-y border-[#6D7A8A]">
        <DataExportRow count="00건" label="신청 기록" />
        <DataExportRow count="00건" label="메시지 기록" />
        <DataExportRow count="00건" label="결제 기록" />
      </div>
      <p className="mt-[var(--host-18)] text-[var(--host-12)] font-medium leading-[1.6] text-[#7A8B52]">
        내보내기 파일은 개인정보 보호를 위해 생성 후 일정 시간이 지나면 만료됩니다.
      </p>
    </section>
  );
}

function SettingsHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <header className="border-b border-[#6D7A8A] pb-[var(--host-24)]">
      <h1 className="text-[var(--host-16)] font-semibold leading-[1.253] text-[#0D0D0C]">
        {title}
      </h1>
      <p className="mt-[var(--host-10)] text-[var(--host-14)] font-normal leading-[1.253] text-[#6D7A8A]">
        {description}
      </p>
    </header>
  );
}

function SettingsLinkRow({
  description,
  href,
  label,
  meta,
}: {
  description: string;
  href: string;
  label: string;
  meta: string;
}) {
  return (
    <Link
      className="grid min-h-[var(--host-58)] grid-cols-[176px_minmax(0,1fr)_176px] items-center gap-[var(--host-16)] border-b border-[#D9D9D9] px-[var(--host-16)] py-[var(--host-12)] last:border-b-0"
      href={href}
    >
      <span className="text-[var(--host-14)] font-semibold leading-[1.253] text-[#0D0D0C]">
        {label}
      </span>
      <span className="min-w-0 truncate text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
        {description}
      </span>
      <span className="text-right text-[var(--host-12)] font-semibold leading-[1.253] text-[#FE701E]">
        {meta}
      </span>
    </Link>
  );
}

function TeamMemberRow({
  email,
  role,
  status,
}: {
  email: string;
  role: string;
  status: string;
}) {
  return (
    <div className="grid min-h-[var(--host-40)] grid-cols-[1.15fr_0.75fr_0.7fr_0.5fr] items-center border-b border-[#D9D9D9] px-[var(--host-16)] text-[var(--host-12)] font-medium leading-[1.253] last:border-b-0">
      <span className="truncate text-[#0D0D0C]">{email}</span>
      <span className="text-[#6D7A8A]">{role}</span>
      <span className="text-[#7A8B52]">{status}</span>
      <button
        className="justify-self-end rounded-[var(--host-4)] border border-[#6D7A8A] px-[var(--host-10)] py-[var(--host-4)] text-[#6D7A8A]"
        type="button"
      >
        변경
      </button>
    </div>
  );
}

function ToggleSettingRow({
  description,
  label,
  on = false,
}: {
  description: string;
  label: string;
  on?: boolean;
}) {
  return (
    <div className="grid min-h-[var(--host-58)] grid-cols-[176px_minmax(0,1fr)_64px] items-center gap-[var(--host-16)] border-b border-[#D9D9D9] px-[var(--host-16)] py-[var(--host-12)] last:border-b-0">
      <span className="text-[var(--host-14)] font-semibold leading-[1.253] text-[#0D0D0C]">
        {label}
      </span>
      <span className="min-w-0 truncate text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
        {description}
      </span>
      <button
        aria-pressed={on}
        className={`flex h-[var(--host-24)] w-[var(--host-42)] items-center rounded-full border px-[2px] ${
          on ? "justify-end border-[#FF9A3D] bg-[#FF9A3D]" : "justify-start border-[#6D7A8A] bg-white"
        }`}
        type="button"
      >
        <span className="size-[var(--host-18)] rounded-full bg-[#F9F9F9]" />
      </button>
    </div>
  );
}

function DataExportRow({ count, label }: { count: string; label: string }) {
  return (
    <div className="grid min-h-[var(--host-58)] grid-cols-[176px_minmax(0,1fr)_123px] items-center gap-[var(--host-16)] border-b border-[#D9D9D9] px-[var(--host-16)] py-[var(--host-12)] last:border-b-0">
      <span className="text-[var(--host-14)] font-semibold leading-[1.253] text-[#0D0D0C]">
        {label}
      </span>
      <span className="text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
        현재 저장된 데이터 {count}
      </span>
      <HostSettingsButton tone="outline">CSV 내보내기</HostSettingsButton>
    </div>
  );
}

function SettingsField({
  label,
  placeholder,
}: {
  label: string;
  placeholder: string;
}) {
  return (
    <label className="grid gap-[var(--host-8)]">
      <span className="text-[var(--host-14)] font-semibold leading-[1.253] text-[#0D0D0C]">
        {label}
      </span>
      <input
        className="h-[var(--host-31)] rounded-[var(--host-7)] border-[0.5px] border-[#F7B267] bg-white px-[var(--host-12)] text-[var(--host-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9]"
        placeholder={placeholder}
      />
    </label>
  );
}

function HostSettingsButton({
  children,
  tone,
}: {
  children: string;
  tone: "orange" | "outline" | "slate";
}) {
  const className =
    tone === "orange"
      ? "border-[#FE701E] bg-[#FE701E] text-[#FFF6EC]"
      : tone === "outline"
        ? "border-[#FE701E] bg-white text-[#FE701E]"
        : "border-[#6D7A8A] bg-[#6D7A8A] text-[#FFF6EC]";

  return (
    <button
      className={`inline-flex h-[var(--host-29)] items-center justify-center rounded-[var(--host-4)] border px-[var(--host-18)] text-[var(--host-12)] font-medium leading-[1.253] ${className}`}
      type="button"
    >
      {children}
    </button>
  );
}

function normalizePanel(value: HostRouteSearchParams[string]): SettingsPanel {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (rawValue === "team" || rawValue === "notifications" || rawValue === "data") {
    return rawValue;
  }
  return "general";
}
