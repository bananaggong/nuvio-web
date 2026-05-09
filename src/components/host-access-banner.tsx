"use client";

import Link from "next/link";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

type HostRole = "user" | "partner" | "admin";

type SessionPayload = {
  user: { email?: string } | null;
  profile: {
    email: string;
    displayName: string | null;
    role: HostRole;
  } | null;
};

export function HostAccessBanner() {
  const [session, setSession] = useState<SessionPayload | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const payload = (await response.json()) as SessionPayload;
      if (active) setSession(payload);
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  if (!session) return null;

  const role = session.profile?.role;
  const allowed = role === "partner" || role === "admin";

  return (
    <section className="mx-auto max-w-7xl px-4 pt-4 md:px-8">
      <div
        className={`flex flex-col gap-3 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
          allowed
            ? "border-teal-100 bg-white text-teal-900"
            : "border-amber-200 bg-white text-amber-950"
        }`}
      >
        <div className="flex gap-3">
          {allowed ? (
            <ShieldCheck className="mt-0.5 shrink-0" size={20} />
          ) : (
            <TriangleAlert className="mt-0.5 shrink-0" size={20} />
          )}
          <div>
            <p className="text-sm font-black">
              {allowed
                ? "호스트 권한으로 접속 중입니다"
                : "호스트 권한 확인이 필요합니다"}
            </p>
            <p className="mt-0.5 text-xs leading-5">
              {session.user
                ? `${session.profile?.email ?? session.user.email ?? "계정"} · role: ${
                    role ?? "user"
                  }`
                : "로그인하지 않아 데모/로컬 모드로 표시됩니다."}
            </p>
          </div>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center rounded-md bg-white px-3 text-xs font-black text-slate-800 ring-1 ring-slate-200"
          href={session.user ? "/me" : "/login"}
        >
          {session.user ? "계정 확인" : "로그인"}
        </Link>
      </div>
    </section>
  );
}
