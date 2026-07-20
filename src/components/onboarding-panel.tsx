"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AuthHeader } from "@/components/auth-ui";
import { isSafeRelativePath } from "@/lib/url-security";
import {
  formatKoreanMobilePhone,
  formatKoreanMobilePhoneInput,
  isKoreanMobilePhone,
  KOREAN_MOBILE_PHONE_ERROR,
} from "@/lib/korean-mobile-phone";

type OnboardingIntent = "participant" | "host";
type OnboardingStep = 1 | 2 | 3;
type FieldKey = "displayName" | "phone" | "contactEmail" | "address";

type SessionPayload = {
  data?: {
    user: {
      email?: string;
      id: string;
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

const steps: Array<{ id: OnboardingStep; label: string }> = [
  { id: 1, label: "시작 방식" },
  { id: 2, label: "기본 정보" },
  { id: 3, label: "활동 지역" },
];

const intentOptions: Array<{
  description: string;
  icon: LucideIcon;
  id: OnboardingIntent;
  title: string;
}> = [
  {
    id: "participant",
    title: "누비어로 시작하기",
    description: "관심 있는 프로그램을 찾고 신청 내역과 알림을 관리해요.",
    icon: UserRound,
  },
  {
    id: "host",
    title: "호스트로 시작하기",
    description: "채널을 만들고 프로그램 신청자와 안내 메시지를 관리해요.",
    icon: Building2,
  },
];

export function OnboardingPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialIntent = useMemo(
    () => normalizeIntent(searchParams.get("intent")),
    [searchParams],
  );
  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get("next")),
    [searchParams],
  );
  const [step, setStep] = useState<OnboardingStep>(initialIntent ? 2 : 1);
  const [selectedIntent, setSelectedIntent] = useState<OnboardingIntent>(
    initialIntent ?? "participant",
  );
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>(
    {},
  );
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

        const profile = payload.data.profile;
        const user = payload.data.user;
        const profileIntent = normalizeIntent(profile?.onboardingIntent ?? null);
        const name =
          profile?.displayName ||
          getMetadataText(user.userMetadata, "full_name") ||
          getMetadataText(user.userMetadata, "name") ||
          "";

        setAccountEmail(user.email ?? profile?.email ?? "");
        setDisplayName(name);
        setPhone(
          formatKoreanMobilePhone(
            profile?.phone || getMetadataText(user.userMetadata, "phone") || "",
          ),
        );
        setContactEmail(profile?.contactEmail || profile?.email || user.email || "");
        setAddress(profile?.address || getMetadataText(user.userMetadata, "address") || "");

        if (!initialIntent && profileIntent) {
          setSelectedIntent(profileIntent);
          setStep((currentStep) => (currentStep === 1 ? 2 : currentStep));
        }
      } catch {
        if (active) {
          setErrorMessage("계정 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
      } finally {
        if (active) setLoadingSession(false);
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [initialIntent, router]);

  function updateField(key: FieldKey, value: string) {
    if (key === "displayName") setDisplayName(value);
    if (key === "phone") setPhone(formatKoreanMobilePhoneInput(value));
    if (key === "contactEmail") setContactEmail(value);
    if (key === "address") setAddress(value);

    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setErrorMessage("");
  }

  function goBack() {
    setErrorMessage("");
    setStep((currentStep) => {
      if (currentStep === 3) return 2;
      if (currentStep === 2) return 1;
      return 1;
    });
  }

  function goNext() {
    setErrorMessage("");

    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2 && validateContactStep()) {
      setStep(3);
    }
  }

  function validateContactStep() {
    const errors = collectContactErrors();
    setFieldErrors((current) => ({ ...current, ...errors }));
    return Object.keys(errors).length === 0;
  }

  function collectContactErrors() {
    const errors: Partial<Record<FieldKey, string>> = {};

    if (!displayName.trim()) {
      errors.displayName = "이름 또는 활동명을 입력해 주세요.";
    }

    if (!isKoreanMobilePhone(phone)) {
      errors.phone = KOREAN_MOBILE_PHONE_ERROR;
    }

    if (!contactEmail.trim()) {
      errors.contactEmail = "연락 가능한 이메일을 입력해 주세요.";
    } else if (!/.+@.+\..+/.test(contactEmail.trim())) {
      errors.contactEmail = "이메일 형식을 확인해 주세요.";
    }

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step !== 3) {
      goNext();
      return;
    }

    const contactErrors = collectContactErrors();
    const errors: Partial<Record<FieldKey, string>> = { ...contactErrors };

    if (!address.trim()) {
      errors.address = "활동 지역 또는 주소를 입력해 주세요.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage("필수 정보를 확인해 주세요.");
      if (Object.keys(contactErrors).length > 0) setStep(2);
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/me/onboarding", {
        body: JSON.stringify({
          address: address.trim(),
          contactEmail: contactEmail.trim(),
          displayName: displayName.trim(),
          intent: selectedIntent,
          phone: phone.trim(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "시작 정보를 저장하지 못했어요.");
      }

      window.dispatchEvent(new Event("nuvio-profile-updated"));
      router.push(destination);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "시작 정보를 저장하지 못했어요.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#fbfaf8]">
        <AuthHeader />
        <main className="grid min-h-[calc(100vh-3.5rem)] place-items-center px-6">
          <div className="flex items-center gap-3 rounded-[14px] border border-[#eadfd7] bg-white px-5 py-4 text-[14px] font-semibold text-[#6D7A8A] shadow-sm">
            <Loader2 className="size-4 animate-spin text-[#FE701E]" />
            시작 화면을 준비하고 있어요.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaf8]">
      <AuthHeader />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[624px] items-center px-5 py-8 sm:px-8 sm:py-12">
        <section className="w-full">
          {accountEmail ? (
            <div className="mb-3 flex min-h-11 items-center gap-3 rounded-[12px] border border-[#eadfd7] bg-white px-4 text-[13px] font-semibold text-[#748190]">
              <Mail className="size-4 text-[#FE701E]" />
              <span className="min-w-0 truncate">{accountEmail}</span>
              <span className="ml-auto shrink-0 text-[#9a8a7e]">로그인됨</span>
            </div>
          ) : null}

          <form
            className="rounded-[20px] border border-[#eadfd7] bg-white p-6 shadow-[0_20px_60px_rgba(75,51,40,0.08)] sm:p-8"
            onSubmit={handleSubmit}
          >
            <StepDots current={step} />

            {step === 1 ? (
              <div>
                <StepHeader title="어떤 방식으로 누비오를 시작할까요?" />

                <div className="mt-7 grid gap-3">
                  {intentOptions.map((option) => (
                    <IntentOptionButton
                      active={selectedIntent === option.id}
                      key={option.id}
                      option={option}
                      onClick={() => setSelectedIntent(option.id)}
                    />
                  ))}
                </div>

                <p className="mt-5 border-t border-[#f3e7dd] pt-4 text-[13px] font-medium leading-6 text-[#748190]">
                  같은 계정으로 누비어와 호스트 기능을 모두 사용할 수 있어요.
                </p>

                <WizardFooter>
                  <PrimaryButton disabled={saving} label="다음" type="submit" />
                </WizardFooter>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <BackStepButton onClick={goBack} />
                <StepHeader title="연락 가능한 기본 정보를 확인해요" />

                <div className="mt-7 grid gap-4">
                  <TextField
                    autoComplete="name"
                    error={fieldErrors.displayName}
                    icon={UserRound}
                    label="이름 또는 활동명"
                    onChange={(value) => updateField("displayName", value)}
                    placeholder="예: 김누비"
                    value={displayName}
                  />
                  <TextField
                    autoComplete="tel"
                    error={fieldErrors.phone}
                    icon={Phone}
                    inputMode="tel"
                    label="전화번호"
                    onChange={(value) => updateField("phone", value)}
                    placeholder="예: 010-1234-5678"
                    value={phone}
                  />
                  <TextField
                    autoComplete="email"
                    error={fieldErrors.contactEmail}
                    icon={Mail}
                    inputMode="email"
                    label="연락 가능한 이메일"
                    onChange={(value) => updateField("contactEmail", value)}
                    placeholder="hello@nuvio.kr"
                    type="email"
                    value={contactEmail}
                  />
                </div>

                <WizardFooter>
                  <SecondaryButton label="이전" onClick={goBack} />
                  <PrimaryButton disabled={saving} label="다음" type="submit" />
                </WizardFooter>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <BackStepButton onClick={goBack} />
                <StepHeader title="활동 지역을 확인하면 준비가 끝나요" />

                <div className="mt-7">
                  <TextField
                    autoComplete="street-address"
                    error={fieldErrors.address}
                    icon={MapPin}
                    label="활동 지역 또는 주소"
                    onChange={(value) => updateField("address", value)}
                    placeholder="예: 서울특별시 마포구 / 전남 여수"
                    value={address}
                  />
                </div>

                {errorMessage ? (
                  <p className="mt-5 rounded-[10px] bg-red-50 px-4 py-3 text-[13px] font-bold leading-5 text-red-700">
                    {errorMessage}
                  </p>
                ) : null}

                <WizardFooter>
                  <SecondaryButton label="이전" onClick={goBack} />
                  <PrimaryButton
                    disabled={saving}
                    label={
                      saving
                        ? "저장 중"
                        : selectedIntent === "host"
                          ? "호스트센터로 계속하기"
                          : "프로그램 둘러보기"
                    }
                    loading={saving}
                    type="submit"
                  />
                </WizardFooter>
              </div>
            ) : null}
          </form>
        </section>
      </main>
    </div>
  );
}

