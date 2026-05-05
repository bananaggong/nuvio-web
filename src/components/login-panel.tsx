"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  Loader2,
  LogIn,
  LogOut,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { socialProviders, type SocialProviderKey } from "@/lib/auth-providers";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthProfile } from "@/lib/auth-profile-db";

type LocalProfile = {
  name: string;
  email: string;
  interest: string;
};

type SessionPayload = {
  data?: {
    user: { id: string; email?: string } | null;
    profile: AuthProfile | null;
  };
  error?: string;
};

const providerIcons: Record<SocialProviderKey, typeof UserRound> = {
  google: UserRound,
  kakao: MessageCircle,
  naver: BadgeCheck,
};

export function LoginPanel() {
  const router = useRouter();
  const [localProfile, setLocalProfile] = useState<LocalProfile | null>(() => {
    if (typeof window === "undefined") return null;
    const rawProfile = window.localStorage.getItem("nuvio:profile");
    return rawProfile ? (JSON.parse(rawProfile) as LocalProfile) : null;
  });
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [pendingProvider, setPendingProvider] = useState<SocialProviderKey | null>(
    null,
  );
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("error") ? "소셜 로그인 처리 중 문제가 발생했습니다." : "";
  });

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
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "세션을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function signIn(providerKey: SocialProviderKey) {
    const providerConfig = socialProviders.find((provider) => provider.key === providerKey);
    if (!providerConfig) return;

    setPendingProvider(providerKey);
    setErrorMessage("");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/me`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerConfig.provider,
        options: {
          redirectTo,
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

  async function signOut() {
    setErrorMessage("");
    setMessage("");
    const response = await fetch("/api/auth/logout", { method: "POST" });

    if (!response.ok) {
      setErrorMessage("로그아웃에 실패했습니다.");
      return;
    }

    setAuthProfile(null);
    setMessage("로그아웃되었습니다.");
    router.refresh();
  }

  function submitLocalProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextProfile: LocalProfile = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      interest: String(form.get("interest") ?? "여행지원금"),
    };
    window.localStorage.setItem("nuvio:profile", JSON.stringify(nextProfile));
    setLocalProfile(nextProfile);
    router.push("/me");
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10 md:px-8">
      <h1 className="text-3xl font-black text-slate-950">NUVIO 시작하기</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Google, Kakao, Naver 계정으로 로그인하고 신청, 보관, 알림, 호스트 운영 데이터를
        계정 단위로 이어갑니다.
      </p>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-black text-slate-950">
          <UserRound className="text-[var(--primary)]" size={18} />
          소셜 로그인
        </div>

        {isLoadingSession ? (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-[var(--surface-muted)] p-3 text-sm font-bold text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            세션 확인 중
          </div>
        ) : authProfile ? (
          <div className="mt-4 rounded-md bg-teal-50 p-4">
            <p className="text-sm font-black text-teal-800">
              {authProfile.displayName || authProfile.email}님으로 로그인되었습니다.
            </p>
            <p className="mt-1 break-words text-xs font-bold text-teal-700">
              {authProfile.email}
            </p>
            <button
              className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-teal-200 bg-white px-3 text-sm font-black text-teal-700"
              onClick={signOut}
              type="button"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-2">
            {socialProviders.map((provider) => {
              const Icon = providerIcons[provider.key];
              const isPending = pendingProvider === provider.key;

              return (
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-800 hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-wait disabled:opacity-70"
                  disabled={Boolean(pendingProvider)}
                  key={provider.key}
                  onClick={() => signIn(provider.key)}
                  type="button"
                >
                  {isPending ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <Icon size={17} />
                  )}
                  {provider.label}로 계속
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-3 text-xs leading-5 text-slate-500">
          Naver는 Supabase Custom OAuth provider로 연결합니다. Supabase Auth Providers에서
          `custom:naver`를 생성하고 Redirect URL을 허용해야 실제 로그인이 동작합니다.
        </p>
      </section>

      {message ? (
        <div className="mt-4 rounded-md bg-teal-50 p-3 text-sm font-bold text-teal-800">
          {message}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="mt-4 flex gap-2 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <form
        className="mt-6 grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={submitLocalProfile}
      >
        <div>
          <p className="text-sm font-black text-slate-950">개발용 임시 프로필</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            OAuth provider 설정 전에도 마이페이지 흐름을 확인할 수 있도록 남겨둔
            브라우저 저장 방식입니다.
          </p>
        </div>
        {localProfile ? (
          <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-xs font-bold text-teal-800">
            {localProfile.name} 프로필이 이 브라우저에 저장되어 있습니다.
          </div>
        ) : null}
        <label className="grid gap-2 text-sm font-black text-slate-700">
          이름
          <input
            className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={localProfile?.name}
            name="name"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          이메일
          <input
            className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={localProfile?.email}
            name="email"
            required
            type="email"
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          관심사
          <select
            className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={localProfile?.interest}
            name="interest"
          >
            <option>여행지원금</option>
            <option>반값여행</option>
            <option>워케이션</option>
            <option>한달살기</option>
            <option>귀농귀촌</option>
          </select>
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-slate-950 text-sm font-black text-white hover:bg-slate-800"
          type="submit"
        >
          <LogIn size={18} />
          임시 저장하고 계속
        </button>
      </form>
    </div>
  );
}
