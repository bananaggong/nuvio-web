"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";

type Profile = {
  name: string;
  email: string;
  interest: string;
};

export function LoginPanel() {
  const router = useRouter();
  const [profile] = useState<Profile | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("nuvio:profile");
    return raw ? (JSON.parse(raw) as Profile) : null;
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextProfile: Profile = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      interest: String(form.get("interest") ?? "여행지원금"),
    };
    window.localStorage.setItem("nuvio:profile", JSON.stringify(nextProfile));
    router.push("/me");
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10 md:px-8">
      <h1 className="text-3xl font-black text-slate-950">NUVIO 시작하기</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        MVP에서는 소셜 로그인 대신 브라우저 저장소에 간단한 프로필을 저장합니다.
        이후 카카오/네이버/구글 로그인으로 교체할 수 있습니다.
      </p>

      {profile ? (
        <div className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-bold text-teal-800">
          {profile.name}님으로 저장되어 있습니다. 다시 저장하면 프로필이
          갱신됩니다.
        </div>
      ) : null}

      <form
        className="mt-6 grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={submit}
      >
        <label className="grid gap-2 text-sm font-black text-slate-700">
          이름
          <input
            className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={profile?.name}
            name="name"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          이메일
          <input
            className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={profile?.email}
            name="email"
            required
            type="email"
          />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          관심사
          <select
            className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={profile?.interest}
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
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-black text-white hover:bg-[var(--primary-strong)]"
          type="submit"
        >
          <LogIn size={18} />
          저장하고 계속
        </button>
      </form>
    </div>
  );
}
