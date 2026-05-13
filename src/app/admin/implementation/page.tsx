import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ExternalLink, ListChecks, Settings } from "lucide-react";
import {
  implementationStatus,
  summarizeImplementationStatus,
  type ImplementationState,
} from "@/lib/implementation-status";

export const metadata: Metadata = {
  title: "누비오 구현 현황",
  description: "누비오에 구현된 기능과 확인 경로를 한눈에 보는 내부 점검 화면입니다.",
};

const stateLabels: Record<ImplementationState, string> = {
  implemented: "구현 완료",
  manual_setup_required: "수동 설정 필요",
  ready_for_verification: "검증 준비",
};

const stateTone: Record<ImplementationState, string> = {
  implemented: "bg-teal-50 text-teal-700 ring-teal-200",
  manual_setup_required: "bg-amber-50 text-amber-800 ring-amber-200",
  ready_for_verification: "bg-sky-50 text-sky-700 ring-sky-200",
};

export default function ImplementationStatusPage() {
  const summary = summarizeImplementationStatus();

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <section className="rounded-md bg-slate-950 p-5 text-white">
        <p className="inline-flex items-center gap-2 text-sm font-black text-teal-200">
          <ListChecks size={18} />
          누비오 implementation map
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          구현된 기능과 확인 경로
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          기능별 상태, 직접 열어볼 수 있는 화면, 검증 방법을 한 곳에 모았습니다.
          마지막 정리일은 {implementationStatus.updatedAt}입니다.
        </p>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-4">
        <Metric label="전체 항목" value={summary.total} />
        <Metric label="구현 완료" value={summary.implemented} />
        <Metric label="검증 준비" value={summary.readyForVerification} />
        <Metric label="수동 설정" value={summary.manualSetupRequired} />
      </section>

      <div className="mt-6 grid gap-6">
        {implementationStatus.groups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-lg font-black text-slate-950">
              {group.title}
            </h2>
            <div className="grid gap-3">
              {group.items.map((item) => (
                <article
                  className="rounded-md border border-slate-200 bg-white p-4"
                  key={item.title}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-black ring-1 ${stateTone[item.state]}`}
                      >
                        {stateLabels[item.state]}
                      </span>
                      <h3 className="mt-2 text-base font-black text-slate-950">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {item.summary}
                      </p>
                    </div>
                    <CheckCircle2 className="text-[var(--primary)]" size={22} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.routes.map((route) => (
                      <Link
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                        href={route.href}
                        key={`${item.title}-${route.href}`}
                      >
                        {route.label}
                        <ExternalLink size={13} />
                      </Link>
                    ))}
                  </div>
                  <p className="mt-4 flex gap-2 rounded-md bg-[var(--surface-muted)] p-3 text-sm leading-6 text-slate-600">
                    <Settings className="mt-0.5 shrink-0 text-slate-400" size={16} />
                    {item.verification}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}
