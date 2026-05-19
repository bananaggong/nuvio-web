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

  const signedIn = Boolean(session.user);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-4 md:px-8">
      <div
        className={`flex flex-col gap-3 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
          signedIn
            ? "border-teal-100 bg-white text-teal-900"
            : "border-amber-200 bg-white text-amber-950"
        }`}
      >
        <div className="flex gap-3">
          {signedIn ? (
            <ShieldCheck className="mt-0.5 shrink-0" size={20} />
          ) : (
            <TriangleAlert className="mt-0.5 shrink-0" size={20} />
          )}
          <div>
            <p className="text-sm font-black">
              {signedIn
                ? "운영 기능을 사용할 수 있습니다"
                : "로그인하면 운영 기능을 사용할 수 있습니다"}
            </p>
            <p className="mt-0.5 text-xs leading-5">
              {session.user
                ? `${session.profile?.email ?? session.user.email ?? "계정"} 계정으로 접속 중입니다.`
                : "프로그램 등록, 신청자 관리, 운영 프로젝트는 계정 기준으로 저장됩니다."}
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
