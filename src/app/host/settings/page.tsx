import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Database,
  FolderKanban,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { HostAccessBanner } from "@/components/host-access-banner";

export const metadata: Metadata = {
  title: "호스트 설정 | NUVIO",
  description:
    "로컬홈 운영자가 팀 권한, 프로젝트 기본값, 알림, 데이터 설정을 관리하는 화면입니다.",
};

const settingGroups = [
  {
    title: "팀/권한",
    helper: "운영자 초대, 역할, 접근 범위를 관리합니다.",
    icon: UsersRound,
    items: ["운영자 계정", "역할 권한", "초대 링크"],
    href: "/me",
  },
  {
    title: "프로젝트 기본값",
    helper: "새 운영 프로젝트에 적용할 기본 항목을 정합니다.",
    icon: FolderKanban,
    items: ["기본 예산 구조", "증빙 체크리스트", "보고 섹션"],
    href: "/host/reports",
  },
  {
    title: "알림/메시지",
    helper: "신청, 선정, 마감 단계별 안내 기준을 설정합니다.",
    icon: Bell,
    items: ["메시지 템플릿", "발송 트리거", "알림 수신"],
    href: "/host/messages",
  },
  {
    title: "데이터",
    helper: "프로젝트 운영 데이터를 백업하고 내보냅니다.",
    icon: Database,
    items: ["CSV 내보내기", "증빙 보관", "데이터 보존"],
    href: "/host/reports",
  },
] as const;

export default function HostSettingsPage() {
  return (
    <>
      <HostAccessBanner />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <section className="rounded-md border border-slate-200 bg-white p-6">
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <SlidersHorizontal size={18} />
            Host Settings
          </p>
          <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <h1 className="max-w-3xl text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                로컬홈 운영 기준을 한곳에서 정리합니다.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                설정은 프로젝트 운영 화면의 기본값으로 연결됩니다. 지금은 MVP
                단계라 주요 설정 진입점을 먼저 모아두었습니다.
              </p>
            </div>
            <div className="rounded-md bg-slate-950 p-4 text-white">
              <p className="flex items-center gap-2 text-sm font-black text-teal-200">
                <ShieldCheck size={17} />
                현재 권한
              </p>
              <p className="mt-3 text-2xl font-black">호스트 운영자</p>
              <p className="mt-2 text-sm font-bold text-slate-300">
                프로젝트 생성, 신청자 관리, 증빙/마감 설정 가능
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {settingGroups.map((group) => {
            const Icon = group.icon;

            return (
              <article
                className="rounded-md border border-slate-200 bg-white p-5"
                key={group.title}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="grid size-10 place-items-center rounded-md bg-teal-50 text-[var(--primary)]">
                      <Icon size={20} />
                    </span>
                    <h2 className="mt-4 text-lg font-black text-slate-950">
                      {group.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {group.helper}
                    </p>
                  </div>
                  <Link
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    href={group.href}
                  >
                    <ArrowRight size={17} />
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs font-black text-slate-600"
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </>
  );
}
