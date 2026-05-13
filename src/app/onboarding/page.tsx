import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingPanel } from "@/components/onboarding-panel";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "처음 시작하기",
  noIndex: true,
  path: "/onboarding",
});

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-white text-sm font-bold text-slate-500">
          시작 화면을 준비하는 중입니다.
        </div>
      }
    >
      <OnboardingPanel />
    </Suspense>
  );
}
