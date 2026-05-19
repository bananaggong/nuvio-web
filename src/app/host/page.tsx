import type { Metadata } from "next";
import { HostAccessBanner } from "@/components/host-access-banner";

export const metadata: Metadata = {
  title: "호스트센터",
  description:
    "누비오 사용자가 프로그램 운영 기능을 시작하는 호스트센터 첫 화면입니다.",
};

export default function HostPage() {
  return (
    <>
      <HostAccessBanner />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <section className="min-h-[360px] rounded-md border border-dashed border-slate-200 bg-white p-6">
          <p className="text-sm font-black text-[var(--primary)]">호스트센터</p>
        </section>
      </main>
    </>
  );
}
