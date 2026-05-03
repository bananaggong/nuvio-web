import Link from "next/link";
import { Camera, Mail, MessageCircle, Send } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 md:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-md bg-[var(--primary)] text-sm font-black text-white">
                N
              </div>
              <span className="text-lg font-black">NUVIO</span>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              NUVIO는 여행지원금, 지역 체류, 워케이션, 로컬 프로젝트 정보를
              모아 보여주는 정보 중개 서비스입니다. 최종 조건과 신청 가능 여부는
              각 운영기관의 공식 공고를 기준으로 확인해 주세요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link className="hover:text-[var(--primary)]" href="/terms">
              이용약관
            </Link>
            <Link className="hover:text-[var(--primary)]" href="/privacy">
              개인정보처리방침
            </Link>
            <Link className="hover:text-[var(--primary)]" href="/partners/apply">
              프로그램 제보
            </Link>
            <Link className="hover:text-[var(--primary)]" href="/admin">
              운영자
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-5 border-t border-slate-200 pt-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 text-xs leading-5 text-slate-500">
            <p>
              NUVIO는 통신판매의 당사자가 아니며 프로그램 정보, 신청 조건,
              선정, 지급에 대한 최종 책임은 각 운영기관에 있습니다.
            </p>
            <p>
              외부 공고, 파트너 제출, 사용자 후기 콘텐츠는 출처와 이용 권한을
              확인한 범위에서 게시합니다. 무단 복제된 콘텐츠는 신고 접수 후
              검토합니다.
            </p>
            <p>회사명: 누비오랩 | 문의: hello@nuvio.local | © 2026 NUVIO</p>
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
            <a
              aria-label="제보하기"
              className="rounded-md border border-slate-200 p-2 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              href="/partners/apply"
            >
              <Send size={18} />
            </a>
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
