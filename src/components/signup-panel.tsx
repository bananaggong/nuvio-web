"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthHeader, ChevronRightIcon } from "@/components/auth-ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AgreementKey = "terms" | "privacy" | "age" | "event";
type SignupIntent = "participant" | "host";

function getSafeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function getSafeSignupIntent(value: string | null): SignupIntent | null {
  return value === "participant" || value === "host" ? value : null;
}

function getInitialSignupParams() {
  if (typeof window === "undefined") {
    return {
      intent: null,
      nextPath: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    intent: getSafeSignupIntent(params.get("intent")),
    nextPath: getSafeNextPath(params.get("next")),
  };
}

function getLoginPath(nextPath: string | null, intent: SignupIntent | null) {
  const params = new URLSearchParams();
  if (intent) params.set("intent", intent);
  if (nextPath) params.set("next", nextPath);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

function getPostSignupPath(nextPath: string | null, intent: SignupIntent | null) {
  const params = new URLSearchParams();
  if (intent) params.set("intent", intent);
  if (nextPath) params.set("next", nextPath);
  const query = params.toString();
  return query ? `/onboarding?${query}` : "/onboarding";
}

export function SignupPanel() {
  const router = useRouter();
  const [initialParams] = useState(getInitialSignupParams);
  const loginPath = getLoginPath(initialParams.nextPath, initialParams.intent);
  const [agreementsAccepted, setAgreementsAccepted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!/.+@.+\..+/.test(email.trim())) {
      setErrorMessage("유효한 이메일 주소를 입력해 주세요.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("비밀번호는 6자 이상 입력해 주세요.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const callback = new URL("/auth/callback", window.location.origin);
      if (initialParams.nextPath) {
        callback.searchParams.set("next", initialParams.nextPath);
      }
      if (initialParams.intent) {
        callback.searchParams.set("intent", initialParams.intent);
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callback.toString(),
          data: {
            contact_email: email.trim(),
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        router.push(getPostSignupPath(initialParams.nextPath, initialParams.intent));
        router.refresh();
        return;
      }

      setMessage(
        "회원가입 요청이 접수되었습니다. 이메일 확인 후 같은 계정으로 참여와 운영 기능을 사용할 수 있어요.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "회원가입을 완료하지 못했어요.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!agreementsAccepted) {
    return (
      <SignupAgreementScreen
        backHref={loginPath}
        onStart={() => setAgreementsAccepted(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <AuthHeader backHref={loginPath} />
      <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-sm flex-1 flex-col px-6 py-8 lg:py-16">
        <h2 className="text-center text-[22px] font-bold leading-snug text-[#111111]">
          이메일로 회원가입
        </h2>

        <div className="mt-8 flex flex-col gap-6">
          <form className="space-y-4" onSubmit={handleSignup}>
            <div>
              <label
                className="mb-1.5 inline-flex text-[13px] font-semibold text-[#333333]"
                htmlFor="signup-email"
              >
                연락 가능한 이메일
              </label>
              <input
                autoComplete="email"
                className="h-12 w-full appearance-none rounded-xl border border-[#d5d5d5] bg-white px-3.5 py-2.5 text-[15px] text-[#111111] outline-none transition focus:border-[#378ADD] focus:ring-1 focus:ring-inset focus:ring-[#378ADD]"
                id="signup-email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </div>
            <div>
              <label
                className="mb-1.5 inline-flex text-[13px] font-semibold text-[#333333]"
                htmlFor="signup-password"
              >
                비밀번호
              </label>
              <input
                autoComplete="new-password"
                className="h-12 w-full appearance-none rounded-xl border border-[#d5d5d5] bg-white px-3.5 py-2.5 text-[15px] text-[#111111] outline-none transition focus:border-[#378ADD] focus:ring-1 focus:ring-inset focus:ring-[#378ADD]"
                id="signup-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
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

            <button
              className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#378ADD] text-[16px] font-semibold text-white transition-colors hover:bg-[#2a6fb5] disabled:bg-[#d5d5d5] disabled:text-white/60"
              disabled={loading}
              type="submit"
            >
              {loading ? "가입 중..." : "회원가입 계속"}
            </button>
          </form>

          <p className="text-center text-[13px] font-medium leading-6 text-[#888]">
            다음 단계에서 이름, 전화번호, 주소를 입력하면 가입이 완료됩니다.
          </p>
        </div>

        <div className="fixed bottom-7 left-0 right-0 text-center lg:static lg:mt-8">
          <p className="text-[13px] font-medium text-[#888]">
            이미 계정이 있나요?{" "}
            <Link
              className="font-semibold text-[#378ADD] hover:underline"
              href={loginPath}
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function SignupAgreementScreen({
  backHref,
  onStart,
}: {
  backHref: string;
  onStart: () => void;
}) {
  const [agreements, setAgreements] = useState<Record<AgreementKey, boolean>>({
    terms: false,
    privacy: false,
    age: false,
    event: false,
  });

  const allChecked = Object.values(agreements).every(Boolean);
  const requiredChecked = agreements.terms && agreements.privacy && agreements.age;

  function toggleAll(checked: boolean) {
    setAgreements({
      terms: checked,
      privacy: checked,
      age: checked,
      event: checked,
    });
  }

  function toggleAgreement(key: AgreementKey, checked: boolean) {
    setAgreements((prev) => ({ ...prev, [key]: checked }));
  }

  return (
    <div className="min-h-screen bg-white">
      <AuthHeader backHref={backHref} />
      <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-sm flex-1 flex-col px-6 py-8 lg:py-16">
        <div className="mx-auto w-full max-w-[353px] lg:w-[353px]">
          <h2 className="text-center text-[24px] font-semibold leading-[1.35] text-[#111111]">
            원활한 서비스 이용을 위해
            <br />
            약관에 동의해주세요.
          </h2>
        </div>

        <div className="mx-auto mt-10 w-full max-w-[353px] lg:w-[353px]">
          <div className="flex flex-col">
            <div className="flex h-[34px] items-center justify-between text-sm">
              <label className="flex items-center gap-3" htmlFor="agreement-all">
                <input
                  checked={allChecked}
                  className="h-5 w-5 cursor-pointer rounded border-gray-300 accent-[#378ADD]"
                  id="agreement-all"
                  name="all"
                  onChange={(event) => toggleAll(event.target.checked)}
                  type="checkbox"
                />
                <span className="cursor-pointer text-[16px] font-bold leading-6 text-[#333333]">
                  전체 동의
                </span>
              </label>
            </div>

            <div className="mt-3 border-b border-[#d5d5d5]" />

            <div className="mt-4 flex flex-col gap-2">
              <AgreementRow
                checked={agreements.terms}
                href="/terms"
                id="agreement-terms"
                label="서비스 이용약관 (필수)"
                onChange={(checked) => toggleAgreement("terms", checked)}
              />
              <AgreementRow
                checked={agreements.privacy}
                href="/privacy"
                id="agreement-privacy"
                label="개인정보 수집 및 이용 (필수)"
                onChange={(checked) => toggleAgreement("privacy", checked)}
              />
              <AgreementRow
                checked={agreements.age}
                id="agreement-age"
                label="만 14세 이상 확인 (필수)"
                onChange={(checked) => toggleAgreement("age", checked)}
              />
              <AgreementRow
                checked={agreements.event}
                id="agreement-event"
                label="혜택/이벤트 정보 수신 동의 (선택)"
                onChange={(checked) => toggleAgreement("event", checked)}
              />
            </div>
          </div>

          <div className="fixed bottom-7 left-0 right-0 px-6 lg:static lg:mt-10 lg:px-0">
            <button
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#378ADD] px-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#2a6fb5] disabled:bg-[#d5d5d5] disabled:text-white/60"
              disabled={!requiredChecked}
              onClick={onStart}
              type="button"
            >
              시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgreementRow({
  checked,
  href,
  id,
  label,
  onChange,
}: {
  checked: boolean;
  href?: string;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex h-[34px] items-center justify-between text-sm">
      <label className="flex items-center gap-3" htmlFor={id}>
        <input
          checked={checked}
          className="h-5 w-5 cursor-pointer rounded border-gray-300 accent-[#378ADD]"
          id={id}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span className="cursor-pointer text-[16px] font-normal leading-6 text-[#111111]">
          {label}
        </span>
      </label>
      {href ? (
        <Link className="cursor-pointer font-bold text-[#111111]" href={href} target="_blank">
          <ChevronRightIcon />
        </Link>
      ) : null}
    </div>
  );
}
