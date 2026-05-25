"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
      address?: string | null;
      contactEmail?: string | null;
      displayName?: string | null;
      email?: string | null;
      onboardingIntent?: OnboardingIntent | null;
      phone?: string | null;
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
    title: "누비어로 시작하기",
    description: "관심 있는 프로그램을 저장하고 내 여행 프로그램과 알림을 관리해요.",
    icon: UserRound,
  },
  {
    id: "host",
    title: "호스트로 시작하기",
    description: "프로그램을 등록하고 신청폼, 신청자, 폴더를 관리해요.",
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
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
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
          "";
        setDisplayName(name);
        setPhone(
          payload.data.profile?.phone ||
            getMetadataText(payload.data.user.userMetadata, "phone") ||
            "",
        );
        setContactEmail(
          payload.data.profile?.contactEmail ||
            payload.data.profile?.email ||
            payload.data.user.email ||
            "",
        );
        setAddress(
          payload.data.profile?.address ||
            getMetadataText(payload.data.user.userMetadata, "address") ||
            "",
        );
        if (!initialIntent) {
          const profileIntent = normalizeIntent(
            payload.data.profile?.onboardingIntent ?? null,
          );
          if (profileIntent) setSelectedIntent(profileIntent);
        }
      } catch {
        if (active) setErrorMessage("계정 정보를 불러오지 못했어요.");
      } finally {
        if (active) setLoadingSession(false);
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [initialIntent, router]);

  async function completeOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");

    const nextProfile = {
      address: address.trim(),
      contactEmail: contactEmail.trim(),
      displayName: displayName.trim(),
      phone: phone.trim(),
    };

    if (
      !nextProfile.displayName ||
      !nextProfile.phone ||
      !nextProfile.contactEmail ||
      !nextProfile.address
    ) {
      setErrorMessage("이름, 전화번호, 연락 가능한 이메일, 주소를 입력해 주세요.");
      setSaving(false);
      return;
    }

    if (!/.+@.+\..+/.test(nextProfile.contactEmail)) {
      setErrorMessage("연락 가능한 이메일 형식을 확인해 주세요.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/me/onboarding", {
        body: JSON.stringify({
          ...nextProfile,
          intent: selectedIntent,
          referral: referral.trim() || undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "잠깐 문제가 생겼어요. 다시 시도해 주세요.");
      }

      router.push(destination);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "잠깐 문제가 생겼어요. 다시 시도해 주세요.",
      );
    } finally {
      setSaving(false);
    }
  }

  const welcomeName = displayName.trim() || "누비오 멤버";

  return (
    <div className="min-h-screen bg-white">
      <AuthHeader />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[560px] flex-col px-6 py-14">
        <div className="mx-auto mb-16 grid size-14 place-items-center rounded-2xl bg-teal-50 text-[var(--primary)] ring-1 ring-teal-100">
          <Sparkles size={24} />
        </div>

        <p className="text-sm font-semibold text-slate-500">1 / 1 단계</p>
        <h1 className="mt-4 text-[28px] font-black leading-tight tracking-tight text-slate-950">
          {welcomeName}님,
          <br />
          이제 시작이에요!
        </h1>
        <p className="mt-4 text-base font-semibold leading-7 text-slate-500">
          프로그램 신청과 운영 안내에 쓸 기본 연락 정보를 확인해 주세요.
          같은 계정으로 누비어와 호스트 기능을 함께 사용할 수 있어요.
        </p>

        <form className="mt-10 grid gap-7" onSubmit={completeOnboarding}>
          <fieldset className="grid gap-4">
            <legend className="mb-1 text-sm font-bold text-slate-800">
              기본 정보
            </legend>
            <label className="grid gap-2 text-sm font-bold text-slate-800">
              이름
              <input
                autoComplete="name"
                className="h-12 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="예: 김누비"
                required
                value={displayName}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-800">
              전화번호
              <input
                autoComplete="tel"
                className="h-12 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-teal-100"
                inputMode="tel"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="예: 010-1234-5678"
                required
                value={phone}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-800">
              연락 가능한 이메일
              <input
                autoComplete="email"
                className="h-12 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-teal-100"
                inputMode="email"
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="hello@nuvio.kr"
                required
                type="email"
                value={contactEmail}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-800">
              주소
              <input
                autoComplete="street-address"
                className="h-12 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-teal-100"
                onChange={(event) => setAddress(event.target.value)}
                placeholder="예: 서울시 마포구"
                required
                value={address}
              />
            </label>
          </fieldset>

          <label className="grid gap-2 text-sm font-bold text-slate-800">
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
              <option value="local-page">로컬페이지 안내</option>
            </select>
          </label>

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-bold text-slate-800">
              어떤 방식으로 시작할까요?
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

          <p className="rounded-md bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-blue-800">
            선택한 용도는 시작 화면을 정하는 데만 사용돼요. 같은 계정으로 참여와
            운영 기능을 모두 사용할 수 있어요.
          </p>

          {errorMessage ? (
            <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={loadingSession || saving}
            type="submit"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                저장 중
              </>
            ) : selectedIntent === "host" ? (
              "호스트센터로 계속하기"
            ) : (
              "프로그램 탐색 계속하기"
            )}
          </button>
        </form>
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
  if (nextPath) return nextPath;
  return intent === "host" ? "/host" : "/programs";
}

function getMetadataText(
  metadata: Record<string, unknown> | undefined,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
