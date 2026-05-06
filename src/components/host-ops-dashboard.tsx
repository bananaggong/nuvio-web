"use client";

import Link from "next/link";
import {
  Check,
  ClipboardList,
  FileDown,
  FilePlus2,
  FileText,
  Globe2,
  MailCheck,
  MessageSquareText,
  ReceiptText,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  applicationStatusFlow,
  applicationStatusLabels,
  buildHostReportCsv,
  buildReportMetrics,
  mergeHostApplications,
  seedMessageTemplates,
  readHostApplicationsFromStorage,
  summarizeApplications,
  writeHostApplicationsToStorage,
} from "@/lib/host-operations";
import type {
  HostApplication,
  HostApplicationStatus,
  MessageTemplate,
} from "@/lib/host-operations";

const TEMPLATE_STORAGE_KEY = "nuvio:message-templates";

const tabs = [
  { key: "applications", label: "신청 관리", icon: ClipboardList },
  { key: "messages", label: "안내 발송", icon: MessageSquareText },
  { key: "evidence", label: "증빙/리뷰", icon: ReceiptText },
  { key: "reports", label: "보고서", icon: FileText },
] as const;
const applicationStatusOptions: HostApplicationStatus[] = [
  ...applicationStatusFlow,
  "rejected",
];

type HostTab = (typeof tabs)[number]["key"];

