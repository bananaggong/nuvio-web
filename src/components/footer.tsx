import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="font-pretendard border-t border-[#f1e7df] bg-white">
      <div className="mx-auto flex w-full flex-col px-[2.083vw] py-8 md:py-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <Link aria-label="누비오 홈" className="inline-flex w-fit items-center" href="/">
            <Image
              alt="누비오"
              className="h-[1.875vw] min-h-[22px] w-[5.594vw] min-w-[66px]"
              height={27}
              src="/brand/nuvio-wordmark.svg"
              width={81}
            />
          </Link>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold leading-none text-[#5B3A29]">
            <Link className="transition-colors hover:text-[#FF9A3D]" href="/terms">
              이용약관
            </Link>
            <Link className="transition-colors hover:text-[#FF9A3D]" href="/privacy">
              개인정보 수집 및 이용
            </Link>
            <Link
              className="transition-colors hover:text-[#FF9A3D]"
              href="/privacy/third-party"
            >
              개인정보 제3자 제공 동의
            </Link>
            <Link
              className="inline-flex h-[34px] items-center justify-center rounded-full border border-[#FF9A3D] px-4 text-sm font-semibold text-[#FE701E] transition-colors hover:bg-[#FFF6EC]"
              href="/host"
            >
              호스트센터
            </Link>
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[#f1e7df] pt-5 text-xs font-medium leading-[1.6] text-[#6D7A8A] md:flex-row md:items-center md:justify-between">
          <p>
            문의{" "}
            <a
              className="font-semibold text-[#5B3A29] transition-colors hover:text-[#FF9A3D]"
              href="mailto:contact@nuvio.kr"
            >
              contact@nuvio.kr
            </a>
          </p>
          <p>© 2026 누비오</p>
        </div>
      </div>
    </footer>
  );
}
