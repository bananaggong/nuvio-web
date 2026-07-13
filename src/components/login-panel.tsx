"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  AuthHeader,
  GoogleIcon,
  KakaoIcon,
  MailIcon,
  NaverIcon,
  QuestionIcon,
} from "@/components/auth-ui";
import { socialProviders, type SocialProviderKey } from "@/lib/auth-providers";
import type { AuthProfile } from "@/lib/auth-profile-db";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type LoginMode = "choice" | "email";
export type LoginIntent = "apply" | "participant" | "host";

type ProfileRole = AuthProfile["role"];

type SessionPayload = {
  data?: {
    user: { id: string; email?: string } | null;
    profile: AuthProfile | null;
  };
  error?: string;
};
export type LoginPanelInitialParams = {
  errorMessage: string;
  intent: LoginIntent | null;
  mode: LoginMode;
  nextPath: string | null;
};

const socialOrder: SocialProviderKey[] = ["kakao", "naver", "google"];
const availableSocialProviderKeys = socialOrder.filter((providerKey) =>
  socialProviders.some((provider) => provider.key === providerKey),
);

function getRoleLandingPath(role?: ProfileRole): string {
  if (role === "admin") return "/admin/magazine";
  if (role === "partner") return "/host";
  return "/mypage";
}

function isProfileOnboardingComplete(profile: AuthProfile | null): boolean {
  return Boolean(
    profile?.onboardingCompletedAt &&
      profile.displayName.trim() &&
      profile.phone.trim() &&
      profile.contactEmail.trim() &&
      profile.address.trim(),
  );
}

function getPostLoginPath(
  profile: AuthProfile | null,
  nextPath: string | null,
  intent: LoginIntent | null,
): string {
  if (profile?.role === "admin" || profile?.role === "partner") {
    return nextPath ?? getRoleLandingPath(profile.role);
  }

  if (!isProfileOnboardingComplete(profile)) {
    if (nextPath?.startsWith("/onboarding")) return nextPath;
    const params = new URLSearchParams();
    const onboardingIntent = getOnboardingIntent(intent);
    if (onboardingIntent) params.set("intent", onboardingIntent);
    if (nextPath) params.set("next", nextPath);
    const query = params.toString();
    return query ? `/onboarding?${query}` : "/onboarding";
  }

  return nextPath ?? getRoleLandingPath(profile?.role);
}

function getSignupPath(nextPath: string | null, intent: LoginIntent | null) {
  const params = new URLSearchParams();
  if (intent) params.set("intent", intent);
  if (nextPath) params.set("next", nextPath);
  const query = params.toString();
  return query ? `/signup?${query}` : "/signup";
}

function getOnboardingIntent(
  intent: LoginIntent | null,
): "participant" | "host" | null {
  if (intent === "host") return "host";
  if (intent === "apply" || intent === "participant") return "participant";
  return null;
}

