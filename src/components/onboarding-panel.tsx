"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Loader2, Sparkles, UserRound } from "lucide-react";
import { AuthHeader } from "@/components/auth-ui";

type OnboardingIntent = "participant" | "host";

type SessionPayload = {
  data?: {
    user: {
      id: string;
      email?: string;
      userMetadata?: Record<string, unknown>;
    } | null;
    profile: {
      displayName?: string | null;
      email?: string | null;
      role?: "user" | "partner" | "admin";
    } | null;
  };
};

const intentOptions: Array<{
  description: string;
  icon: typeof UserRound;
  id: OnboardingIntent;
  title: string;
}> = [
  {
    id: "participant",
    title: "프로그램 참여자",
    description: "관심 있는 프로그램을 저장하고 신청 내역과 알림을 관리합니다.",
    icon: UserRound,
  },
  {
    id: "host",
    title: "로컬홈 / 브랜드 운영자",
    description: "프로그램을 등록하고 신청폼, 신청자, 운영 프로젝트를 관리합니다.",
    icon: Building2,
  },
];

export function OnboardingPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialIntent = normalizeIntent(searchParams.get("intent"));
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const [selectedIntent, setSelectedIntent] = useState<OnboardingIntent>(
    initialIntent ?? "participant",
  );
  const [referral, setReferral] = useState("");
  const [displayName, setDisplayName] = useState("누비오 멤버");
  const [loadingSession, setLoadingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const destination = useMemo(
    () => getDestinationPath(selectedIntent, nextPath),
    [nextPath, selectedIntent],
  );

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const payload = (await response.json()) as SessionPayload;

        if (!active) return;

        if (!payload.data?.user) {
          const loginUrl = new URL("/login", window.location.origin);
          loginUrl.searchParams.set(
            "next",
            `${window.location.pathname}${window.location.search}`,
          );
          router.replace(loginUrl.pathname + loginUrl.search);
          return;
        }

        const name =
          payload.data.profile?.displayName ||
          getMetadataText(payload.data.user.userMetadata, "full_name") ||
          getMetadataText(payload.data.user.userMetadata, "name") ||
          payload.data.profile?.email ||
          payload.data.user.email ||
          "누비오 멤버";
        setDisplayName(name);
      } catch {
        if (active) setErrorMessage("계정 정보를 불러오지 못했습니다.");
      } finally {
        if (active) setLoadingSession(false);
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function completeOnboarding() {
    setSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/me/onboarding", {
        body: JSON.stringify({
          intent: selectedIntent,
          referral: referral.trim() || undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "온보딩 저장에 실패했습니다.");
      }

      router.push(destination);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "온보딩 저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <AuthHeader />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[560px] flex-col px-6 py-14">
        <div className="mx-auto mb-16 grid size-14 place-items-center rounded-2xl bg-teal-50 text-[var(--primary)] ring-1 ring-teal-100">
          <Sparkles size={24} />
        </div>

        <p className="text-sm font-semibold text-slate-500">1 / 1 단계</p>
        <h1 className="mt-4 text-[28px] font-black leading-tight tracking-tight text-slate-950">
          {displayName}님,
          <br />
          누비오에 오신 것을 환영합니다.
        </h1>
        <p className="mt-4 text-base font-semibold leading-7 text-slate-500">
          프로그램을 신청하거나, 로컬홈 운영자로 프로그램을 등록하고 관리할 수
          있어요. 먼저 어떤 용도로 사용할지 알려주세요.
        </p>

        <label className="mt-10 grid gap-2 text-sm font-bold text-slate-800">
          누비오를 알게 된 경로가 궁금해요
          <select
            className="h-12 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setReferral(event.target.value)}
            value={referral}
          >
            <option value="">선택</option>
            <option value="search">검색</option>
            <option value="social">SNS</option>
            <option value="program">프로그램 공고</option>
            <option value="recommendation">지인 추천</option>
            <option value="local-home">로컬홈/운영기관 안내</option>
          </select>
        </label>

        <fieldset className="mt-7 grid gap-3">
          <legend className="mb-1 text-sm font-bold text-slate-800">
            어떤 기능을 먼저 사용하고 싶나요?
          </legend>
          {intentOptions.map((option) => {
            const Icon = option.icon;
            const active = selectedIntent === option.id;

            return (
              <button
                className={`flex min-h-[76px] items-center gap-4 rounded-xl border px-4 text-left transition ${
                  active
                    ? "border-[var(--primary)] bg-teal-50 shadow-sm ring-1 ring-[var(--primary)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
                key={option.id}
                onClick={() => setSelectedIntent(option.id)}
                type="button"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${
                    active
                      ? "bg-[var(--primary)] text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {active ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                </span>
                <span>
                  <span
                    className={`block text-base font-black ${
                      active ? "text-[var(--primary)]" : "text-slate-950"
                    }`}
                  >
                    {option.title}
                  </span>
                  <span className="mt-1 block text-sm font-semibold leading-6 text-slate-500">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </fieldset>

        <p className="mt-4 rounded-md bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-blue-800">
          선택한 용도는 나중에 계정 설정에서 추가할 수 있습니다. 호스트 권한은
          로컬홈 가입 또는 관리자 승인 후 활성화됩니다.
        </p>

        {errorMessage ? (
          <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={loadingSession || saving}
          onClick={() => void completeOnboarding()}
          type="button"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              저장 중
            </>
          ) : selectedIntent === "host" ? (
            "로컬홈 가입으로 계속"
          ) : (
            "프로그램 탐색으로 계속"
          )}
        </button>
      </main>
    </div>
  );
}

function normalizeIntent(value: string | null): OnboardingIntent | null {
  return value === "participant" || value === "host" ? value : null;
}

function getSafeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function getDestinationPath(intent: OnboardingIntent, nextPath: string | null) {
  if (intent === "host") {
    return nextPath?.startsWith("/partners/apply") ? nextPath : "/partners/apply";
  }
  return nextPath?.startsWith("/partners/apply") ? "/programs" : nextPath ?? "/programs";
}

function getMetadataText(
  metadata: Record<string, unknown> | undefined,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
