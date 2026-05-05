"use client";

import Link from "next/link";
import { ExternalLink, Plus, RadioTower, RotateCw, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { useEffect, useState } from "react";

type AnnouncementSourceStatus = {
  id: string;
  name: string;
  type: "rss";
  url: string;
  enabled?: boolean;
  keywords?: string[];
  minimumKeywordMatches?: number;
  notes?: string;
  lastFetchedAt?: string;
  lastError?: string | null;
  itemCount: number;
};

type SourceDraft = {
  name: string;
  url: string;
  keywords: string;
  minimumKeywordMatches: string;
};

const initialDraft: SourceDraft = {
  name: "",
  url: "",
  keywords: "",
  minimumKeywordMatches: "0",
};

export function AnnouncementSourceMonitor() {
  const [sources, setSources] = useState<AnnouncementSourceStatus[]>([]);
  const [draft, setDraft] = useState<SourceDraft>(initialDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void loadSources();
  }, []);

  async function loadSources() {
    setLoading(true);
    try {
      const response = await fetch("/api/announcement-sources", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as {
        data?: AnnouncementSourceStatus[];
        error?: string;
      };

      if (!response.ok) throw new Error(payload.error ?? "Failed to load sources.");
      setSources(payload.data ?? []);
      setError(undefined);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "외부 소스 상태를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/announcement-sources", {
        body: JSON.stringify({
          name: draft.name,
          url: draft.url,
          keywords: draft.keywords,
          minimumKeywordMatches: Number(draft.minimumKeywordMatches),
          enabled: true,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: AnnouncementSourceStatus;
        error?: string;
      };

      if (!response.ok) throw new Error(payload.error ?? "Failed to save source.");
      setDraft(initialDraft);
      await loadSources();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "외부 소스를 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSource(source: AnnouncementSourceStatus) {
    const response = await fetch("/api/announcement-sources", {
      body: JSON.stringify({ id: source.id, enabled: source.enabled === false }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });

    if (response.ok) {
      await loadSources();
    }
  }

  const activeCount = sources.filter((source) => source.enabled !== false).length;
  const externalCount = sources.reduce((sum, source) => sum + source.itemCount, 0);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <RadioTower className="text-[var(--primary)]" size={20} />
            외부 공고 소스
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Cron이 주기적으로 수집하는 RSS/API 소스와 DB 적재 상태를 확인합니다.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          onClick={loadSources}
          type="button"
        >
          <RotateCw size={15} />
          새로고침
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="활성 소스" value={`${activeCount}개`} />
        <Metric label="저장 공고" value={`${externalCount}건`} />
        <Metric label="수집 주기" value="15분" />
      </div>

      <form
        className="mt-5 grid gap-3 rounded-md bg-[var(--surface-muted)] p-4"
        onSubmit={saveSource}
      >
        <p className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
          <Plus size={16} />
          새 RSS 소스 추가
        </p>
        <div className="grid gap-3 lg:grid-cols-[1fr_1.3fr]">
          <input
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--primary)]"
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="소스 이름"
            required
            value={draft.name}
          />
          <input
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--primary)]"
            onChange={(event) =>
              setDraft((current) => ({ ...current, url: event.target.value }))
            }
            placeholder="RSS 또는 XML URL"
            required
            type="url"
            value={draft.url}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
          <input
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--primary)]"
            onChange={(event) =>
              setDraft((current) => ({ ...current, keywords: event.target.value }))
            }
            placeholder="키워드, 쉼표로 구분"
            value={draft.keywords}
          />
          <input
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--primary)]"
            min={0}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                minimumKeywordMatches: event.target.value,
              }))
            }
            type="number"
            value={draft.minimumKeywordMatches}
          />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            <Save size={16} />
            저장
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 ring-1 ring-rose-100">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2">
        {loading ? (
          <p className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-300 p-3 text-sm font-bold text-slate-500">
            <RotateCw className="animate-spin" size={16} />
            소스 상태를 확인하는 중입니다.
          </p>
        ) : sources.length > 0 ? (
          sources.map((source) => (
            <SourceRow
              key={source.id}
              onToggle={() => toggleSource(source)}
              source={source}
            />
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

function SourceRow({
  source,
  onToggle,
}: {
  source: AnnouncementSourceStatus;
  onToggle: () => void;
}) {
  const enabled = source.enabled !== false;

  return (
    <div
      className={`flex flex-col gap-3 rounded-md p-3 ring-1 sm:flex-row sm:items-center sm:justify-between ${
        enabled
          ? "bg-[var(--surface-muted)] ring-slate-200"
          : "bg-slate-50 text-slate-500 ring-slate-200"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black text-slate-950">{source.name}</p>
          <span
            className={`rounded-md px-2 py-1 text-xs font-black ring-1 ${
              enabled
                ? "bg-teal-50 text-teal-700 ring-teal-200"
                : "bg-slate-100 text-slate-500 ring-slate-200"
            }`}
          >
            {enabled ? "활성" : "비활성"}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">
          {source.lastError
            ? `오류: ${source.lastError}`
            : `${source.itemCount}건 저장 · 최근 수집 ${
                source.lastFetchedAt
                  ? new Date(source.lastFetchedAt).toLocaleString("ko-KR")
                  : "대기 중"
              }`}
        </p>
        {source.keywords && source.keywords.length > 0 ? (
          <p className="mt-1 line-clamp-1 text-xs text-slate-400">
            {source.keywords.join(", ")}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-fit flex-wrap gap-2">
        <button
          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          onClick={onToggle}
          type="button"
        >
          {enabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
          {enabled ? "끄기" : "켜기"}
        </button>
        <Link
          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
          href={source.url}
          rel="noreferrer"
          target="_blank"
        >
          RSS
          <ExternalLink size={13} />
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}
