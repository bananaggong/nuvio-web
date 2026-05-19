import Image from "next/image";
import Link from "next/link";
import { Camera, Mail, MessageCircle, Send } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 md:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <div>
            <Image
              alt="누비오"
              className="h-9 w-auto"
              height={40}
              src="/brand/nuvio-wordmark.svg"
              width={120}
            />
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              누비오는 지역 체류 프로그램의 탐색, 신청, 선정 안내, 운영 관리,
              후기와 보고서 준비를 한 흐름으로 묶는 로컬 체류 운영 플랫폼입니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link className="hover:text-[var(--primary)]" href="/terms">
              이용약관
            </Link>
            <Link className="hover:text-[var(--primary)]" href="/privacy">
              개인정보 수집 및 이용
            </Link>
            <Link className="hover:text-[var(--primary)]" href="/privacy/third-party">
              개인정보 제3자 제공 동의
            </Link>
            <Link
              className="hover:text-[var(--primary)]"
              href="/host"
            >
              호스트센터
            </Link>
            <Link className="hover:text-[var(--primary)]" href="/admin">
              운영자
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-5 border-t border-slate-200 pt-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 text-xs leading-5 text-slate-500">
            <p>
              각 프로그램의 최종 조건, 선정, 지원금 지급 책임은 운영기관에
              있습니다. 누비오는 공고와 운영 데이터를 더 쉽게 확인하도록 돕습니다.
            </p>
            <p>
              외부 공고, 운영 문의, 사용자 후기 콘텐츠는 출처와 이용 권한을
              확인한 범위에서 게시합니다.
            </p>
            <p>회사명: 누비오 | 문의: 이메일 준비 중 | 2026 누비오</p>
          </div>
          <div className="flex gap-2 text-slate-500">
            <a
              aria-label="인스타그램"
              className="rounded-md border border-slate-200 p-2 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              href="https://www.instagram.com/"
              rel="noreferrer"
              target="_blank"
            >
              <Camera size={18} />
            </a>
            <a
              aria-label="이메일 문의"
              className="rounded-md border border-slate-200 p-2 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              href="mailto:hello@nuvio.local"
            >
              <Mail size={18} />
            </a>
            <Link
              aria-label="호스트센터"
              className="rounded-md border border-slate-200 p-2 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              href="/host"
            >
              <Send size={18} />
            </Link>
            <a
              aria-label="문의 채널"
              className="rounded-md border border-slate-200 p-2 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              href="mailto:support@nuvio.local"
            >
              <MessageCircle size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
