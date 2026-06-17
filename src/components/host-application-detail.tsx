"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  applicationStatusFlow,
} from "@/lib/host-operations";
import type {
  HostApplication,
  HostApplicationStatus,
} from "@/lib/host-operations";
import {
  hostProgramPath,
  hostProjectPath,
  hostStandaloneProgramPath,
} from "@/lib/host-projects";
import { formatApplicationDisplayCode } from "@/lib/display-code";

type StatusEvent = {
  id: string;
  fromStatus: HostApplicationStatus | null;
  toStatus: HostApplicationStatus;
  note: string | null;
  createdAt: string;
};

type HostApplicationDetailData = HostApplication & {
  answers?: Record<string, unknown>;
  statusEvents?: StatusEvent[];
};

type AnswerEntry = {
  key: string;
  label: string;
  value: unknown;
};

const allStatuses: HostApplicationStatus[] = [
  ...applicationStatusFlow,
  "rejected",
];

const statusLabels: Record<HostApplicationStatus, string> = {
  submitted: "접수",
  screening: "검토",
  accepted: "선정",
  rejected: "반려",
  checkedIn: "참여중",
  completed: "완료",
};

export function HostApplicationDetail({
  applicationId,
  programId,
  projectId,
}: {
  applicationId: string;
  programId?: string;
  projectId?: string;
}) {
  const [application, setApplication] =
    useState<HostApplicationDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadApplication() {
      try {
        if (isUuid(applicationId)) {
          const response = await fetch(`/api/host/applications/${applicationId}`, {
            cache: "no-store",
          });

          if (response.ok) {
            const payload = (await response.json()) as {
              data?: HostApplicationDetailData;
            };
            if (payload.data && !cancelled) {
              setApplication(payload.data);
              return;
            }
          }
        }

        if (!cancelled) {
          setApplication(null);
        }
      } catch {
        if (!cancelled) {
          setApplication(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadApplication();

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const answerEntries = application?.answers
    ? buildAnswerEntries(application.answers)
    : [];
  const projectBasePath = projectId ? hostProjectPath(projectId) : undefined;
  const programBasePath =
    projectId && programId
      ? hostProgramPath(projectId, programId)
      : programId
        ? hostStandaloneProgramPath(programId)
        : undefined;
  const applicationsPath = programBasePath
    ? `${programBasePath}/applications`
    : projectBasePath
      ? `${projectBasePath}/applications`
      : "/host/applications";
  const hubPath = programBasePath ?? projectBasePath ?? "/host";

  function updateStatus(status: HostApplicationStatus) {
    if (!application) return;

    const nextApplication = { ...application, status };
    setApplication(nextApplication);

    void persistApplicationStatus(application.id, status);
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div className="rounded-md border border-slate-200 bg-white p-8 text-center">
          <Clock3 className="mx-auto animate-pulse text-[var(--primary)]" size={32} />
          <p className="mt-3 text-sm font-bold text-slate-500">
            신청서를 불러오는 중입니다.
          </p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href={applicationsPath}
        >
          <ArrowLeft size={16} />
          신청자 목록
        </Link>
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-10 text-center">
          <UserRound className="mx-auto text-slate-300" size={42} />
          <h1 className="mt-4 text-xl font-black text-slate-950">
            신청서를 찾을 수 없습니다
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href={applicationsPath}
        >
          <ArrowLeft size={16} />
          신청자 목록
        </Link>
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href={hubPath}
        >
          {programBasePath ? "프로그램 허브" : projectBasePath ? "폴더" : "운영 콘솔"}
        </Link>
      </div>


      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-6">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  신청서 응답
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  신청자가 제출한 답변입니다.
                </p>
              </div>
              <select
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
                onChange={(event) =>
                  updateStatus(event.target.value as HostApplicationStatus)
                }
                value={application.status}
              >
                {allStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 grid gap-3">
              {answerEntries.length > 0 ? (
                answerEntries.map((entry) => (
                  <div
                    className="rounded-md bg-[var(--surface-muted)] p-4"
                    key={entry.key}
                  >
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      {entry.label}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
                      {formatAnswer(entry.value)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-md bg-[var(--surface-muted)] p-4">
                  <p className="text-sm font-bold text-slate-500">
                    저장된 응답 필드가 없습니다. 기존 seed 신청서는 메모만 표시됩니다.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">운영 메모</h2>
            <p className="mt-3 rounded-md bg-[var(--surface-muted)] p-4 text-sm leading-7 text-slate-700">
              {application.memo || "아직 메모가 없습니다."}
            </p>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">신청자 정보</h2>
            <div className="mt-4 space-y-3">
              <InfoLine
                icon={CheckCircle2}
                label="신청번호"
                value={formatApplicationDisplayCode(application.id, application.submittedAt)}
              />
              <InfoLine icon={UserRound} label="이름" value={application.applicantName} />
              <InfoLine icon={Mail} label="이메일" value={application.email} />
              <InfoLine
                icon={Phone}
                label="연락처"
                value={application.phone || "연락처 없음"}
              />
              <InfoLine
                icon={Clock3}
                label="접수일"
                value={formatDateTime(application.submittedAt)}
              />
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">상태 기록</h2>
            <div className="mt-4 space-y-3">
              {application.statusEvents && application.statusEvents.length > 0 ? (
                application.statusEvents.map((event) => (
                  <div
                    className="rounded-md bg-[var(--surface-muted)] p-3"
                    key={event.id}
                  >
                    <p className="text-sm font-black text-slate-800">
                      {event.fromStatus
                        ? `${statusLabels[event.fromStatus]} -> ${statusLabels[event.toStatus]}`
                        : statusLabels[event.toStatus]}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {formatDateTime(event.createdAt)}
                    </p>
                    {event.note ? (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {event.note}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-md bg-[var(--surface-muted)] p-3">
                  <CheckCircle2 className="text-[var(--primary)]" size={18} />
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    아직 기록된 상태 변경 이력이 없습니다.
                  </p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md bg-[var(--surface-muted)] p-3">
      <Icon className="mt-0.5 text-[var(--primary)]" size={17} />
      <div>
        <p className="text-xs font-black text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-bold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function buildAnswerEntries(answers: Record<string, unknown>): AnswerEntry[] {
  const blockAnswers = asAnswerArray(answers.blockAnswers);
  if (blockAnswers.length > 0) {
    return blockAnswers.map((answer, index) => ({
      key: asString(answer.id) || `block-answer-${index}`,
      label: asString(answer.label) || `질문 ${index + 1}`,
      value: answer.value,
    }));
  }

  const templateAnswers = asAnswerArray(answers.templateAnswers);
  if (templateAnswers.length > 0) {
    return templateAnswers.map((answer, index) => ({
      key: asString(answer.id) || `template-answer-${index}`,
      label: asString(answer.label) || `질문 ${index + 1}`,
      value: answer.value,
    }));
  }

  return Object.entries(answers)
    .filter(([key, value]) => {
      if (["blockAnswers", "templateAnswers"].includes(key)) return false;
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    })
    .map(([key, value]) => ({
      key,
      label: humanizeKey(key),
      value,
    }));
}

function asAnswerArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function humanizeKey(key: string): string {
  const labels: Record<string, string> = {
    memo: "메모",
    motivation: "지원 동기",
    submittedAt: "접수일",
    workStyle: "업무 방식",
    receiptPlan: "증빙 계획",
  };

  return labels[key] ?? key;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
