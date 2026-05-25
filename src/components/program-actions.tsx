"use client";

import { Bell, Bookmark, CheckCircle2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

type StateMap = Record<string, boolean>;

type ProgramStateMaps = {
  alerts: StateMap;
  bookmarks: StateMap;
  tracks: StateMap;
};

type ProgramStateKind = "bookmarked" | "alertEnabled" | "trackingEnabled";

const emptyState: ProgramStateMaps = {
  alerts: {},
  bookmarks: {},
  tracks: {},
};

export function ProgramActions({
  programId,
  title,
}: {
  programId: number | string;
  title: string;
}) {
  const id = String(programId);
  const [state, setState] = useState<ProgramStateMaps>(emptyState);
  const [copied, setCopied] = useState(false);
  const [pendingKind, setPendingKind] = useState<ProgramStateKind | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProgramState() {
      try {
        const response = await fetch("/api/me/program-state", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: ProgramStateMaps;
        };
        if (active && payload.data) setState(payload.data);
      } catch {
        // Signed-out users can still browse and share programs.
      }
    }

    void loadProgramState();

    return () => {
      active = false;
    };
  }, []);

  async function toggle(kind: ProgramStateKind) {
    const mapKey = getMapKey(kind);
    const enabled = !state[mapKey][id];
    const optimisticState = {
      ...state,
      [mapKey]: toggleMapValue(state[mapKey], id, enabled),
    };

    setState(optimisticState);
    setPendingKind(kind);

    try {
      const response = await fetch("/api/me/program-state", {
        body: JSON.stringify({ enabled, kind, programId: id }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(
          window.location.pathname,
        )}`;
        return;
      }

      const payload = (await response.json()) as {
        data?: ProgramStateMaps;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "저장에 실패했습니다.");
      }

      setState(payload.data);
    } catch {
      setState(state);
    } finally {
      setPendingKind(null);
    }
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <button
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-black disabled:cursor-wait disabled:opacity-70 ${
          state.bookmarks[id]
            ? "border-[var(--primary)] bg-teal-50 text-[var(--primary)]"
            : "border-slate-200 bg-white text-slate-700"
        }`}
        disabled={pendingKind === "bookmarked"}
        onClick={() => void toggle("bookmarked")}
        type="button"
      >
        <Bookmark size={17} />
        {state.bookmarks[id] ? "저장됨" : "저장하기"}
      </button>
      <button
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-black disabled:cursor-wait disabled:opacity-70 ${
          state.alerts[id]
            ? "border-[var(--warning)] bg-amber-50 text-amber-800"
            : "border-slate-200 bg-white text-slate-700"
        }`}
        disabled={pendingKind === "alertEnabled"}
        onClick={() => void toggle("alertEnabled")}
        type="button"
      >
        <Bell size={17} />
        {state.alerts[id] ? "알림 켜짐" : "알림 켜기"}
      </button>
      <button
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-black disabled:cursor-wait disabled:opacity-70 ${
          state.tracks[id]
            ? "border-[var(--accent)] bg-orange-50 text-orange-700"
            : "border-slate-200 bg-white text-slate-700"
        }`}
        disabled={pendingKind === "trackingEnabled"}
        onClick={() => void toggle("trackingEnabled")}
        type="button"
      >
        <CheckCircle2 size={17} />
        관심 표시하기
      </button>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
        onClick={share}
        type="button"
      >
        <Share2 size={17} />
        {copied ? "복사됨" : "공유하기"}
      </button>
    </div>
  );
}

function getMapKey(kind: ProgramStateKind): keyof ProgramStateMaps {
  if (kind === "alertEnabled") return "alerts";
  if (kind === "trackingEnabled") return "tracks";
  return "bookmarks";
}

function toggleMapValue(
  current: StateMap,
  id: string,
  enabled: boolean,
): StateMap {
  const next = { ...current };
  if (enabled) next[id] = true;
  else delete next[id];
  return next;
}
