"use client";

import Link from "next/link";
import { ExternalLink, RadioTower, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

type AnnouncementSourceMeta = {
  id: string;
  name: string;
  url: string;
  itemCount: number;
  error?: string;
};

type AnnouncementResponse = {
  meta?: {
    externalCount?: number;
    refreshSeconds?: number;
    sources?: AnnouncementSourceMeta[];
  };
};

export function AnnouncementSourceMonitor() {
  const [sources, setSources] = useState<AnnouncementSourceMeta[]>([]);
  const [externalCount, setExternalCount] = useState(0);
  const [refreshSeconds, setRefreshSeconds] = useState(300);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSources() {
      try {
        const response = await fetch("/api/announcements", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json()) as AnnouncementResponse;

        if (active) {
          setSources(payload.meta?.sources ?? []);
          setExternalCount(payload.meta?.externalCount ?? 0);
          setRefreshSeconds(payload.meta?.refreshSeconds ?? 300);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSources();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <RadioTower className="text-[var(--primary)]" size={20} />
            외부 소스 상태
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            공개 RSS/API 소스의 수집 성공 여부와 수집 건수를 확인합니다.
          </p>
        </div>
        <span className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-xs font-black text-slate-600">
          {externalCount}건 · {Math.round(refreshSeconds / 60)}분 주기
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {loading ? (
          <p className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-300 p-3 text-sm font-bold text-slate-500">
            <RotateCw className="animate-spin" size={16} />
            소스 상태를 확인하는 중입니다.
          </p>
        ) : sources.length > 0 ? (
          sources.map((source) => (
            <div
              className="flex flex-col gap-3 rounded-md bg-[var(--surface-muted)] p-3 sm:flex-row sm:items-center sm:justify-between"
              key={source.id}
            >
              <div className="min-w-0">
                <p className="font-black text-slate-950">{source.name}</p>
                <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">
                  {source.error ? `오류: ${source.error}` : `${source.itemCount}건 수집`}
                </p>
              </div>
              <Link
                className="inline-flex min-w-fit items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                RSS
                <ExternalLink size={13} />
              </Link>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            활성화된 외부 소스가 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
