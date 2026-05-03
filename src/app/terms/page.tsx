import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관",
};

export default function TermsPage() {
  return (
    <PolicyPage title="이용약관">
      <p>
        NUVIO는 여행지원금 및 지역 체류 프로그램 정보를 탐색할 수 있도록 돕는
        정보 중개 서비스입니다. 사용자는 공식 공고와 운영기관 안내를 최종 기준으로
        확인해야 합니다.
      </p>
      <p>
        사용자가 작성한 후기, 댓글, 제보는 사실에 근거해야 하며 개인정보,
        명예훼손, 광고성 콘텐츠는 숨김 또는 삭제될 수 있습니다.
      </p>
      <p>
        파트너가 제출한 자료는 검수 후 서비스 내 게시 목적으로 활용될 수 있으며,
        제출자는 필요한 게시 권한을 보유해야 합니다.
      </p>
    </PolicyPage>
  );
}

function PolicyPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <h1 className="text-3xl font-black text-slate-950">{title}</h1>
      <div className="mt-6 space-y-4 rounded-md border border-slate-200 bg-white p-5 text-base leading-8 text-slate-700">
        {children}
      </div>
    </div>
  );
}
