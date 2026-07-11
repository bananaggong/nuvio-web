"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ServerCog } from "lucide-react";
import type { SystemHealthSnapshot, SystemHealthStatus } from "@/lib/system-health";

type HealthResponse = {
  data?: SystemHealthSnapshot;
  error?: string;
};

const statusTone: Record<SystemHealthStatus, string> = {
  fail: "border-rose-200 bg-rose-50 text-rose-700",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
};

const statusLabel: Record<SystemHealthStatus, string> = {
  fail: "확인 필요",
  ok: "정상",
  warn: "주의",
};

export function AdminSystemHealthPanel() {
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadHealth();
  }, []);

  async function loadHealth() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/system-health", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as HealthResponse;

      if (!response.ok) {
        throw new Error(payload.error || "시스템 상태를 불러오지 못했습니다.");
      }

      setSnapshot(payload.data ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "시스템 상태를 불러오지 못했습니다.",
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
              <ServerCog size={18} />
              시스템 상태
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              운영 환경 점검
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              배포 후 놓치기 쉬운 환경변수, DB 연결, 알림 큐와 감사 로그 상태를
              안전하게 요약합니다. 실제 secret 값은 노출하지 않습니다.
            </p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            disabled={loading}
            onClick={() => void loadHealth()}
            type="button"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
            새로고침
          </button>
        </div>
      </section>

      {error ? (
        <p className="mt-5 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </p>
      ) : null}

      {snapshot ? (
        <>
          <section className="mt-5 rounded-md border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black text-slate-500">전체 상태</p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {statusLabel[snapshot.status]}
                </p>
              </div>
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-black ${
                  statusTone[snapshot.status]
                }`}
              >
                {snapshot.status === "ok" ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <AlertTriangle size={17} />
                )}
                {formatDateTime(snapshot.generatedAt)}
              </span>
            </div>
          </section>

          {snapshot.metrics.length > 0 ? (
            <section className="mt-5 grid gap-3 md:grid-cols-3">
              {snapshot.metrics.map((metric) => (
                <div
                  className="rounded-md border border-slate-200 bg-white p-4"
                  key={metric.label}
                >
                  <p className="text-xs font-black text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-black text-slate-950">
                    {metric.value}
                  </p>
                </div>
              ))}
            </section>
          ) : null}

          <section className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-black text-slate-950">점검 항목</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {snapshot.checks.map((check) => (
                <div
                  className="grid gap-3 px-5 py-4 md:grid-cols-[220px_120px_minmax(0,1fr)] md:items-center"
                  key={check.id}
                >
                  <p className="font-black text-slate-950">{check.label}</p>
                  <span
                    className={`inline-flex w-fit items-center rounded-md border px-2 py-1 text-xs font-black ${
                      statusTone[check.status]
                    }`}
                  >
                    {statusLabel[check.status]}
                  </span>
                  <p className="text-sm font-bold text-slate-500">{check.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : loading ? (
        <p className="mt-5 rounded-md border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500">
          시스템 상태를 확인하는 중입니다.
        </p>
      ) : null}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
