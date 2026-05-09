"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FilePlus2,
  FileText,
  Globe2,
  MailCheck,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  applicationStatusFlow,
  applicationStatusLabels,
  mergeHostApplications,
  readHostApplicationsFromStorage,
  seedMessageTemplates,
  seedHostApplications,
  summarizeApplications,
  writeHostApplicationsToStorage,
} from "@/lib/host-operations";
import type {
  HostApplication,
  HostApplicationStatus,
  MessageTemplate,
} from "@/lib/host-operations";

const TEMPLATE_STORAGE_KEY = "nuvio:message-templates";

const applicationStatusOptions: HostApplicationStatus[] = [
  ...applicationStatusFlow,
  "rejected",
];

const quickActions = [
  {
    href: "/host/applications",
    label: "신청자 CRM",
    helper: "신청자 검색, 상태 변경, 상세 응답 검토",
    icon: Users,
  },
  {
    href: "/host/programs",
    label: "프로그램 스튜디오",
    helper: "공급 데이터 등록과 공개 발행",
    icon: ClipboardList,
  },
  {
    href: "/host/forms",
    label: "신청서 빌더",
    helper: "프로그램별 질문과 답변 항목 구성",
    icon: FilePlus2,
  },
  {
    href: "/host/reports",
    label: "운영 마감",
    helper: "지출, 증빙, 활동 기록으로 마감 준비",
    icon: FileText,
  },
  {
    href: "/host/villages",
    label: "마을 홈",
    helper: "마을 사이트, 연락처, 프로그램 노출 관리",
    icon: Globe2,
  },
] as const;

export function HostOpsDashboard() {
  const [applications, setApplications] = useState<HostApplication[]>(
    seedHostApplications,
  );
  const [templates, setTemplates] =
    useState<MessageTemplate[]>(seedMessageTemplates);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const storageTimeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setApplications(readStoredApplications());
      setTemplates(readStoredTemplates());
    }, 0);

    async function loadRemoteApplications() {
      try {
        const response = await fetch("/api/host/applications", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { data?: HostApplication[] };
        if (!payload.data || cancelled) return;

        setApplications((current) => {
          const next = mergeHostApplications(current, payload.data ?? []);
          writeHostApplicationsToStorage(next);
          return next;
        });
      } catch {
        // Keep the local fallback data visible while the DB is unavailable.
      }
    }

    void loadRemoteApplications();

    return () => {
      cancelled = true;
      window.clearTimeout(storageTimeoutId);
    };
  }, []);

  const summary = useMemo(() => summarizeApplications(applications), [applications]);
  const pendingCount = useMemo(
    () =>
      applications.filter((application) =>
        ["submitted", "screening"].includes(application.status),
      ).length,
    [applications],
  );
  const activeCount = summary.accepted + summary.checkedIn + summary.completed;
  const reportReadyCount = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.signatureCompleted && application.reviewSubmitted,
      ).length,
    [applications],
  );
  const readinessRate =
    applications.length === 0
      ? 0
      : Math.round((reportReadyCount / applications.length) * 100);
  const recentApplications = useMemo(
    () => applications.slice(0, 5),
    [applications],
  );

  const metrics = [
    {
      label: "전체 신청",
      value: `${summary.total}명`,
      helper: "접수된 신청서",
      icon: ClipboardList,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "검토 대기",
      value: `${pendingCount}명`,
      helper: "접수 또는 검토 상태",
      icon: Clock3,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "선정 이후",
      value: `${activeCount}명`,
      helper: "선정, 참여중, 완료",
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "참여 자료",
      value: `${readinessRate}%`,
      helper: "서명과 리뷰 기준",
      icon: FileText,
      tone: "bg-indigo-50 text-indigo-700",
    },
  ];

  function updateApplicationStatus(
    applicationId: string,
    status: HostApplicationStatus,
  ) {
    const next = applications.map((application) =>
      application.id === applicationId ? { ...application, status } : application,
    );
    setApplications(next);
    writeHostApplicationsToStorage(next);
    void persistApplicationStatus(applicationId, status);
  }

  function toggleApplicationFlag(
    applicationId: string,
    key: "signatureCompleted" | "reviewSubmitted",
  ) {
    const next = applications.map((application) =>
      application.id === applicationId
        ? { ...application, [key]: !application[key] }
        : application,
    );
    setApplications(next);
    writeHostApplicationsToStorage(next);
  }

  async function copyTemplate(template: MessageTemplate) {
    await navigator.clipboard.writeText(template.body);
    setCopiedTemplateId(template.id);
    window.setTimeout(() => setCopiedTemplateId(undefined), 1600);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-md border border-slate-200 bg-white p-6">
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <ShieldCheck size={18} />
            호스트 운영 대시보드
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
                모집부터 참여 완료까지, 오늘 봐야 할 운영 큐를 모았습니다.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                레거시 운영 화면의 카드형 대시보드 구조를 누비오 흐름에 맞춰
                재구성했습니다. 신청자 검토, 메시지, 서명, 리뷰, 활동/증빙
                마감 준비를 먼저 연결하고 수동 입금 체크는 제외했습니다.
              </p>
            </div>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white hover:bg-[var(--primary-strong)]"
              href="/host/applications"
            >
              신청자 CRM 열기
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-sm font-black text-slate-950">오늘의 운영 체크</p>
          <div className="mt-4 grid gap-3">
            <ChecklistRow
              href="/host/applications"
              label="검토 대기 신청자"
              value={`${pendingCount}명`}
            />
            <ChecklistRow
              href="/host/messages"
              label="발송 가능한 템플릿"
              value={`${templates.length}개`}
            />
            <ChecklistRow
              href="/host/reports"
              label="마감 준비율"
              value={`${readinessRate}%`}
            />
          </div>
        </section>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              className="rounded-md border border-slate-200 bg-white p-4"
              key={metric.label}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-2 font-mono text-3xl font-black text-slate-950">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {metric.helper}
                  </p>
                </div>
                <span className={`grid size-10 place-items-center rounded-md ${metric.tone}`}>
                  <Icon size={20} />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RecentApplicationsPanel
          applications={recentApplications}
          onStatusChange={updateApplicationStatus}
        />

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">빠른 이동</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                운영자가 자주 여는 화면
              </p>
            </div>
            <Sparkles className="text-[var(--primary)]" size={20} />
          </div>
          <div className="mt-4 grid gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  className="grid grid-cols-[36px_minmax(0,1fr)_16px] items-center gap-3 rounded-md border border-slate-200 p-3 hover:border-[var(--primary)] hover:bg-teal-50"
                  href={action.href}
                  key={action.href}
                >
                  <span className="grid size-9 place-items-center rounded-md bg-slate-100 text-[var(--primary)]">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-slate-950">
                      {action.label}
                    </span>
                    <span className="mt-1 block truncate text-xs font-bold text-slate-500">
                      {action.helper}
                    </span>
                  </span>
                  <ArrowRight size={15} className="text-slate-400" />
                </Link>
              );
            })}
          </div>
        </section>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <MessagePanel
          copiedTemplateId={copiedTemplateId}
          onCopyTemplate={copyTemplate}
          templates={templates}
        />
        <EvidencePanel
          applications={applications}
          onToggleFlag={toggleApplicationFlag}
        />
        <ReportPanel applications={applications} readyCount={reportReadyCount} />
      </section>
    </div>
  );
}

