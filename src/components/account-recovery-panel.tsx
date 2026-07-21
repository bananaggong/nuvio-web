"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MailIcon } from "@/components/auth-ui";
import type { LoginIntent } from "@/components/login-panel";

type AccountRecoveryPanelProps = {
  intent: LoginIntent | null;
  loginPath: string;
  nextPath: string | null;
};

const SUCCESS_MESSAGE =
  "일치하는 계정이 있다면 입력한 이메일로 로그인 방법을 안내했어요.";

export function AccountRecoveryPanel({
  intent,
  loginPath,
  nextPath,
}: AccountRecoveryPanelProps) {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setErrorMessage("이메일을 입력해 주세요.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/account-recovery", {
        body: JSON.stringify({
          email: normalizedEmail,
          ...(intent ? { intent } : {}),
          ...(nextPath ? { next: nextPath } : {}),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (response.status !== 202) {
        throw new Error("요청을 처리하지 못했어요.");
      }

      setSubmitted(true);
    } catch {
      setErrorMessage("잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col px-6 py-10 sm:py-14 lg:py-20">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef7ff] text-[#378ADD]">
          <MailIcon className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-[24px] font-bold leading-snug text-[#111111]">
          이메일을 확인해 주세요
        </h1>
        <p
          aria-live="polite"
          className="mt-3 text-[15px] font-medium leading-6 text-[#666666]"
        >
          {SUCCESS_MESSAGE}
        </p>

        <Link
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#378ADD] text-[16px] font-semibold text-white transition-colors hover:bg-[#2a6fb5]"
          href={loginPath}
        >
          로그인으로 돌아가기
        </Link>
        <button
          className="mt-3 h-11 text-[13px] font-semibold text-[#777777] underline underline-offset-2 transition hover:text-[#378ADD]"
          onClick={() => {
            setSubmitted(false);
            setEmail("");
          }}
          type="button"
        >
          다른 이메일로 다시 찾기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col px-6 py-10 sm:py-14 lg:py-20">
      <h1 className="text-[24px] font-bold leading-snug text-[#111111]">
        가입 계정 찾기
      </h1>
      <p className="mt-3 text-[15px] font-medium leading-6 text-[#777777]">
        가입할 때 사용했을 가능성이 있는 이메일을 입력해 주세요.
      </p>

      <form className="mt-8" onSubmit={handleSubmit}>
        <label
          className="mb-2 inline-flex text-[13px] font-semibold text-[#333333]"
          htmlFor="account-recovery-email"
        >
          이메일
        </label>
        <input
          autoComplete="email"
          className="h-12 w-full appearance-none rounded-xl border border-[#d5d5d5] bg-white px-3.5 py-2.5 text-[16px] text-[#111111] outline-none transition placeholder:text-[#aaaaaa] focus:border-[#378ADD] focus:ring-1 focus:ring-inset focus:ring-[#378ADD]"
          id="account-recovery-email"
          inputMode="email"
          maxLength={254}
          onChange={(event) => {
            setEmail(event.target.value);
            if (errorMessage) setErrorMessage("");
          }}
          placeholder="name@example.com"
          required
          type="email"
          value={email}
        />

        {errorMessage ? (
          <p
            aria-live="polite"
            className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <button
          className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#378ADD] text-[16px] font-semibold text-white transition-colors hover:bg-[#2a6fb5] disabled:cursor-not-allowed disabled:bg-[#d5d5d5] disabled:text-white/70"
          disabled={loading}
          type="submit"
        >
          {loading ? "확인 중..." : "로그인 방법 안내받기"}
        </button>
      </form>

      <p className="mt-8 text-center text-[13px] font-medium leading-6 text-[#888888]">
        이메일이 기억나지 않나요?{" "}
        <Link
          className="font-semibold text-[#378ADD] underline underline-offset-2 hover:text-[#2a6fb5]"
          href="/support"
        >
          계정·로그인 문의
        </Link>
      </p>
    </div>
  );
}