function getEffectiveLoginIntent(
  intent: LoginIntent | null,
  nextPath: string | null,
): LoginIntent {
  if (intent) return intent;
  if (nextPath?.startsWith("/host")) return "host";

  const nextRoute = nextPath?.split(/[?#]/u)[0] ?? "";
  if (/^\/programs\/[^/]+\/apply$/u.test(nextRoute)) return "apply";

  return "participant";
}

function getLoginHeroLines(intent: LoginIntent): [string, string] {
  if (intent === "host") {
    return ["채널 운영을", "누비오에서 시작해보세요"];
  }

  if (intent === "apply") {
    return ["프로그램 신청을", "누비오에서 이어가세요"];
  }

  return ["새로운 라이프스타일,", "여기서 시작해봐요"];
}

export function LoginPanel({
  initialParams,
}: {
  initialParams?: LoginPanelInitialParams;
}) {
  const router = useRouter();
  const authParams =
    initialParams ?? {
      errorMessage: "",
      intent: null,
      mode: "choice" as LoginMode,
      nextPath: null,
    };
  const [mode, setMode] = useState<LoginMode>(authParams.mode);
  const nextPath = authParams.nextPath;
  const intent = authParams.intent;
  const effectiveIntent = getEffectiveLoginIntent(intent, nextPath);
  const [heroLine1, heroLine2] = getLoginHeroLines(effectiveIntent);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [pendingProvider, setPendingProvider] = useState<SocialProviderKey | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(authParams.errorMessage);
  const signupPath = getSignupPath(nextPath, intent);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const payload = (await response.json()) as SessionPayload;

        if (!response.ok) {
          throw new Error(payload.error ?? "세션을 불러오지 못했습니다.");
        }

        if (isMounted) {
          setAuthProfile(payload.data?.profile ?? null);
        }
      } catch {
        if (isMounted) {
          setAuthProfile(null);
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSocialLogin(providerKey: SocialProviderKey) {
    const providerConfig = socialProviders.find(
      (provider) => provider.key === providerKey,
    );
    if (!providerConfig) return;

    setPendingProvider(providerKey);
    setErrorMessage("");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const callback = new URL("/auth/callback", window.location.origin);
      if (nextPath) callback.searchParams.set("next", nextPath);
      if (intent) callback.searchParams.set("intent", intent);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerConfig.provider,
        options: {
          redirectTo: callback.toString(),
        },
      });

      if (error) throw error;
    } catch (error) {
      setPendingProvider(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "소셜 로그인을 시작하지 못했습니다.",
      );
    }
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const payload = (await response.json()) as SessionPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "세션을 불러오지 못했습니다.");
      }

      router.push(getPostLoginPath(payload.data?.profile ?? null, nextPath, intent));
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "로그인 중 오류가 생겼어요.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLogoutLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("로그아웃하지 못했어요.");
      setAuthProfile(null);
      setMessage("로그아웃됐어요.");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "로그아웃하지 못했어요.",
      );
    } finally {
      setLogoutLoading(false);
    }
  }

  if (mode === "email") {
    return (
      <div className="min-h-screen bg-white">
        <AuthHeader onBack={() => setMode("choice")} />
        <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-sm flex-1 flex-col px-6 py-8 lg:py-16">
          <h2 className="text-center text-[22px] font-bold leading-snug text-[#111111]">
            이메일로 로그인
          </h2>

          <div className="mt-8 flex flex-col gap-6">
            <form className="space-y-4" onSubmit={handleEmailLogin}>
              <div>
                <label
                  className="mb-1.5 inline-flex text-[13px] font-semibold text-[#333333]"
                  htmlFor="login-email"
                >
                  이메일
                </label>
                <input
                  autoComplete="email"
                  className="h-12 w-full appearance-none rounded-xl border border-[#d5d5d5] bg-white px-3.5 py-2.5 text-[15px] text-[#111111] outline-none transition focus:border-[#378ADD] focus:ring-1 focus:ring-inset focus:ring-[#378ADD]"
                  id="login-email"
                  inputMode="email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </div>
              <div>
                <label
                  className="mb-1.5 inline-flex text-[13px] font-semibold text-[#333333]"
                  htmlFor="login-password"
                >
                  비밀번호
                </label>
                <input
                  autoComplete="current-password"
                  className="h-12 w-full appearance-none rounded-xl border border-[#d5d5d5] bg-white px-3.5 py-2.5 text-[15px] text-[#111111] outline-none transition focus:border-[#378ADD] focus:ring-1 focus:ring-inset focus:ring-[#378ADD]"
                  id="login-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>
              <button
                className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#378ADD] text-[16px] font-semibold text-white transition-colors hover:bg-[#2a6fb5] disabled:bg-[#d5d5d5] disabled:text-white/60"
                disabled={loading}
                type="submit"
              >
                {loading ? "로그인 중..." : "로그인하기"}
              </button>
            </form>

            <div className="text-right">
              <button
                className="text-[13px] font-medium text-[#888] underline underline-offset-2 hover:text-[#378ADD]"
                onClick={() => setMessage("이메일/비밀번호 찾기는 준비 중이에요.")}
                type="button"
              >
                이메일/비밀번호 찾기
              </button>
            </div>

            {errorMessage ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
                {errorMessage}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-xl bg-teal-50 px-4 py-3 text-[13px] font-semibold text-teal-800">
                {message}
              </p>
            ) : null}
          </div>

          <div className="fixed bottom-7 left-0 right-0 text-center lg:static lg:mt-8">
            <p className="text-[13px] font-medium text-[#888]">
              아직 계정이 없나요?{" "}
              <Link
                className="font-semibold text-[#378ADD] hover:underline"
                href={signupPath}
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <AuthHeader />
      <div className="mx-auto flex w-full max-w-sm flex-col items-center px-6 py-14">
        <h1 className="text-center text-[26px] font-bold leading-snug text-[#111111]">
          {heroLine1}
          <br />
          {heroLine2}
        </h1>

        {authProfile ? (
          <div className="mt-6 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <p className="text-[13px] font-semibold text-amber-800">
              {authProfile.displayName || authProfile.email}님으로 이미 로그인되어 있어요.
            </p>
            <p className="mt-0.5 text-[12px] text-amber-700">
              이어서 사용하거나, 다른 계정으로 로그인하려면 먼저 로그아웃해 주세요.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className="flex-1 rounded-lg bg-[#378ADD] py-2 text-[12px] font-bold text-white transition hover:bg-[#2a6fb5]"
                onClick={() =>
                  router.push(getPostLoginPath(authProfile, nextPath, intent))
                }
                type="button"
              >
                계속하기
              </button>
              <button
                className="flex-1 rounded-lg bg-amber-100 py-2 text-[12px] font-bold text-amber-900 transition hover:bg-amber-200 disabled:opacity-50"
                disabled={logoutLoading}
                onClick={() => void handleLogout()}
                type="button"
              >
                {logoutLoading ? "로그아웃 중..." : "로그아웃"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-10 w-full space-y-3">
          <p className="text-center text-[13px] font-semibold text-[#888]">
            간편 로그인
          </p>
          {availableSocialProviderKeys.map((providerKey) => (
            <SocialButton
              disabled={Boolean(pendingProvider)}
              key={providerKey}
              loading={pendingProvider === providerKey}
              onClick={() => void handleSocialLogin(providerKey)}
              providerKey={providerKey}
            />
          ))}

          <button
            className="relative h-12 w-full cursor-pointer rounded-xl bg-[#3DBFFB] shadow-[0_2px_8px_rgba(0,0,0,0.10)] transition hover:bg-[#1AAEE8] disabled:opacity-60"
            disabled={Boolean(pendingProvider)}
            onClick={() => setMode("email")}
            type="button"
          >
            <span className="flex items-center justify-center gap-3 text-[15px] font-semibold text-white">
              <span className="flex w-5 shrink-0 items-center justify-center">
                <MailIcon className="h-5 w-5" />
              </span>
              <span>이메일로 계속하기</span>
            </span>
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-5 w-full rounded-xl bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
            {errorMessage}
          </p>
        ) : null}
        {message ? (
          <p className="mt-5 w-full rounded-xl bg-teal-50 px-4 py-3 text-[13px] font-semibold text-teal-800">
            {message}
          </p>
        ) : null}

        <div className="fixed bottom-6 left-0 right-0 w-full text-center lg:static lg:mt-8">
          <button
            className="inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-[#aaa] underline underline-offset-2 hover:text-[#378ADD]"
            onClick={() => setMessage("가입 계정 찾기는 준비 중이에요.")}
            type="button"
          >
            어떤 계정으로 가입했는지 모르겠어요
            <QuestionIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function SocialButton({
  disabled,
  loading,
  onClick,
  providerKey,
}: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  providerKey: SocialProviderKey;
}) {
  if (providerKey === "kakao") {
    return (
      <button
        className="relative h-12 w-full cursor-pointer rounded-xl bg-[#FEE500] shadow-[0_2px_8px_rgba(0,0,0,0.10)] transition hover:brightness-95 disabled:opacity-60"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        <span className="flex items-center justify-center gap-3 text-[15px] font-semibold text-[#191919]">
          <span className="flex w-5 shrink-0 items-center justify-center">
            <KakaoIcon className="h-5 w-5" />
          </span>
          <span>{loading ? "연결 중..." : "카카오로 계속하기"}</span>
        </span>
      </button>
    );
  }

  if (providerKey === "naver") {
    return (
      <button
        className="relative h-12 w-full cursor-pointer rounded-xl bg-[#03C75A] text-white shadow-[0_2px_8px_rgba(0,0,0,0.10)] transition hover:brightness-95 disabled:opacity-60"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        <span className="flex items-center justify-center gap-3 text-[15px] font-semibold">
          <span className="flex w-5 shrink-0 items-center justify-center">
            <NaverIcon className="h-5 w-5" />
          </span>
          <span>{loading ? "연결 중..." : "네이버로 계속하기"}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      className="relative h-12 w-full cursor-pointer rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.10)] transition hover:bg-neutral-50 disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center justify-center gap-3 text-[15px] font-semibold text-[#333333]">
        <span className="flex w-5 shrink-0 translate-x-[2px] items-center justify-center">
          <GoogleIcon className="h-5 w-5" />
        </span>
        <span>{loading ? "연결 중..." : "Google로 계속하기"}</span>
      </span>
    </button>
  );
}
