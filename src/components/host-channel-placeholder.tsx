import { HostWorkspaceContent, HostWorkspaceLayout } from "@/components/host-workspace-ui";

const sectionLabels: Record<string, string> = {
  boards: "게시판함",
  free: "자유함",
  galleries: "갤러리함",
  magazines: "매거진함",
  menu: "메뉴 설정",
  programs: "프로그램",
  reviews: "후기",
};

export function HostChannelPlaceholder({ section = "home" }: { section?: string }) {
  const title = section === "home" ? "채널 홈" : (sectionLabels[section] ?? "채널 홈");

  return (
    <HostWorkspaceLayout>
      <HostWorkspaceContent>
        <div className="w-[var(--host-1118)] max-w-full pt-[var(--host-24)] max-md:w-full max-md:pt-5">
          <p className="text-[var(--host-12)] font-medium leading-[1.253] text-[#8B7A6E]">
            Channel Manager
          </p>
          <h1 className="mt-[var(--host-6)] text-[var(--host-22)] font-semibold leading-[1.253] text-[#33241C]">
            {title}
          </h1>
          <section className="mt-[var(--host-24)] rounded-[8px] border border-[#D9D9D9] bg-white px-[var(--host-24)] py-[var(--host-24)]">
            <p className="text-[var(--host-14)] font-normal leading-[1.6] text-[#6D7A8A]">
              이 영역은 채널 관리자 메뉴 구조를 먼저 연결해 둔 자리입니다. 다음 단계에서 {title} 기능을 이어서 붙일 수 있습니다.
            </p>
          </section>
        </div>
      </HostWorkspaceContent>
    </HostWorkspaceLayout>
  );
}
