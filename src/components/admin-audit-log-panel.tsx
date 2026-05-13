"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, ShieldCheck } from "lucide-react";
import type { AuditLog } from "@/lib/audit-log-db";

type AuditLogResponse = {
  data?: AuditLog[];
  error?: string;
};

export function AdminAuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const groupedActions = useMemo(() => {
    const actions = new Map<string, number>();
    for (const log of logs) {
      actions.set(log.action, (actions.get(log.action) ?? 0) + 1);
    }

    return Array.from(actions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [logs]);

  useEffect(() => {
    void loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/audit-logs?limit=80", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as AuditLogResponse;

      if (!response.ok) {
        throw new Error(payload.error || "감사 로그를 불러오지 못했습니다.");
      }

      setLogs(payload.data ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "감사 로그를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <section className="border-b border-slate-200 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
              <ShieldCheck size={18} />
              운영 감사 로그
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              주요 운영 변경 이력
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              신청 상태 변경, 프로그램 수정, 공고 소스 변경처럼 운영자가 수행한
              주요 액션을 시간순으로 확인합니다.
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            disabled={loading}
            onClick={() => void loadLogs()}
            type="button"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
            새로고침
          </button>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-3">
        <Metric label="표시된 로그" value={`${logs.length}건`} />
        <Metric label="액션 유형" value={`${groupedActions.length}개`} />
        <Metric
          label="최근 기록"
          value={logs[0] ? formatDate(logs[0].createdAt) : "-"}
        />
      </section>

      {groupedActions.length > 0 ? (
        <section className="mt-5 rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-black text-slate-950">자주 발생한 액션</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {groupedActions.map(([action, count]) => (
              <span
                className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                key={action}
              >
                {action}
                <span className="font-mono text-slate-500">{count}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Activity className="text-[var(--primary)]" size={20} />
            최근 로그
          </h2>
        </div>

        {error ? (
          <p className="m-5 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="p-5 text-sm font-bold text-slate-500">
            감사 로그를 불러오는 중입니다.
          </p>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-slate-500">
                  <th className="px-5 py-3">시간</th>
                  <th className="px-5 py-3">액션</th>
                  <th className="px-5 py-3">대상</th>
                  <th className="px-5 py-3">수행자</th>
                  <th className="px-5 py-3">메타데이터</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    className="border-b border-slate-100 align-top last:border-0"
                    key={log.id}
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-bold text-slate-500">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">{log.entityType}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {log.entityId || "-"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">
                        {log.actorName || log.actorEmail || "system"}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {log.actorEmail || log.actorId || "-"}
                      </p>
                    </td>
                    <td className="max-w-md px-5 py-4">
                      <code className="block overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                        {formatMetadata(log.metadata)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-sm font-bold text-slate-500">
            아직 기록된 감사 로그가 없습니다.
          </p>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-2xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function formatMetadata(metadata: Record<string, unknown>) {
  const text = JSON.stringify(metadata);
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}
