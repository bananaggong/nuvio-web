"use client";

import { Bell, Bookmark, CheckCircle2, Share2 } from "lucide-react";
import { useState } from "react";

type StateMap = Record<string, boolean>;

function readState(key: string): StateMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as StateMap;
  } catch {
    return {};
  }
}

function writeState(key: string, value: StateMap) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function ProgramActions({
  programId,
  title,
}: {
  programId: number | string;
  title: string;
}) {
  const id = String(programId);
  const [bookmarks, setBookmarks] = useState<StateMap>(() =>
    readState("nuvio:bookmarks"),
  );
  const [alerts, setAlerts] = useState<StateMap>(() => readState("nuvio:alerts"));
  const [tracks, setTracks] = useState<StateMap>(() => readState("nuvio:tracks"));
  const [copied, setCopied] = useState(false);

  function toggle(key: string, setter: (value: StateMap) => void, state: StateMap) {
    const next = { ...state, [id]: !state[id] };
    if (!next[id]) delete next[id];
    setter(next);
    writeState(key, next);
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
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-black ${
          bookmarks[id]
            ? "border-[var(--primary)] bg-teal-50 text-[var(--primary)]"
            : "border-slate-200 bg-white text-slate-700"
        }`}
        onClick={() => toggle("nuvio:bookmarks", setBookmarks, bookmarks)}
        type="button"
      >
        <Bookmark size={17} />
        저장
      </button>
      <button
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-black ${
          alerts[id]
            ? "border-[var(--warning)] bg-amber-50 text-amber-800"
            : "border-slate-200 bg-white text-slate-700"
        }`}
        onClick={() => toggle("nuvio:alerts", setAlerts, alerts)}
        type="button"
      >
        <Bell size={17} />
        알림
      </button>
      <button
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-black ${
          tracks[id]
            ? "border-[var(--accent)] bg-orange-50 text-orange-700"
            : "border-slate-200 bg-white text-slate-700"
        }`}
        onClick={() => toggle("nuvio:tracks", setTracks, tracks)}
        type="button"
      >
        <CheckCircle2 size={17} />
        신청 표시
      </button>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
        onClick={share}
        type="button"
      >
        <Share2 size={17} />
        {copied ? "복사됨" : "공유"}
      </button>
    </div>
  );
}
