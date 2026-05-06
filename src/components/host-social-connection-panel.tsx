"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlugZap,
  RefreshCw,
} from "lucide-react";

type SocialConnection = {
  pageName?: string;
  instagramUsername?: string;
  tokenExpiresAt?: string;
  lastSyncedAt?: string;
  lastSyncError?: string;
  status: string;
};

type StatusPayload = {
  data?: {
    configured: boolean;
    connected: boolean;
    connectUrl: string;
    connection: SocialConnection | null;
  };
  error?: string;
};

type ImportPayload = {
  data?: {
    imported: number;
  };
  error?: string;
};

export function HostSocialConnectionPanel({
  villageSlug = "boseong",
}: {
  villageSlug?: string;
}) {
  const [status, setStatus] = useState<StatusPayload["data"] | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const statusUrl = useMemo(
    () => `/api/host/facebook/status?villageSlug=${encodeURIComponent(villageSlug)}`,
    [villageSlug],
  );

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      setLoading(true);
      try {
        const response = await fetch(statusUrl, { cache: "no-store" });
        const payload = (await response.json()) as StatusPayload;
        if (!active) return;

        setStatus(payload.data ?? null);
        setMessage(payload.error ?? "");
      } catch (error) {
        if (!active) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "Facebook 연결 상태를 불러오지 못했습니다.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadStatus();

    return () => {
      active = false;
    };
  }, [statusUrl]);

  async function importInstagramMedia() {
    setImporting(true);
    setMessage("");

    try {
      const response = await fetch("/api/host/instagram/import", {
        body: JSON.stringify({ villageSlug, limit: 24 }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as ImportPayload;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Instagram 콘텐츠를 가져오지 못했습니다.");
      }

      setMessage(`Instagram 콘텐츠 ${payload.data.imported}건을 반영했습니다.`);
      const refreshed = await fetch(statusUrl, { cache: "no-store" });
      const refreshedPayload = (await refreshed.json()) as StatusPayload;
      setStatus(refreshedPayload.data ?? status);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Instagram 콘텐츠를 가져오지 못했습니다.",
      );
    } finally {
      setImporting(false);
    }
  }

  const connection = status?.connection;
  const connected = Boolean(status?.connected && connection);

  return (
    <section className="mt-6 border border-slate-200 bg-white p-5 md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-sm font-black text-teal-700">
            {connected ? <CheckCircle2 size={18} /> : <PlugZap size={18} />}
            <span>Instagram 공식 연동</span>
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Facebook으로 연결하기
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            그린티모시레가 Meta 권한을 승인하면 릴스와 게시물의 캡션, 링크,
            썸네일을 전체차LAB 미디어로 가져올 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {status?.configured ? (
            <a
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white"
              href={status.connectUrl}
            >
              <ExternalLink size={16} />
              {connected ? "다시 연결" : "Facebook으로 연결하기"}
            </a>
          ) : (
            <span className="inline-flex h-10 items-center rounded-md border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-950">
              Meta 앱 환경변수 필요
            </span>
          )}
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!connected || importing}
            onClick={importInstagramMedia}
            type="button"
          >
            {importing ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Instagram 가져오기
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <StatusTile
          label="연결 상태"
          value={loading ? "확인 중" : connected ? "연결됨" : "미연결"}
        />
        <StatusTile
          label="Instagram 계정"
          value={
            connection?.instagramUsername
              ? `@${connection.instagramUsername}`
              : "권한 승인 후 표시"
          }
        />
        <StatusTile
          label="최근 가져오기"
          value={
            connection?.lastSyncedAt
              ? new Date(connection.lastSyncedAt).toLocaleString("ko-KR")
              : "아직 없음"
          }
        />
      </div>

      {connection?.pageName ? (
        <p className="mt-4 text-sm text-slate-600">
          연결된 Facebook 페이지:{" "}
          <span className="font-black text-slate-950">{connection.pageName}</span>
          {connection.tokenExpiresAt ? (
            <>
              {" "}
              · 토큰 만료 예상:{" "}
              {new Date(connection.tokenExpiresAt).toLocaleDateString("ko-KR")}
            </>
          ) : null}
        </p>
      ) : null}

      {connection?.lastSyncError ? (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-900">
          최근 가져오기 오류: {connection.lastSyncError}
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
