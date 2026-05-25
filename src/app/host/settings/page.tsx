import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  ClipboardList,
  Database,
  UsersRound,
} from "lucide-react";

export const metadata: Metadata = {
  title: "호스트 설정 | 누비오",
  description:
    "로컬페이지 호스트가 팀 권한, 프로그램 운영 기준, 알림, 데이터 설정을 관리하는 화면입니다.",
};

const settingGroups = [
  {
    title: "팀/권한",
    helper: "호스트 초대, 역할, 접근 범위를 관리합니다.",
    icon: UsersRound,
    items: ["호스트 계정", "역할 권한", "초대 링크"],
    href: "/mypage",
  },
  {
    title: "프로그램 기본값",
    helper: "새 프로그램을 만들 때 자주 쓰는 운영 기준을 정합니다.",
    icon: ClipboardList,
    items: ["모집 상태", "신청서 기본 질문", "안내 메시지"],
    href: "/host/programs",
  },
  {
    title: "알림/메시지",
    helper: "신청, 선정, 변경 안내 기준을 설정합니다.",
    icon: Bell,
    items: ["메시지 템플릿", "발송 트리거", "알림 수신"],
    href: "/host/messages",
  },
  {
    title: "데이터",
    helper: "프로그램 운영 데이터를 백업하고 내보냅니다.",
    icon: Database,
    items: ["CSV 내보내기", "신청 기록", "데이터 보존"],
    href: "/host/applications",
  },
] as const;

export default function HostSettingsPage() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <section className="grid gap-4 md:grid-cols-2">
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
