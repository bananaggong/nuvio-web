"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  CheckCircle2,
  ClipboardList,
  LogOut,
  UserRound,
} from "lucide-react";
import { getProgramById } from "@/lib/data";
import {
  applicationStatusLabels,
  mergeHostApplications,
} from "@/lib/host-operations";
import type { HostApplication } from "@/lib/host-operations";
import { readMyApplicationsFromStorage } from "@/lib/my-applications";
import type { Program } from "@/lib/types";

type LocalProfile = {
  name: string;
  email: string;
  interest: string;
};

type AuthProfile = {
  id: string;
  email: string;
  displayName: string | null;
  role: "user" | "partner" | "admin";
  avatarUrl: string | null;
  phone: string | null;
};

type AuthSessionPayload = {
  user: {
    id: string;
    email?: string;
    userMetadata?: Record<string, unknown>;
  } | null;
  profile: AuthProfile | null;
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
  const [localProfile] = useState<LocalProfile | null>(() => {
    if (typeof window === "undefined") return null;
    const rawProfile = window.localStorage.getItem("nuvio:profile");
    return rawProfile ? (JSON.parse(rawProfile) as LocalProfile) : null;
  });
  const [authSession, setAuthSession] = useState<AuthSessionPayload>({
    user: null,
    profile: null,
  });
  const [bookmarks] = useState<StateMap>(() => readMap("nuvio:bookmarks"));
  const [alerts] = useState<StateMap>(() => readMap("nuvio:alerts"));
  const [tracks] = useState<StateMap>(() => readMap("nuvio:tracks"));
  const [applications, setApplications] = useState<HostApplication[]>(
    readMyApplicationsFromStorage,
  );
  const [publicPrograms, setPublicPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const profileName =
    authSession.profile?.displayName ??
    getMetadataText(authSession.user?.userMetadata, "full_name") ??
    getMetadataText(authSession.user?.userMetadata, "name") ??
    localProfile?.name;
  const profileEmail =
    authSession.profile?.email ?? authSession.user?.email ?? localProfile?.email;
  const profileInterest = localProfile?.interest;
  const signedIn = Boolean(authSession.user);

  useEffect(() => {
    let active = true;

    async function loadAccountData() {
      try {
        const [sessionResponse, applicationsResponse, programsResponse] =
          await Promise.all([
            fetch("/api/auth/session", { cache: "no-store" }),
            fetch("/api/host/applications", { cache: "no-store" }),
            fetch("/api/programs", { cache: "no-store" }),
          ]);
        const sessionPayload =
          (await sessionResponse.json()) as AuthSessionPayload;
        const applicationPayload = (await applicationsResponse.json()) as {
          data?: HostApplication[];
        };
        const programPayload = (await programsResponse.json()) as {
          data?: Program[];
        };

        if (!active) return;

        setAuthSession(sessionPayload);
        setPublicPrograms(programPayload.data ?? []);

        const email =
          sessionPayload.profile?.email ??
          sessionPayload.user?.email ??
          localProfile?.email;
        const dbApplications = (applicationPayload.data ?? []).filter(
          (application) =>
            email &&
            application.email.trim().toLowerCase() === email.trim().toLowerCase(),
        );

        setApplications((current) =>
          mergeHostApplications(dbApplications, current),
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAccountData();

    return () => {
      active = false;
    };
  }, [localProfile?.email]);

  const sections = useMemo(
    () => [
      {
        title: "보관한 프로그램",
        icon: Bookmark,
        items: resolvePrograms(bookmarks, publicPrograms),
      },
      {
        title: "알림 받는 프로그램",
        icon: Bell,
        items: resolvePrograms(alerts, publicPrograms),
      },
      {
        title: "지원 기록",
        icon: CheckCircle2,
        items: resolvePrograms(tracks, publicPrograms),
      },
    ],
    [alerts, bookmarks, publicPrograms, tracks],
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--primary)]">
              <UserRound size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-950">
                {profileName ? `${profileName}님의 NUVIO 노트` : "내 NUVIO 노트"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {profileEmail
                  ? `${profileEmail}${profileInterest ? ` · 관심사 ${profileInterest}` : ""}`
                  : "로그인하면 관심 프로그램과 신청 기록을 계정 기준으로 확인할 수 있습니다."}
              </p>
              {authSession.profile?.role ? (
                <span className="mt-2 inline-flex rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-[var(--primary)] ring-1 ring-teal-200">
                  {authSession.profile.role}
                </span>
              ) : null}
            </div>
          </div>
          {signedIn ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              onClick={logout}
              type="button"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          ) : (
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white"
              href="/login"
            >
              소셜 로그인
            </Link>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
          <ClipboardList className="text-[var(--primary)]" size={18} />
          신청 내역
        </h2>
        <div className="mt-4 grid gap-2">
          {loading ? (
            <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
              계정과 신청 내역을 불러오는 중입니다.
            </p>
          ) : applications.length > 0 ? (
            applications.map((application) => (
              <div
                className="rounded-md bg-[var(--surface-muted)] p-3"
                key={application.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black text-slate-950">
                      {application.programTitle}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {new Date(application.submittedAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-md bg-white px-2 py-1 text-xs font-black text-[var(--primary)]">
                    {applicationStatusLabels[application.status]}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
              아직 제출한 신청서가 없습니다.
            </p>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <section
              className="rounded-md border border-slate-200 bg-white p-4"
              key={section.title}
            >
              <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
                <Icon className="text-[var(--primary)]" size={18} />
                {section.title}
              </h2>
              <div className="mt-4 grid gap-2">
                {section.items.length > 0 ? (
                  section.items.map((program) => (
                    <Link
                      className="rounded-md bg-[var(--surface-muted)] p-3 text-sm font-bold text-slate-700 hover:text-[var(--primary)]"
                      href={`/programs/${program.id}`}
                      key={program.id}
                    >
                      {program.title}
                    </Link>
                  ))
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

function resolvePrograms(state: StateMap, publicPrograms: Program[]): Program[] {
  return Object.keys(state)
    .map((id) => {
      const program = publicPrograms.find(
        (item) => String(item.id) === id || item.slug === id,
      );
      if (program) return program;

      const numericId = Number(id);
      return Number.isInteger(numericId) ? getProgramById(numericId) : undefined;
    })
    .filter((program): program is Program => Boolean(program));
}

function getMetadataText(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
