import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <h1 className="text-3xl font-black text-slate-950">개인정보처리방침</h1>
      <div className="mt-6 space-y-4 rounded-md border border-slate-200 bg-white p-5 text-base leading-8 text-slate-700">
        <p>
          MVP에서는 입력한 프로필, 보관, 알림, 지원 기록이 사용자의 브라우저
          저장소에만 저장됩니다. 서버로 전송되는 실제 회원 데이터는 없습니다.
        </p>
        <p>
          정식 서비스 전환 시 회원 식별, 알림 발송, 고객문의, 부정 이용 방지를
          위한 최소한의 개인정보만 수집하며 수집 항목과 보유 기간을 별도로
          고지합니다.
        </p>
        <p>
          사용자는 개인정보 열람, 정정, 삭제를 요청할 수 있으며 서비스는 관련
          법령에 따라 처리합니다.
        </p>
      </div>
    </div>
  );
}