function RecentApplicationsPanel({
  applications,
  onStatusChange,
}: {
  applications: HostApplication[];
  onStatusChange: (
    applicationId: string,
    status: HostApplicationStatus,
  ) => void;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Users className="text-[var(--primary)]" size={20} />
            최근 신청자 파이프라인
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            최근 접수된 신청자부터 상태를 빠르게 확인합니다.
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          href="/host/applications"
        >
          전체 보기
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-black text-slate-500">
              <th className="px-5 py-3">신청자</th>
              <th className="px-5 py-3">프로그램</th>
              <th className="px-5 py-3">상태</th>
              <th className="px-5 py-3">운영 메모</th>
              <th className="px-5 py-3 text-right">상세</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr
                className="border-b border-slate-100 align-top last:border-0"
                key={application.id}
              >
                <td className="px-5 py-4">
                  <p className="font-black text-slate-950">
                    {application.applicantName}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {application.phone || application.email}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-700">
                    {application.programTitle}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {formatDate(application.submittedAt)}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-black text-slate-700"
                    onChange={(event) =>
                      onStatusChange(
                        application.id,
                        event.target.value as HostApplicationStatus,
                      )
                    }
                    value={application.status}
                  >
                    {applicationStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {applicationStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="max-w-[280px] px-5 py-4 text-xs leading-5 text-slate-500">
                  {application.memo || "메모 없음"}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    href={`/host/applications/${application.id}`}
                  >
                    상세
                    <ArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MessagePanel({
  templates,
  copiedTemplateId,
  onCopyTemplate,
}: {
  templates: MessageTemplate[];
  copiedTemplateId?: string;
  onCopyTemplate: (template: MessageTemplate) => Promise<void>;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <MessageSquareText className="text-[var(--primary)]" size={20} />
            안내 메시지
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            상태별 안내 문구를 복사하거나 자동화 화면으로 이어갑니다.
          </p>
        </div>
        <Link
          className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          href="/host/messages"
          title="메시지 자동화"
        >
          <ArrowRight size={17} />
        </Link>
      </div>
      <div className="mt-4 grid gap-3">
        {templates.slice(0, 3).map((template) => (
          <article className="rounded-md bg-slate-50 p-3" key={template.id}>
            <p className="text-xs font-black text-[var(--primary)]">
              {template.trigger}
            </p>
            <p className="mt-1 font-black text-slate-950">{template.name}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
              {template.body}
            </p>
            <button
              className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-white px-3 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:text-[var(--primary)]"
              onClick={() => void onCopyTemplate(template)}
              type="button"
            >
              {copiedTemplateId === template.id ? <Check size={15} /> : <Send size={15} />}
              {copiedTemplateId === template.id ? "복사됨" : "복사"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function EvidencePanel({
  applications,
  onToggleFlag,
}: {
  applications: HostApplication[];
  onToggleFlag: (
    applicationId: string,
    key: "signatureCompleted" | "reviewSubmitted",
  ) => void;
}) {
  const targets = applications
    .filter(
      (application) =>
        application.status !== "rejected" &&
        (!application.signatureCompleted || !application.reviewSubmitted),
    )
    .slice(0, 4);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <MailCheck className="text-[var(--primary)]" size={20} />
        서명/리뷰 체크
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        참여 확정 이후 필요한 서명과 후기 제출 상태만 확인합니다.
      </p>

      <div className="mt-4 grid gap-3">
        {targets.length > 0 ? (
          targets.map((application) => (
            <div className="rounded-md bg-slate-50 p-3" key={application.id}>
              <p className="font-black text-slate-950">
                {application.applicantName}
              </p>
              <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">
                {application.programTitle}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <FlagButton
                  active={application.signatureCompleted}
                  label="서명"
                  onClick={() =>
                    onToggleFlag(application.id, "signatureCompleted")
                  }
                />
                <FlagButton
                  active={application.reviewSubmitted}
                  label="리뷰"
                  onClick={() => onToggleFlag(application.id, "reviewSubmitted")}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm font-bold text-teal-700">
            보완이 필요한 서명/리뷰 항목이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

function ReportPanel({
  applications,
  readyCount,
}: {
  applications: HostApplication[];
  readyCount: number;
}) {
  const missingItems = applications
    .filter(
      (application) =>
        application.status !== "rejected" &&
        (!application.signatureCompleted || !application.reviewSubmitted),
    )
    .slice(0, 5);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <FileText className="text-[var(--primary)]" size={20} />
            운영 마감 준비
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            참여 서명과 리뷰는 참고 자료로 보고, 상세 마감은 지출/증빙 화면에서
            관리합니다.
          </p>
        </div>
        <Link
          className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          href="/host/reports"
          title="운영 마감 열기"
        >
          <ArrowRight size={17} />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ReportBlock label="준비 완료" value={`${readyCount}명`} />
        <ReportBlock label="전체 대상" value={`${applications.length}명`} />
      </div>

      <div className="mt-4 grid gap-2">
        {missingItems.length > 0 ? (
          missingItems.map((application) => (
            <p
              className="rounded-md bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600"
              key={application.id}
            >
              {application.applicantName} ·{" "}
              {!application.signatureCompleted ? "서명 " : ""}
              {!application.reviewSubmitted ? "리뷰" : ""}
            </p>
          ))
        ) : (
          <p className="rounded-md bg-teal-50 px-3 py-2 text-sm font-bold text-teal-700">
            모든 참여자의 서명과 리뷰가 준비되었습니다.
          </p>
        )}
      </div>
    </section>
  );
}

function ChecklistRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2.5 hover:border-[var(--primary)] hover:bg-teal-50"
      href={href}
    >
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <span className="font-mono text-lg font-black text-slate-950">{value}</span>
    </Link>
  );
}

function FlagButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-black ${
        active
          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
          : "bg-white text-slate-600 ring-1 ring-slate-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {label} {active ? "완료" : "대기"}
    </button>
  );
}

function ReportBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function readStoredApplications(): HostApplication[] {
  return readHostApplicationsFromStorage();
}

function readStoredTemplates(): MessageTemplate[] {
  if (typeof window === "undefined") return seedMessageTemplates;

  try {
    const rawValue = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!rawValue) return seedMessageTemplates;
    return JSON.parse(rawValue) as MessageTemplate[];
  } catch {
    return seedMessageTemplates;
  }
}

async function persistApplicationStatus(
  applicationId: string,
  status: HostApplicationStatus,
) {
  if (!isUuid(applicationId)) return;

  await fetch(`/api/host/applications/${applicationId}`, {
    body: JSON.stringify({ status }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  }).catch(() => undefined);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
