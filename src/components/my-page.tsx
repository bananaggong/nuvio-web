"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  Building2,
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
import { programPath } from "@/lib/program-routing";
import type { Program } from "@/lib/types";

type LocalProfile = {
  name: string;
  email: string;
};

type AuthProfile = {
  id: string;
  email: string;
  displayName: string | null;
  role: "user" | "partner" | "admin";
  avatarUrl: string | null;
  phone: string | null;
  contactEmail: string | null;
  address: string | null;
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

type UserNotification = {
  body: string;
  createdAt: string;
  href: string;
  id: string;
  readAt: string;
  title: string;
  type: string;
};

type NotificationPreference = {
  applicationStatusEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  kakaoEnabled: boolean;
  programDeadlineEnabled: boolean;
  smsEnabled: boolean;
};

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
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationPreference, setNotificationPreference] =
    useState<NotificationPreference | null>(null);
  const [publicPrograms, setPublicPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const profileName =
    authSession.profile?.displayName ??
    getMetadataText(authSession.user?.userMetadata, "full_name") ??
    getMetadataText(authSession.user?.userMetadata, "name") ??
    localProfile?.name;
  const profileEmail =
    authSession.profile?.contactEmail ??
    authSession.profile?.email ??
    authSession.user?.email ??
    localProfile?.email;
  const signedIn = Boolean(authSession.user);

  useEffect(() => {
    let active = true;

    async function loadAccountData() {
      try {
        const [sessionResponse, programsResponse] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/programs", { cache: "no-store" }),
        ]);
        const sessionPayload =
          (await sessionResponse.json()) as AuthSessionPayload;
        const programPayload = (await programsResponse.json()) as {
          data?: Program[];
        };

        if (!active) return;

        setAuthSession(sessionPayload);
        setPublicPrograms(programPayload.data ?? []);

        if (sessionPayload.user) {
          const [notificationsResponse, preferenceResponse] = await Promise.all([
            fetch("/api/me/notifications", { cache: "no-store" }),
            fetch("/api/me/notification-preferences", { cache: "no-store" }),
          ]);
          const notificationsPayload = (await notificationsResponse.json()) as {
            data?: UserNotification[];
          };
          const preferencePayload = (await preferenceResponse.json()) as {
            data?: NotificationPreference;
          };

          if (!active) return;
          setNotifications(notificationsPayload.data ?? []);
          setNotificationPreference(preferencePayload.data ?? null);
        }

        const email =
          sessionPayload.profile?.email ??
          sessionPayload.user?.email ??
          localProfile?.email;
        let dbApplications: HostApplication[] = [];

        if (sessionPayload.user) {
          const applicationsResponse = await fetch("/api/host/applications", {
            cache: "no-store",
          });
          const applicationPayload = (await applicationsResponse.json()) as {
            data?: HostApplication[];
          };
          dbApplications = (applicationPayload.data ?? []).filter(
            (application) =>
              email &&
              application.email.trim().toLowerCase() === email.trim().toLowerCase(),
          );
        }

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

  async function markNotificationsRead() {
    await fetch("/api/me/notifications", {
      body: JSON.stringify({ markAllRead: true }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        readAt: item.readAt || new Date().toISOString(),
      })),
    );
  }

  async function updateNotificationPreference(
    key: keyof NotificationPreference,
    value: boolean,
  ) {
    const response = await fetch("/api/me/notification-preferences", {
      body: JSON.stringify({ [key]: value }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const payload = (await response.json()) as { data?: NotificationPreference };
    if (payload.data) setNotificationPreference(payload.data);
  }

  const unreadNotificationCount = notifications.filter((item) => !item.readAt).length;

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
                {profileName ? `${profileName}님의 누비오 노트` : "내 누비오 노트"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {profileEmail ??
                  "로그인하면 관심 프로그램과 신청 기록을 계정 기준으로 확인할 수 있습니다."}
              </p>
              {authSession.profile?.role === "admin" ? (
                <span className="mt-2 inline-flex rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-[var(--primary)] ring-1 ring-teal-200">
                  admin
                </span>
              ) : null}
            </div>
          </div>
          {signedIn ? (
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white hover:bg-slate-800"
                href="/host"
              >
                <Building2 size={16} />
                호스트센터
              </Link>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                onClick={logout}
                type="button"
              >
                <LogOut size={16} />
                로그아웃
              </button>
            </div>
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

      {signedIn ? (
        <section className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
              <Bell className="text-[var(--primary)]" size={18} />
              알림함
              {unreadNotificationCount > 0 ? (
                <span className="rounded-md bg-[var(--primary)] px-2 py-0.5 text-xs text-white">
                  {unreadNotificationCount}
                </span>
              ) : null}
            </h2>
            {unreadNotificationCount > 0 ? (
              <button
                className="h-9 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-600 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                onClick={markNotificationsRead}
                type="button"
              >
                모두 읽음
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid gap-2">
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((notification) => (
                  <Link
                    className={`rounded-md border p-3 text-sm ${
                      notification.readAt
                        ? "border-slate-100 bg-white text-slate-500"
                        : "border-teal-100 bg-teal-50 text-slate-800"
                    }`}
                    href={notification.href || "/me"}
                    key={notification.id}
                  >
                    <span className="block font-black">{notification.title}</span>
                    <span className="mt-1 block leading-6">{notification.body}</span>
                    <span className="mt-2 block text-xs font-bold text-slate-400">
                      {new Date(notification.createdAt).toLocaleString("ko-KR")}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                  아직 받은 알림이 없습니다.
                </p>
              )}
            </div>

            {notificationPreference ? (
              <div className="rounded-md bg-[var(--surface-muted)] p-3">
                <p className="text-sm font-black text-slate-950">알림 설정</p>
                <div className="mt-3 grid gap-2">
                  {notificationPreferenceOptions.map((option) => (
                    <label
                      className="flex items-center justify-between gap-3 text-sm font-bold text-slate-600"
                      key={option.key}
                    >
                      {option.label}
                      <input
                        checked={Boolean(notificationPreference[option.key])}
                        className="size-4 accent-[var(--primary)]"
                        onChange={(event) =>
                          updateNotificationPreference(option.key, event.target.checked)
                        }
                        type="checkbox"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

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
                      href={programPath(program)}
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

const notificationPreferenceOptions: Array<{
  key: keyof NotificationPreference;
  label: string;
}> = [
  { key: "inAppEnabled", label: "인앱 알림" },
  { key: "emailEnabled", label: "이메일" },
  { key: "kakaoEnabled", label: "카카오" },
  { key: "smsEnabled", label: "문자" },
  { key: "applicationStatusEnabled", label: "신청 상태" },
  { key: "programDeadlineEnabled", label: "마감 임박" },
];

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