function StepDots({ current }: { current: OnboardingStep }) {
  return (
    <div className="mb-7 flex items-center justify-center gap-2">
      {steps.map((item) => (
        <span
          className={[
            "h-2 rounded-full transition-all",
            item.id === current
              ? "w-8 bg-[#FE701E]"
              : item.id < current
                ? "w-2 bg-[#f7b887]"
                : "w-2 bg-[#eadfd7]",
          ].join(" ")}
          key={item.id}
        />
      ))}
    </div>
  );
}

function StepHeader({ title }: { title: string }) {
  return (
    <header>
      <h2 className="text-[25px] font-black leading-tight tracking-normal text-[#2f2018] sm:text-[28px]">
        {title}
      </h2>
    </header>
  );
}

function IntentOptionButton({
  active,
  onClick,
  option,
}: {
  active: boolean;
  onClick: () => void;
  option: {
    description: string;
    icon: LucideIcon;
    title: string;
  };
}) {
  const Icon = option.icon;

  return (
    <button
      className={[
        "flex min-h-[92px] items-center gap-4 rounded-[14px] border px-4 text-left transition",
        active
          ? "border-[#FE701E] bg-[#fff7f1] shadow-[0_10px_28px_rgba(254,112,30,0.12)]"
          : "border-[#eadfd7] bg-white hover:border-[#f7b887] hover:bg-[#fffaf6]",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      <span
        className={[
          "grid size-11 shrink-0 place-items-center rounded-full",
          active ? "bg-[#FE701E] text-white" : "bg-[#f4f1ee] text-[#748190]",
        ].join(" ")}
      >
        {active ? <CheckCircle2 size={21} /> : <Icon size={21} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[16px] font-black text-[#3b2a21]">
          {option.title}
        </span>
        <span className="mt-1 block text-[13px] font-medium leading-5 text-[#748190]">
          {option.description}
        </span>
      </span>
    </button>
  );
}

function TextField({
  autoComplete,
  error,
  icon: Icon,
  inputMode,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  autoComplete?: string;
  error?: string;
  icon: LucideIcon;
  inputMode?: "email" | "tel" | "text";
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "email" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[13px] font-bold text-[#4B3328]">{label}</span>
      <span
        className={[
          "flex h-12 items-center gap-3 rounded-[10px] border bg-white px-3 transition",
          error
            ? "border-red-300 ring-2 ring-red-50"
            : "border-[#d8cec5] focus-within:border-[#FE701E] focus-within:ring-2 focus-within:ring-[#fff0e5]",
        ].join(" ")}
      >
        <Icon className="size-4 shrink-0 text-[#9a8a7e]" />
        <input
          autoComplete={autoComplete}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[#2f2018] outline-none placeholder:text-[#b8ada4]"
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
      </span>
      {error ? (
        <span className="text-[12px] font-semibold text-red-600">{error}</span>
      ) : null}
    </label>
  );
}

function BackStepButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="mb-4 inline-flex items-center gap-1 text-[13px] font-bold text-[#748190] transition hover:text-[#FE701E]"
      onClick={onClick}
      type="button"
    >
      <ArrowLeft size={15} />
      이전으로
    </button>
  );
}

function WizardFooter({ children }: { children: ReactNode }) {
  return <div className="mt-8 flex flex-col gap-3 sm:flex-row">{children}</div>;
}

function PrimaryButton({
  disabled,
  label,
  loading = false,
  type,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  type: "button" | "submit";
}) {
  return (
    <button
      className="inline-flex h-12 flex-1 items-center justify-center rounded-[12px] bg-[#FE701E] px-5 text-[15px] font-black text-white transition hover:bg-[#e95f13] disabled:cursor-not-allowed disabled:bg-[#d8cec5]"
      disabled={disabled}
      type={type}
    >
      {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      {label}
    </button>
  );
}

function SecondaryButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-12 flex-1 items-center justify-center rounded-[12px] border border-[#d8cec5] bg-white px-5 text-[15px] font-black text-[#748190] transition hover:border-[#FE701E] hover:text-[#FE701E]"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function normalizeIntent(value: string | null): OnboardingIntent | null {
  return value === "participant" || value === "host" ? value : null;
}

function getSafeNextPath(value: string | null): string | null {
  return value && isSafeRelativePath(value) ? value : null;
}

function getDestinationPath(intent: OnboardingIntent, nextPath: string | null) {
  if (nextPath && !nextPath.startsWith("/onboarding")) return nextPath;
  return intent === "host" ? "/host" : "/";
}

function getMetadataText(
  metadata: Record<string, unknown> | undefined,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
