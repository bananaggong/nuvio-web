"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Database,
  Download,
  Eye,
  FilePlus2,
  Loader2,
  MapPin,
  Plus,
  Save,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { periodOptions, regions, themeOptions } from "@/lib/data";
import { formatDate, formatWon } from "@/lib/format";
import {
  buildHostProgramJson,
  buildProgramDraftChecklist,
  createHostProgramDraft,
  mergeHostProgramDrafts,
  readHostProgramDrafts,
  writeHostProgramDrafts,
} from "@/lib/host-program-studio";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import type { PeriodKey, ProgramStatus, ThemeKey } from "@/lib/types";

const programStatusLabels: Record<ProgramStatus, string> = {
  open: "모집중",
  upcoming: "예정",
  closed: "마감",
  earlyClosed: "조기마감",
};

const programStatusOptions: ProgramStatus[] = [
  "open",
  "upcoming",
  "closed",
  "earlyClosed",
];

export function HostProgramStudio() {
  const [drafts, setDrafts] = useState<HostProgramDraft[]>(readHostProgramDrafts);
  const [selectedId, setSelectedId] = useState(drafts[0]?.id);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedId) ?? drafts[0],
    [drafts, selectedId],
  );
  const checklist = useMemo(
    () => (selectedDraft ? buildProgramDraftChecklist(selectedDraft) : []),
    [selectedDraft],
  );
  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseDrafts() {
      try {
        const response = await fetch("/api/host/programs", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { data?: HostProgramDraft[] };
        const databaseDrafts = Array.isArray(payload.data) ? payload.data : [];
        if (!isMounted || databaseDrafts.length === 0) return;

        setDrafts((currentDrafts) => {
          const nextDrafts = mergeHostProgramDrafts(databaseDrafts, currentDrafts);
          writeHostProgramDrafts(nextDrafts);
          return nextDrafts;
        });
        setSelectedId((currentId) => currentId ?? databaseDrafts[0]?.id);
      } catch {
        if (isMounted) {
          setSyncError("DB 초안을 불러오지 못했습니다.");
        }
      }
    }

    loadDatabaseDrafts();

    return () => {
      isMounted = false;
    };
  }, []);

  function saveDrafts(nextDrafts: HostProgramDraft[]) {
    setDrafts(nextDrafts);
    writeHostProgramDrafts(nextDrafts);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function updateDraft(patch: Partial<HostProgramDraft>) {
    if (!selectedDraft) return;
    setSyncMessage("");
    setSyncError("");
    saveDrafts(
      drafts.map((draft) =>
        draft.id === selectedDraft.id
          ? { ...draft, ...patch, updatedAt: new Date().toISOString() }
          : draft,
      ),
    );
  }

  function addDraft() {
    const nextDraft = createHostProgramDraft();
    setSyncMessage("");
    setSyncError("");
    saveDrafts([nextDraft, ...drafts]);
    setSelectedId(nextDraft.id);
  }

  function updateHashtags(value: string) {
    updateDraft({
      hashtags: value
        .split(",")
        .map((tag) => tag.trim().replace(/^#/u, ""))
        .filter(Boolean),
    });
  }

  function togglePublish() {
    if (!selectedDraft) return;
    updateDraft({ published: !selectedDraft.published });
  }

  async function syncSelectedDraft() {
    if (!selectedDraft) return;

    setIsSyncing(true);
    setSyncMessage("");
    setSyncError("");

    try {
      const response = await fetch("/api/host/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedDraft),
      });
      const payload = (await response.json()) as {
        data?: HostProgramDraft;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "DB 저장에 실패했습니다.");
      }

      const nextDrafts = mergeHostProgramDrafts(
        [payload.data],
        drafts.filter(
          (draft) =>
            draft.id !== selectedDraft.id && draft.id !== payload.data?.id,
        ),
      );

      saveDrafts(nextDrafts);
      setSelectedId(payload.data.id);
      setSyncMessage("Supabase DB에 저장되었습니다.");
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "DB 저장에 실패했습니다.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  function downloadDraftJson() {
    if (!selectedDraft) return;
    downloadTextFile(
      "nuvio-program-draft.json",
      buildHostProgramJson(selectedDraft),
      "application/json",
    );
  }

  if (!selectedDraft) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white"
          onClick={addDraft}
          type="button"
        >
          <Plus size={17} />
          프로그램 만들기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          <ArrowLeft size={16} />
          운영 콘솔
        </Link>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          onClick={addDraft}
          type="button"
        >
          <Plus size={16} />
          새 프로그램
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
          disabled={isSyncing}
          onClick={syncSelectedDraft}
          type="button"
        >
          {isSyncing ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Database size={16} />
          )}
          DB 저장
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
          onClick={downloadDraftJson}
          type="button"
        >
          <Download size={16} />
          JSON 내보내기
        </button>
      </div>


      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-2">
          {drafts.map((draft) => (
            <button
              className={`w-full rounded-md border p-3 text-left ${
                draft.id === selectedDraft.id
                  ? "border-[var(--primary)] bg-teal-50"
                  : "border-slate-200 bg-white"
              }`}
              key={draft.id}
              onClick={() => setSelectedId(draft.id)}
              type="button"
            >
              <p className="break-words font-black text-slate-950">{draft.title}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {draft.region} {draft.city} · {programStatusLabels[draft.status]}
              </p>
            </button>
          ))}
        </aside>

        <main className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <FilePlus2 className="text-[var(--primary)]" size={20} />
              프로그램 입력
            </h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">프로그램명</span>
                <input
                  className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  value={selectedDraft.title}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">한 줄 요약</span>
                <textarea
                  className="min-h-20 w-full min-w-0 rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateDraft({ summary: event.target.value })}
                  value={selectedDraft.summary}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">지역</span>
                  <select
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) => updateDraft({ region: event.target.value })}
                    value={selectedDraft.region}
                  >
                    {regions
                      .filter((region) => region !== "전체")
                      .map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">도시</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) => updateDraft({ city: event.target.value })}
                    value={selectedDraft.city}
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">테마</span>
                  <select
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateDraft({ theme: event.target.value as ThemeKey })
                    }
                    value={selectedDraft.theme}
                  >
                    {themeOptions.map((theme) => (
                      <option key={theme.key} value={theme.key}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">기간</span>
                  <select
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateDraft({ periodKey: event.target.value as PeriodKey })
                    }
                    value={selectedDraft.periodKey}
                  >
                    {periodOptions.map((period) => (
                      <option key={period.key} value={period.key}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">상태</span>
                  <select
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateDraft({ status: event.target.value as ProgramStatus })
                    }
                    value={selectedDraft.status}
                  >
                    {programStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {programStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <DateGrid draft={selectedDraft} onUpdate={updateDraft} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">모집 대상</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) => updateDraft({ target: event.target.value })}
                    value={selectedDraft.target}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">모집 인원</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateDraft({ capacity: event.target.value })
                    }
                    value={selectedDraft.capacity}
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">지원 혜택</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) =>
                      updateDraft({ subsidyLabel: event.target.value })
                    }
                    value={selectedDraft.subsidyLabel}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">지원금</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    min={0}
                    onChange={(event) =>
                      updateDraft({ subsidyAmount: Number(event.target.value) })
                    }
                    type="number"
                    value={selectedDraft.subsidyAmount}
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">상세 설명</span>
                <textarea
                  className="min-h-28 w-full min-w-0 rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-[var(--primary)]"
                  onChange={(event) =>
                    updateDraft({ description: event.target.value })
                  }
                  value={selectedDraft.description}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">신청 링크</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) => updateDraft({ applyUrl: event.target.value })}
                    value={selectedDraft.applyUrl}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">문의 연락처</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                    onChange={(event) => updateDraft({ phone: event.target.value })}
                    value={selectedDraft.phone}
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">해시태그</span>
                <input
                  className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateHashtags(event.target.value)}
                  value={selectedDraft.hashtags.join(", ")}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-black ${
                  selectedDraft.published
                    ? "border border-slate-200 text-slate-700"
                    : "bg-[var(--primary)] text-white"
                }`}
                onClick={togglePublish}
                type="button"
              >
                <Eye size={16} />
                {selectedDraft.published ? "비공개 전환" : "게시 준비"}
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700"
                onClick={downloadDraftJson}
                type="button"
              >
                <Download size={16} />
                JSON
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
                disabled={isSyncing}
                onClick={syncSelectedDraft}
                type="button"
              >
                {isSyncing ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Database size={16} />
                )}
                Supabase
              </button>
            </div>

            <div
              aria-live="polite"
              className="mt-5 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500"
            >
              {saved ? <Check size={16} className="text-[var(--primary)]" /> : <Save size={16} />}
              {saved ? "저장됨" : "변경 사항 자동 저장"}
              {syncMessage ? (
                <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-700">
                  {syncMessage}
                </span>
              ) : null}
              {syncError ? (
                <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                  {syncError}
                </span>
              ) : null}
            </div>
          </section>

          <aside className="min-w-0 space-y-4">
            <ProgramPreview draft={selectedDraft} />
            <section className="rounded-md border border-slate-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <CheckCircle2 className="text-[var(--primary)]" size={19} />
                게시 체크리스트
              </h2>
              <div className="mt-4 grid gap-2">
                {checklist.map((item) => (
                  <div
                    className="rounded-md bg-[var(--surface-muted)] p-3"
                    key={item.id}
                  >
                    <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                      <span
                        className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full ${
                          item.done
                            ? "bg-[var(--primary)] text-white"
                            : "bg-white text-slate-400 ring-1 ring-slate-200"
                        }`}
                      >
                        {item.done ? <Check size={13} /> : null}
                      </span>
                      {item.label}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {item.helper}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}

function DateGrid({
  draft,
  onUpdate,
}: {
  draft: HostProgramDraft;
  onUpdate: (patch: Partial<HostProgramDraft>) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        ["recruitStart", "모집 시작"],
        ["recruitEnd", "모집 마감"],
        ["activityStart", "운영 시작"],
        ["activityEnd", "운영 종료"],
      ].map(([key, label]) => (
        <label className="grid gap-2" key={key}>
          <span className="text-sm font-black text-slate-700">{label}</span>
          <input
            className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
            onChange={(event) =>
              onUpdate({ [key]: event.target.value } as Partial<HostProgramDraft>)
            }
            type="date"
            value={draft[key as keyof HostProgramDraft] as string}
          />
        </label>
      ))}
    </div>
  );
}

function ProgramPreview({ draft }: { draft: HostProgramDraft }) {
  return (
    <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-slate-100">
        <Image
          alt={draft.title}
          className="object-cover"
          fill
          sizes="(max-width: 1280px) 100vw, 360px"
          src={draft.image}
        />
      </div>
      <div className="p-4">
        <p className="inline-flex rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-700">
          {programStatusLabels[draft.status]}
        </p>
        <h2 className="mt-3 text-lg font-black leading-6 text-slate-950">
          {draft.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{draft.summary}</p>
        <div className="mt-4 grid gap-2 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <MapPin size={16} />
            {draft.region} {draft.city}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={16} />~{formatDate(draft.recruitEnd)}
          </span>
          <span className="flex items-center gap-1.5 font-bold text-slate-800">
            <WalletCards size={16} />
            {draft.subsidyAmount > 0
              ? `${formatWon(draft.subsidyAmount)} 지원`
              : draft.subsidyLabel}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {draft.hashtags.slice(0, 4).map((tag) => (
            <span
              className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs font-bold text-slate-600"
              key={tag}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}
