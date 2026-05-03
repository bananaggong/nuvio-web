"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, Bookmark, CheckCircle2, UserRound } from "lucide-react";
import { getProgramById } from "@/lib/data";

type Profile = {
  name: string;
  email: string;
  interest: string;
};

type StateMap = Record<string, boolean>;

function readMap(key: string): StateMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as StateMap;
  } catch {
    return {};
  }
}

export function MyPage() {
  const [profile] = useState<Profile | null>(() => {
    if (typeof window === "undefined") return null;
    const rawProfile = window.localStorage.getItem("nuvio:profile");
    return rawProfile ? (JSON.parse(rawProfile) as Profile) : null;
  });
  const [bookmarks] = useState<StateMap>(() => readMap("nuvio:bookmarks"));
  const [alerts] = useState<StateMap>(() => readMap("nuvio:alerts"));
  const [tracks] = useState<StateMap>(() => readMap("nuvio:tracks"));

  const sections = useMemo(
    () => [
      {
        title: "보관한 프로그램",
        icon: Bookmark,
        items: Object.keys(bookmarks)
          .map((id) => getProgramById(Number(id)))
          .filter(Boolean),
      },
      {
        title: "알림받는 프로그램",
        icon: Bell,
        items: Object.keys(alerts)
          .map((id) => getProgramById(Number(id)))
          .filter(Boolean),
      },
      {
        title: "지원 기록",
        icon: CheckCircle2,
        items: Object.keys(tracks)
          .map((id) => getProgramById(Number(id)))
          .filter(Boolean),
      },
    ],
    [alerts, bookmarks, tracks],
  );

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--primary)]">
            <UserRound size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-950">
              {profile ? `${profile.name}님의 여행지원금 노트` : "내 여행지원금 노트"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {profile
                ? `${profile.email} · 관심사 ${profile.interest}`
                : "로그인 정보를 저장하면 관심 프로그램을 한곳에서 볼 수 있습니다."}
            </p>
          </div>
        </div>
        {!profile ? (
          <Link
            className="mt-5 inline-flex h-11 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white"
            href="/login"
          >
            프로필 만들기
          </Link>
        ) : null}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <section className="rounded-md border border-slate-200 bg-white p-4" key={section.title}>
              <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
                <Icon className="text-[var(--primary)]" size={18} />
                {section.title}
              </h2>
              <div className="mt-4 grid gap-2">
                {section.items.length > 0 ? (
                  section.items.map((program) =>
                    program ? (
                      <Link
                        className="rounded-md bg-[var(--surface-muted)] p-3 text-sm font-bold text-slate-700 hover:text-[var(--primary)]"
                        href={`/programs/${program.id}`}
                        key={program.id}
                      >
                        {program.title}
                      </Link>
                    ) : null,
                  )
                ) : (
                  <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                    아직 기록이 없습니다.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