export function HostOpsDashboard() {
  const [activeTab, setActiveTab] = useState<HostTab>("applications");
  const [applications, setApplications] = useState<HostApplication[]>(
    readStoredApplications,
  );
  const [templates] = useState<MessageTemplate[]>(readStoredTemplates);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string>();
  const summary = useMemo(() => summarizeApplications(applications), [applications]);
  const reportMetrics = useMemo(
    () => buildReportMetrics(applications),
    [applications],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteApplications() {
      try {
        const response = await fetch("/api/host/applications", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { data?: HostApplication[] };
        if (!payload.data || cancelled) return;

        setApplications((current) =>
          mergeHostApplications(current, payload.data ?? []),
        );
      } catch {
        // The console keeps the local fallback data when the DB is unavailable.
      }
    }

    void loadRemoteApplications();

    return () => {
      cancelled = true;
    };
  }, []);

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

  function downloadReportCsv() {
    const blob = new Blob([buildHostReportCsv(applications)], {
      type: "text/csv;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nuvio-host-report.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <section className="overflow-hidden rounded-md bg-slate-950 p-6 text-white md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black text-teal-200">
              <ShieldCheck size={18} />
              호스트 운영 콘솔
            </p>
            <h1 className="mt-4 max-w-full text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
              <span className="block">모집부터 보고까지</span>
              <span className="block">한 번에 관리합니다.</span>
            </h1>
            <p className="mt-3 max-w-3xl break-all text-sm leading-7 text-slate-300 md:text-base">
              <span className="block">
                DB 연결 전에는 임시 운영 데이터로 동작합니다.
              </span>
              <span className="block">
                연결 후에는 신청자 DB, 메시지, 증빙,
              </span>
              <span className="block">
                보고서 이력이 서버로 이전됩니다.
              </span>
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-slate-950 hover:bg-slate-100"
              href="/host/boseong"
            >
              <ClipboardList size={17} />
              전체차LAB 운영
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-slate-950 hover:bg-slate-100"
              href="/host/villages"
            >
              <Globe2 size={17} />
              마을 홈
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-slate-950 hover:bg-slate-100"
              href="/host/programs"
            >
              <ClipboardList size={17} />
              프로그램 스튜디오
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-slate-950 hover:bg-slate-100"
              href="/host/forms"
            >
              <FilePlus2 size={17} />
              신청서 빌더
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/20 px-4 text-sm font-black text-white hover:bg-white/10"
              href="/host/reports"
            >
              <FileText size={17} />
              보고 자동화
            </Link>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/20 px-4 text-sm font-black text-white hover:bg-white/10"
              onClick={downloadReportCsv}
              type="button"
            >
              <FileDown size={17} />
              보고 CSV
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        {reportMetrics.map((metric) => (
          <div
            className="rounded-md border border-slate-200 bg-white p-4"
            key={metric.label}
          >
            <p className="text-xs font-black text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{metric.value}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{metric.helper}</p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                aria-pressed={active}
                className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-black ${
                  active
                    ? "bg-[var(--primary)] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                }`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "applications" ? (
        <ApplicationPanel
          applications={applications}
          onStatusChange={updateApplicationStatus}
        />
      ) : null}
      {activeTab === "messages" ? (
        <MessagePanel
          copiedTemplateId={copiedTemplateId}
          onCopyTemplate={copyTemplate}
          templates={templates}
        />
      ) : null}
      {activeTab === "evidence" ? (
        <EvidencePanel
          applications={applications}
          onToggleFlag={toggleApplicationFlag}
        />
      ) : null}
      {activeTab === "reports" ? (
        <ReportPanel
          applications={applications}
          onDownloadReportCsv={downloadReportCsv}
          summary={summary}
        />
      ) : null}
    </div>
  );
}

function ApplicationPanel({
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
    <section className="mt-6 rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <Users className="text-[var(--primary)]" size={20} />
            신청자 파이프라인
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            합격 처리, 참여 상태, 운영 메모를 한 테이블에서 확인합니다.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-black text-slate-500">
              <th className="py-3 pr-4">신청자</th>
              <th className="py-3 pr-4">프로그램</th>
              <th className="py-3 pr-4">상태</th>
              <th className="py-3 pr-4">결제</th>
              <th className="py-3 pr-4">증빙</th>
              <th className="py-3 pr-4">메모</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr
                className="border-b border-slate-100 align-top last:border-0"
                key={application.id}
              >
                <td className="py-4 pr-4">
                  <p className="font-black text-slate-950">
                    {application.applicantName}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {application.phone}
                  </p>
                </td>
                <td className="py-4 pr-4">
                  <p className="font-bold text-slate-700">{application.programTitle}</p>
                  <p className="mt-1 text-xs text-slate-500">{application.email}</p>
                </td>
                <td className="py-4 pr-4">
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
                <td className="py-4 pr-4 font-bold text-slate-700">
                  {application.paymentAmount.toLocaleString("ko-KR")}원
                </td>
                <td className="py-4 pr-4">
                  <div className="flex flex-wrap gap-1">
                    <StatusChip
                      active={application.signatureCompleted}
                      label="서명"
                    />
                    <StatusChip
                      active={application.receiptCount > 0}
                      label={`영수증 ${application.receiptCount}`}
                    />
                    <StatusChip active={application.reviewSubmitted} label="리뷰" />
                  </div>
                </td>
                <td className="max-w-[220px] py-4 pr-4 text-xs leading-5 text-slate-500">
                  {application.memo}
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
    <section className="mt-6 grid gap-3">
      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <MessageSquareText className="text-[var(--primary)]" size={20} />
            안내 메시지 템플릿
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            상태별 수신자 큐와 예약 발송은 자동화 센터에서 관리합니다.
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-black text-white"
          href="/host/messages"
        >
          <Send size={16} />
          메시지 자동화
        </Link>
      </div>
      {templates.map((template) => (
        <article
          className="rounded-md border border-slate-200 bg-white p-5"
          key={template.id}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black text-[var(--primary)]">
                {template.trigger}
              </p>
              <h2 className="mt-2 text-lg font-black text-slate-950">
                {template.name}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {template.body}
              </p>
            </div>
            <button
              className="inline-flex h-10 min-w-fit items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              onClick={() => void onCopyTemplate(template)}
              type="button"
            >
              {copiedTemplateId === template.id ? <Check size={16} /> : <Send size={16} />}
              {copiedTemplateId === template.id ? "복사됨" : "템플릿 복사"}
            </button>
          </div>
        </article>
      ))}
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
  return (
    <section className="mt-6 rounded-md border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
        <MailCheck className="text-[var(--primary)]" size={20} />
        증빙과 리뷰 체크리스트
      </h2>
      <div className="mt-4 grid gap-3">
        {applications.map((application) => (
          <div
            className="grid gap-3 rounded-md bg-[var(--surface-muted)] p-4 md:grid-cols-[1fr_auto]"
            key={application.id}
          >
            <div>
              <p className="font-black text-slate-950">{application.applicantName}</p>
              <p className="mt-1 text-sm text-slate-600">{application.programTitle}</p>
              <p className="mt-2 text-xs font-bold text-slate-500">
                영수증 {application.receiptCount}건 · 결제{" "}
                {application.paymentAmount.toLocaleString("ko-KR")}원
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`rounded-md px-3 py-2 text-xs font-black ${
                  application.signatureCompleted
                    ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
                onClick={() => onToggleFlag(application.id, "signatureCompleted")}
                type="button"
              >
                서명 {application.signatureCompleted ? "완료" : "대기"}
              </button>
              <button
                className={`rounded-md px-3 py-2 text-xs font-black ${
                  application.reviewSubmitted
                    ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
                onClick={() => onToggleFlag(application.id, "reviewSubmitted")}
                type="button"
              >
                리뷰 {application.reviewSubmitted ? "완료" : "대기"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportPanel({
  applications,
  summary,
  onDownloadReportCsv,
}: {
  applications: HostApplication[];
  summary: ReturnType<typeof summarizeApplications>;
  onDownloadReportCsv: () => void;
}) {
  const missingItems = applications.filter(
    (application) =>
      !application.signatureCompleted ||
      application.receiptCount === 0 ||
      !application.reviewSubmitted,
  );

  return (
    <section className="mt-6 rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            제출 보고서 준비 현황
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            L3 ERP에서는 이 데이터를 정부/기업 제출 양식으로 자동 변환합니다.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-black text-white"
            href="/host/reports"
          >
            <FileText size={16} />
            보고 자동화
          </Link>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700"
            onClick={onDownloadReportCsv}
            type="button"
          >
            <FileDown size={16} />
            CSV 내보내기
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <ReportBlock
          label="서명 완료"
          value={`${summary.signatureCount}/${summary.total}`}
        />
        <ReportBlock label="영수증" value={`${summary.receiptCount}건`} />
        <ReportBlock
          label="리뷰 완료"
          value={`${summary.reviewCount}/${summary.total}`}
        />
      </div>

      <div className="mt-5 rounded-md bg-[var(--surface-muted)] p-4">
        <p className="font-black text-slate-950">보완 필요 항목</p>
        <div className="mt-3 grid gap-2">
          {missingItems.length > 0 ? (
            missingItems.map((application) => (
              <p
                className="rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-600"
                key={application.id}
              >
                {application.applicantName} ·{" "}
                {!application.signatureCompleted ? "서명 " : ""}
                {application.receiptCount === 0 ? "영수증 " : ""}
                {!application.reviewSubmitted ? "리뷰" : ""}
              </p>
            ))
          ) : (
            <p className="rounded-md bg-white px-3 py-2 text-sm font-bold text-teal-700">
              모든 참여자의 필수 보고 자료가 준비되었습니다.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function StatusChip({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`rounded-md px-2 py-1 text-[11px] font-black ${
        active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}

function ReportBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--surface-muted)] p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
