"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Plus,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { formatProgramDisplayCode } from "@/lib/display-code";
import {
  channelHomeLabel,
  channelHostHref,
  getVisibleChannelMenuItems,
} from "@/lib/channel-menu";
import { buildChannelScopedHref, selectHostChannel } from "@/lib/host-channel-selection";
import { hostProjectPath, type HostProgramOverview } from "@/lib/host-projects";
import type { Village } from "@/lib/village-types";

const hostWorkspaceScaleStyle = {
  "--host-scale": "clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333)",
  "--host-2": "clamp(2px, 0.139vw, 2.667px)",
  "--host-3": "clamp(3px, 0.208vw, 4px)",
  "--host-4": "clamp(4px, 0.278vw, 5.333px)",
  "--host-5": "clamp(5px, 0.347vw, 6.667px)",
  "--host-6": "clamp(6px, 0.417vw, 8px)",
  "--host-7": "clamp(7px, 0.486vw, 9.333px)",
  "--host-8": "clamp(8px, 0.556vw, 10.667px)",
  "--host-9": "clamp(9px, 0.625vw, 12px)",
  "--host-10": "clamp(10px, 0.694vw, 13.333px)",
  "--host-11": "clamp(11px, 0.764vw, 14.667px)",
  "--host-12": "clamp(12px, 0.833vw, 16px)",
  "--host-13": "clamp(13px, 0.903vw, 17.333px)",
  "--host-14": "clamp(14px, 0.972vw, 18.667px)",
  "--host-15": "clamp(15px, 1.042vw, 20px)",
  "--host-16": "clamp(16px, 1.111vw, 21.333px)",
  "--host-17": "clamp(17px, 1.181vw, 22.667px)",
  "--host-18": "clamp(18px, 1.25vw, 24px)",
  "--host-19": "clamp(19px, 1.319vw, 25.333px)",
  "--host-20": "clamp(20px, 1.389vw, 26.667px)",
  "--host-21": "clamp(21px, 1.458vw, 28px)",
  "--host-22": "clamp(22px, 1.528vw, 29.333px)",
  "--host-23": "clamp(23px, 1.597vw, 30.667px)",
  "--host-24": "clamp(24px, 1.667vw, 32px)",
  "--host-25": "clamp(25px, 1.736vw, 33.333px)",
  "--host-27": "clamp(27px, 1.875vw, 36px)",
  "--host-28": "clamp(28px, 1.944vw, 37.333px)",
  "--host-29": "clamp(29px, 2.014vw, 38.667px)",
  "--host-30": "clamp(30px, 2.083vw, 40px)",
  "--host-31": "clamp(31px, 2.153vw, 41.333px)",
  "--host-32": "clamp(32px, 2.222vw, 42.667px)",
  "--host-33": "clamp(33px, 2.292vw, 44px)",
  "--host-34": "clamp(34px, 2.361vw, 45.333px)",
  "--host-35": "clamp(35px, 2.431vw, 46.667px)",
  "--host-36": "clamp(36px, 2.5vw, 48px)",
  "--host-36-7": "clamp(36.7px, 2.549vw, 48.933px)",
  "--host-37": "clamp(37px, 2.569vw, 49.333px)",
  "--host-38": "clamp(38px, 2.639vw, 50.667px)",
  "--host-39": "clamp(39px, 2.708vw, 52px)",
  "--host-40": "clamp(40px, 2.778vw, 53.333px)",
  "--host-40-7": "clamp(40.7px, 2.826vw, 54.267px)",
  "--host-42": "clamp(42px, 2.917vw, 56px)",
  "--host-43": "clamp(43px, 2.986vw, 57.333px)",
  "--host-44": "clamp(44px, 3.056vw, 58.667px)",
  "--host-45": "clamp(45px, 3.125vw, 60px)",
  "--host-46": "clamp(46px, 3.194vw, 61.333px)",
  "--host-48": "clamp(48px, 3.333vw, 64px)",
  "--host-50": "clamp(50px, 3.472vw, 66.667px)",
  "--host-52": "clamp(52px, 3.611vw, 69.333px)",
  "--host-53-5": "clamp(53.5px, 3.715vw, 71.333px)",
  "--host-56": "clamp(56px, 3.889vw, 74.667px)",
  "--host-58": "clamp(58px, 4.028vw, 77.333px)",
  "--host-60": "clamp(60px, 4.167vw, 80px)",
  "--host-62": "clamp(62px, 4.306vw, 82.667px)",
  "--host-64": "clamp(64px, 4.444vw, 85.333px)",
  "--host-66": "clamp(66px, 4.583vw, 88px)",
  "--host-68": "clamp(68px, 4.722vw, 90.667px)",
  "--host-69": "clamp(69px, 4.792vw, 92px)",
  "--host-70": "clamp(70px, 4.861vw, 93.333px)",
  "--host-71": "clamp(71px, 4.931vw, 94.667px)",
  "--host-76": "clamp(76px, 5.278vw, 101.333px)",
  "--host-77": "clamp(77px, 5.347vw, 102.667px)",
  "--host-81": "clamp(81px, 5.625vw, 108px)",
  "--host-82": "clamp(82px, 5.694vw, 109.333px)",
  "--host-85": "clamp(85px, 5.903vw, 113.333px)",
  "--host-86": "clamp(86px, 5.972vw, 114.667px)",
  "--host-87": "clamp(87px, 6.042vw, 116px)",
  "--host-90": "clamp(90px, 6.25vw, 120px)",
  "--host-91": "clamp(91px, 6.319vw, 121.333px)",
  "--host-93": "clamp(93px, 6.458vw, 124px)",
  "--host-95": "clamp(95px, 6.597vw, 126.667px)",
  "--host-99": "clamp(99px, 6.875vw, 132px)",
  "--host-105": "clamp(105px, 7.292vw, 140px)",
  "--host-110": "clamp(110px, 7.639vw, 146.667px)",
  "--host-113": "clamp(113px, 7.847vw, 150.667px)",
  "--host-115": "clamp(115px, 7.986vw, 153.333px)",
  "--host-119": "clamp(119px, 8.264vw, 158.667px)",
  "--host-123": "clamp(123px, 8.542vw, 164px)",
  "--host-128": "clamp(128px, 8.889vw, 170.667px)",
  "--host-129": "clamp(129px, 8.958vw, 172px)",
  "--host-133": "clamp(133px, 9.236vw, 177.333px)",
  "--host-135": "clamp(135px, 9.375vw, 180px)",
  "--host-138": "clamp(138px, 9.583vw, 184px)",
  "--host-142": "clamp(142px, 9.861vw, 189.333px)",
  "--host-150": "clamp(150px, 10.417vw, 200px)",
  "--host-156": "clamp(156px, 10.833vw, 208px)",
  "--host-166": "clamp(166px, 11.528vw, 221.333px)",
  "--host-176": "clamp(176px, 12.222vw, 234.667px)",
  "--host-178": "clamp(178px, 12.361vw, 237.333px)",
  "--host-179": "clamp(179px, 12.431vw, 238.667px)",
  "--host-188": "clamp(188px, 13.056vw, 250.667px)",
  "--host-194": "clamp(194px, 13.472vw, 258.667px)",
  "--host-198": "clamp(198px, 13.75vw, 264px)",
  "--host-200": "clamp(200px, 13.889vw, 266.667px)",
  "--host-210": "clamp(210px, 14.583vw, 280px)",
  "--host-216": "clamp(216px, 15vw, 288px)",
  "--host-219": "clamp(219px, 15.208vw, 292px)",
  "--host-222": "clamp(222px, 15.417vw, 296px)",
  "--host-228": "clamp(228px, 15.833vw, 304px)",
  "--host-235": "clamp(235px, 16.319vw, 313.333px)",
  "--host-243": "clamp(243px, 16.875vw, 324px)",
  "--host-245": "clamp(245px, 17.014vw, 326.667px)",
  "--host-247": "clamp(247px, 17.153vw, 329.333px)",
  "--host-254": "clamp(254px, 17.639vw, 338.667px)",
  "--host-257": "clamp(257px, 17.847vw, 342.667px)",
  "--host-264": "clamp(264px, 18.333vw, 352px)",
  "--host-270": "clamp(270px, 18.75vw, 360px)",
  "--host-281": "clamp(281px, 19.514vw, 374.667px)",
  "--host-288": "clamp(288px, 20vw, 384px)",
  "--host-295": "clamp(295px, 20.486vw, 393.333px)",
  "--host-340": "clamp(340px, 23.611vw, 453.333px)",
  "--host-344": "clamp(344px, 23.889vw, 458.667px)",
  "--host-351": "clamp(351px, 24.375vw, 468px)",
  "--host-352": "clamp(352px, 24.444vw, 469.333px)",
  "--host-354": "clamp(354px, 24.583vw, 472px)",
  "--host-359": "clamp(359px, 24.931vw, 478.667px)",
  "--host-368": "clamp(368px, 25.556vw, 490.667px)",
  "--host-370": "clamp(370px, 25.694vw, 493.333px)",
  "--host-386": "clamp(386px, 26.806vw, 514.667px)",
  "--host-398": "clamp(398px, 27.639vw, 530.667px)",
  "--host-415": "clamp(415px, 28.819vw, 553.333px)",
  "--host-427": "clamp(427px, 29.653vw, 569.333px)",
  "--host-430": "clamp(430px, 29.861vw, 573.333px)",
  "--host-433": "clamp(433px, 30.069vw, 577.333px)",
  "--host-450": "clamp(450px, 31.25vw, 600px)",
  "--host-457": "clamp(457px, 31.736vw, 609.333px)",
  "--host-480": "clamp(480px, 33.333vw, 640px)",
  "--host-501": "clamp(501px, 34.792vw, 668px)",
  "--host-507": "clamp(507px, 35.208vw, 676px)",
  "--host-509": "clamp(509px, 35.347vw, 678.667px)",
  "--host-511": "clamp(511px, 35.486vw, 681.333px)",
  "--host-514": "clamp(514px, 35.694vw, 685.333px)",
  "--host-521": "clamp(521px, 36.181vw, 694.667px)",
  "--host-529": "clamp(529px, 36.736vw, 705.333px)",
  "--host-530": "clamp(530px, 36.806vw, 706.667px)",
  "--host-539": "clamp(539px, 37.431vw, 718.667px)",
  "--host-546": "clamp(546px, 37.917vw, 728px)",
  "--host-547": "clamp(547px, 37.986vw, 729.333px)",
  "--host-550": "clamp(550px, 38.194vw, 733.333px)",
  "--host-557": "clamp(557px, 38.681vw, 742.667px)",
  "--host-560": "clamp(560px, 38.889vw, 746.667px)",
  "--host-567": "clamp(567px, 39.375vw, 756px)",
  "--host-573": "clamp(573px, 39.792vw, 764px)",
  "--host-577": "clamp(577px, 40.069vw, 769.333px)",
  "--host-583": "clamp(583px, 40.486vw, 777.333px)",
  "--host-591": "clamp(591px, 41.042vw, 788px)",
  "--host-600": "clamp(600px, 41.667vw, 800px)",
  "--host-603": "clamp(603px, 41.875vw, 804px)",
  "--host-636": "clamp(636px, 44.167vw, 848px)",
  "--host-643": "clamp(643px, 44.653vw, 857.333px)",
  "--host-707": "clamp(707px, 49.097vw, 942.667px)",
  "--host-730": "clamp(730px, 50.694vw, 973.333px)",
  "--host-765": "clamp(765px, 53.125vw, 1020px)",
  "--host-782": "clamp(782px, 54.306vw, 1042.667px)",
  "--host-827": "clamp(827px, 57.431vw, 1102.667px)",
  "--host-959": "clamp(959px, 66.597vw, 1278.667px)",
  "--host-1007": "clamp(1007px, 69.931vw, 1342.667px)",
  "--host-1076": "clamp(1076px, 74.722vw, 1434.667px)",
  "--host-1086": "clamp(1086px, 75.417vw, 1448px)",
  "--host-1103": "clamp(1103px, 76.597vw, 1470.667px)",
  "--host-1114": "clamp(1114px, 77.361vw, 1485.333px)",
  "--host-1118": "clamp(1118px, 77.639vw, 1490.667px)",
  "--host-1142": "clamp(1142px, 79.306vw, 1522.667px)",
  "--host-1158": "clamp(1158px, 80.417vw, 1544px)",
  "--host-1170": "clamp(1170px, 81.25vw, 1560px)",
  "--host-1230": "clamp(1230px, 85.417vw, 1640px)",
  "--host-1261": "clamp(1261px, 87.569vw, 1681.333px)",
  "--host-1736": "clamp(1736px, 120.556vw, 2314.667px)",
  "--host-1794": "clamp(1794px, 124.583vw, 2392px)",
  "--host-1806": "clamp(1806px, 125.417vw, 2408px)",
  "--host-1864": "clamp(1864px, 129.444vw, 2485.333px)",
  "--host-2053": "clamp(2053px, 142.569vw, 2737.333px)",
  "--host-2260": "clamp(2260px, 156.944vw, 3013.333px)",
  "--host-3942": "clamp(3942px, 273.75vw, 5256px)",
} as CSSProperties;

export type HostProgramListItem = HostProgramOverview & {
  projectId?: string;
  projectTitle: string;
  villageName: string;
};

type HostWorkspaceLayoutProps = {
  children: ReactNode;
  sidebarHeight?: string;
};

export function HostWorkspaceLayout({
  children,
  sidebarHeight = "min-h-[calc(100vh-4.861vw)]",
}: HostWorkspaceLayoutProps) {
  return (
    <main
      className="font-pretendard min-h-[calc(100vh-4.861vw)] w-full max-w-full overflow-x-clip bg-white text-[#33241C]"
      style={hostWorkspaceScaleStyle}
    >
      <div className="flex min-h-[calc(100vh-4.861vw)] w-full max-w-full overflow-x-clip max-md:flex-col">
        <HostWorkspaceSidebar sidebarHeight={sidebarHeight} />
        {children}
      </div>
    </main>
  );
}

function HostWorkspaceSidebar({ sidebarHeight }: { sidebarHeight: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const messagePanel = searchParams.get("panel");
  const messageStatus = searchParams.get("status");
  const messageView = searchParams.get("view");
  const channelSlug = searchParams.get("channel");
  const activeWorkspaceTab = pathname.startsWith("/host/channels")
    ? "channel"
    : "host";
  const onMessagesPage = pathname === "/host/messages";
  const onFormsPage = pathname === "/host/forms" || pathname.startsWith("/host/forms/");
  const onSettingsPage = pathname === "/host/settings";
  const endedMessagesRequested =
    messageView === "ended" ||
    messageStatus === "ended" ||
    messageStatus === "end" ||
    messagePanel === "ended" ||
    messagePanel === "end";
  const hostProgramStatus = getHostProgramStatusParam(searchParams.get("status"));
  const ongoingMessagesActive = onMessagesPage && !endedMessagesRequested;
  const endedMessagesActive = onMessagesPage && endedMessagesRequested;

  return (
    <aside
      className={`w-[var(--host-210)] min-w-[210px] shrink-0 border-r border-[#6D7A8A] bg-white shadow-[2px_5px_5.2px_rgba(0,0,0,0.23)] ${sidebarHeight} max-md:w-full max-md:min-h-0 max-md:border-r-0 max-md:shadow-none`}
    >
      <div className="px-[0.417vw] max-md:px-5">
        <div className="w-[var(--host-198)] min-w-[198px] max-md:w-full">
          <section className="h-[5.972vw] min-h-[86px]">
            <div className="flex h-[2.778vw] min-h-10 items-center justify-center pb-[0.556vw] pt-[0.833vw]">
              <span className="w-[var(--host-176)] min-w-[176px] text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
                로컬 호스트님
              </span>
              <Image
                alt=""
                className="size-[var(--host-20)] shrink-0"
                height={20}
                src={nuvioIcons.bell}
                width={20}
              />
            </div>
            <div className="flex h-[3.194vw] min-h-[46px] items-end border-b border-[#D9D9D9] pt-[0.833vw] text-center">
              <HostWorkspaceSwitchTab
                active={activeWorkspaceTab === "host"}
                href="/host"
                label="호스트"
              />
              <span className="mb-[0.417vw] h-[1.528vw] min-h-[22px] w-px bg-[#D9D9D9]" />
              <HostWorkspaceSwitchTab
                active={activeWorkspaceTab === "channel"}
                href="/host/channels"
                label="채널"
              />
            </div>
          </section>

          {activeWorkspaceTab === "channel" ? (
            <HostChannelSidebarNav channelSlug={channelSlug} pathname={pathname} />
          ) : (
            <nav className="mt-[0.833vw] px-[0.833vw] text-[#5B3A29]">
              <section className="flex flex-col gap-[0.417vw]">
                <Link
                  className="block w-full text-[length:var(--host-14)] font-semibold leading-[1.253]"
                  href="/host"
                >
                  내 프로그램
                </Link>
                <div className="flex w-full flex-col gap-[3px] border-b-[0.8px] border-[#6D7A8A] pb-[0.833vw] pl-[0.417vw]">
                  <HostSidebarSubLink
                    active={pathname === "/host" && hostProgramStatus === "open"}
                    href="/host?status=open"
                    label="오픈 프로그램"
                  />
                  <HostSidebarSubLink
                    active={pathname === "/host" && hostProgramStatus === "upcoming"}
                    href="/host?status=upcoming"
                    label="예정 프로그램"
                  />
                  <HostSidebarSubLink
                    active={pathname === "/host" && hostProgramStatus === "closed"}
                    href="/host?status=closed"
                    label="마감 프로그램"
                  />
                </div>
              </section>
              <div className="mt-[0.903vw] grid gap-[0.903vw]">
                <section className="flex flex-col gap-[6px]">
                  <p
                    className={`text-[length:var(--host-14)] leading-[1.253] ${
                      onMessagesPage ? "font-semibold" : "font-normal"
                    }`}
                  >
                    메세지
                  </p>
                  <div className="flex w-full flex-col gap-[3px] border-b-[0.8px] border-[#6D7A8A] pb-[0.833vw] pl-[0.417vw]">
                    <HostSidebarSubLink
                      active={ongoingMessagesActive}
                      href="/host/messages"
                      label="진행 중인 메세지"
                    />
                    <HostSidebarSubLink
                      active={endedMessagesActive}
                      href="/host/messages?view=ended"
                      label="종료된 메세지"
                    />
                  </div>
                </section>
                <HostSidebarRootLink
                  active={onFormsPage}
                  href="/host/forms"
                  label="신청서 양식"
                />
                <HostSidebarRootLink
                  active={onSettingsPage}
                  href="/host/settings"
                  label="설정"
                />
              </div>
            </nav>
          )}
        </div>
      </div>
    </aside>
  );
}

function HostWorkspaceSwitchTab({
  active = false,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`flex h-[2.361vw] min-h-[34px] flex-1 items-center justify-center pb-[0.556vw] pt-[0.347vw] text-[length:var(--host-14)] leading-[1.253] transition ${
        active
          ? "border-b-2 border-[#FF9A3D] font-medium text-[#FE701E]"
          : "font-normal text-[#CAC4BC] hover:text-[#FE701E]"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

function HostChannelSidebarNav({
  channelSlug,
  pathname,
}: {
  channelSlug: string | null;
  pathname: string;
}) {
  const [channel, setChannel] = useState<Village | null>(null);

  useEffect(() => {
    let active = true;

    async function loadChannel() {
      const response = await fetch("/api/host/channels", { cache: "no-store" }).catch(
        () => null,
      );
      if (!active || !response?.ok) return;

      const payload = (await response.json().catch(() => ({}))) as {
        data?: Village[];
      };
      if (!active) return;

      setChannel(selectHostChannel(payload.data, channelSlug));
    }

    function handleMenuUpdated() {
      void loadChannel();
    }

    void loadChannel();
    window.addEventListener("nuvio-channel-menu-updated", handleMenuUpdated);

    return () => {
      active = false;
      window.removeEventListener("nuvio-channel-menu-updated", handleMenuUpdated);
    };
  }, [channelSlug]);

  const channelSidebarItems = [
    { href: "/host/channels", label: channelHomeLabel },
    ...getVisibleChannelMenuItems(channel).map((item) => ({
      href: channelHostHref(item.kind),
      label: item.label,
    })),
    { href: "/host/channels/settings", label: "+메뉴 설정" },
  ];

  return (
    <nav className="mt-[0.833vw] px-[0.833vw] text-[#5B3A29]">
      <section className="flex flex-col gap-[0.556vw] border-b-[0.8px] border-[#6D7A8A] pb-[0.833vw]">
        {channelSidebarItems.map((item) => (
          <HostSidebarRootLink
            active={pathname === item.href || (item.href === "/host/channels/settings" && pathname === "/host/channels/menu")}
            href={buildChannelScopedHref(item.href, channelSlug)}
            key={item.href}
            label={item.label}
          />
        ))}
      </section>
      <div className="mt-[0.903vw]">
        <HostSidebarRootLink
          active={pathname === "/host/channels/channel-settings"}
          href={buildChannelScopedHref("/host/channels/channel-settings", channelSlug)}
          label="채널 설정"
        />
      </div>
    </nav>
  );
}

function HostSidebarRootLink({
  active = false,
  href,
  label,
  muted = false,
}: {
  active?: boolean;
  href: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <Link
      className={`block w-fit rounded-[4px] py-[0.139vw] leading-[1.253] transition ${
        active
          ? `${muted ? "text-[length:var(--host-12)] text-[#FE701E]" : "text-[length:var(--host-14)] text-[#5B3A29]"} font-semibold`
          : `${muted ? "text-[length:var(--host-12)] text-[#FE701E]" : "text-[length:var(--host-14)] text-[#5B3A29]"} font-normal hover:text-[#FE701E]`
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

function HostSidebarSubLink({
  active = false,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`block w-fit rounded-[4px] px-[0.556vw] py-[0.139vw] text-[length:var(--host-12)] leading-[1.253] transition ${
        active
          ? "bg-[#FF9A3D] font-semibold text-[#F9F9F9]"
          : "font-normal text-[#5B3A29] hover:text-[#FE701E]"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

function getHostProgramStatusParam(value: string | null) {
  if (value === "open" || value === "upcoming" || value === "closed") {
    return value;
  }

  return null;
}

export function HostWorkspaceContent({
  children,
  insideFolder = false,
}: {
  children: ReactNode;
  insideFolder?: boolean;
}) {
  return (
    <section
      className={`min-w-0 flex-1 ${
        insideFolder
          ? "pl-[1.944vw] pr-[3.611vw] max-md:px-5"
          : "pl-[2.778vw] pr-[3.75vw] max-md:px-5"
      }`}
    >
      {children}
    </section>
  );
}

export function HostSectionTitle({
  action,
  title,
}: {
  action?: ReactNode;
  title: string;
}) {
  return (
    <div className="flex h-[var(--host-29)] items-center gap-[var(--host-34)]">
      <h2
        className="text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6d7a8a]"
        style={{ color: "#6D7A8A" }}
      >
        {title}
      </h2>
      {action}
    </div>
  );
}

export function HostSmallButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        className="inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] bg-[#6d7a8a] px-[var(--host-12)] py-[var(--host-4)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#fff6ec] transition hover:bg-[#5f6b79]"
        onClick={onClick}
        style={{ backgroundColor: "#6D7A8A", color: "#FFF6EC" }}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <span
      className="inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] bg-[#6d7a8a] px-[var(--host-12)] py-[var(--host-4)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#fff6ec]"
      style={{ backgroundColor: "#6D7A8A", color: "#FFF6EC" }}
    >
      {children}
    </span>
  );
}

export function HostFolderCard({
  folder,
  programCount,
  programs,
}: {
  folder: { id: string; title: string };
  programCount: number;
  programs: HostProgramListItem[];
}) {
  const previews = programs.slice(0, 3);

  return (
    <article className="block h-[var(--host-351)] w-[var(--host-288)] min-w-[288px] rounded-[8px] border border-[#D9D9D9] bg-white p-[var(--host-12)] transition max-md:h-auto max-md:w-full">
      <div className="grid h-[var(--host-270)] w-full grid-cols-2 grid-rows-[repeat(2,minmax(0,1fr))] gap-[var(--host-6)]">
        {[0, 1, 2].map((index) => {
          const preview = previews[index];

          if (!preview) {
            return (
              <div
                className="relative overflow-hidden rounded-[16px] bg-[#D9D9D9]"
                key={index}
              />
            );
          }

          return (
            <Link
              aria-label={`${preview.title} 프로그램으로 이동`}
              className="relative overflow-hidden rounded-[16px] bg-[#D9D9D9] transition hover:ring-2 hover:ring-[#FE701E] hover:ring-offset-1"
              href={hostProgramHref(preview)}
              key={preview.id}
            >
              {preview.imageUrl ? (
                <Image
                  alt=""
                  className="object-cover transition duration-200 hover:scale-[1.03]"
                  fill
                  sizes="(min-width: 1920px) 176px, 132px"
                  src={preview.imageUrl}
                />
              ) : null}
            </Link>
          );
        })}
        <Link
          aria-label={`${folder.title} 폴더 전체보기`}
          className="group/view flex flex-col items-center justify-center gap-[var(--host-8)] rounded-[16px] bg-white transition hover:text-[#FE701E]"
          href={hostProjectPath(folder.id)}
        >
          <span className="grid size-[var(--host-20)] place-items-center rounded-full bg-[#FF9A3D] text-white">
            <Plus className="size-[var(--host-14)]" strokeWidth={2.4} />
          </span>
          <span className="text-[length:var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A] transition group-hover/view:text-[#FE701E]">
            전체보기
          </span>
        </Link>
      </div>
      <div className="mt-[var(--host-10)] flex w-full flex-col gap-[var(--host-8)]">
        <p className="text-[length:var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
          저장된 프로그램 ({String(programCount).padStart(2, "0")})
        </p>
        <p className="line-clamp-2 text-[length:var(--host-16)] font-normal leading-[1.253] text-[#5B3A29]">
          {folder.title}
        </p>
      </div>
    </article>
  );
}

export function HostFolderPlaceholderCard({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      className="group block h-[var(--host-351)] w-[var(--host-288)] min-w-[288px] rounded-[8px] border border-[#D9D9D9] bg-white p-[var(--host-12)] text-left transition hover:border-[#FE701E] max-md:h-auto max-md:w-full"
      onClick={onClick}
      type="button"
    >
      <div className="grid h-[var(--host-270)] w-full grid-cols-2 grid-rows-[repeat(2,minmax(0,1fr))] gap-[var(--host-6)]">
        {[0, 1, 2].map((index) => (
          <div
            className="relative overflow-hidden rounded-[16px] bg-[#D9D9D9]"
            key={index}
          />
        ))}
        <div className="flex flex-col items-center justify-center gap-[var(--host-8)] rounded-[16px] bg-white">
          <span className="grid size-[var(--host-20)] place-items-center rounded-full bg-[#FF9A3D] text-white">
            <Plus className="size-[var(--host-14)]" strokeWidth={2.4} />
          </span>
          <span className="text-[length:var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]">
            전체보기
          </span>
        </div>
      </div>
      <div className="mt-[var(--host-10)] flex w-full flex-col gap-[var(--host-8)]">
        <p className="text-[length:var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
          저장된 프로그램 (00)
        </p>
        <p className="text-[length:var(--host-16)] font-normal leading-[1.253] text-[#5B3A29]">
          폴더명
        </p>
      </div>
    </button>
  );
}

export function HostProgramRow({
  actionLabel,
  expanded = false,
  statusFilter,
  items,
  title,
}: {
  actionLabel: string;
  expanded?: boolean;
  statusFilter: string;
  items: HostProgramListItem[];
  title: string;
}) {
  const visibleItems = expanded ? items : items.slice(0, 4);

  return (
    <section
      className={
        expanded
          ? "min-h-[var(--host-219)] pb-[var(--host-16)]"
          : "h-[var(--host-219)] min-h-[219px]"
      }
    >
      <div className="flex h-[var(--host-18)] items-center gap-[var(--host-16)]">
        <h3 className="shrink-0 text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
          {title} ({String(items.length).padStart(2, "0")})
        </h3>
        <span className="h-px flex-1 bg-[#B6C0CA]" />
      </div>
      <div
        className={`mt-[var(--host-37)] flex items-center gap-[var(--host-23)] max-md:mt-6 max-md:flex-wrap ${
          expanded ? "flex-wrap" : ""
        }`}
      >
        {visibleItems.map((program) => (
          <HostMiniProgramCard
            actionLabel={actionLabel}
            key={`${program.projectId ?? "standalone"}-${program.id}`}
            program={program}
          />
        ))}
        {!expanded && visibleItems.length < 4
          ? Array.from({ length: 4 - visibleItems.length }).map((_, index) => (
              <HostMiniProgramCardPlaceholder key={index} />
            ))
          : null}
        {!expanded ? (
          <Link
            className="flex h-[var(--host-42)] w-[var(--host-42)] shrink-0 flex-col items-center justify-center gap-[var(--host-8)] text-center text-[length:var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]"
            href={`/host?status=${encodeURIComponent(statusFilter)}`}
          >
            <span className="grid size-[var(--host-20)] place-items-center rounded-full bg-[#FF9A3D] text-white">
              <Plus className="size-[var(--host-14)]" strokeWidth={2.4} />
            </span>
            <span>전체보기</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export type HostProgramStatusFrameKind = "open" | "upcoming" | "closed";

const hostProgramStatusFrameCopy: Record<
  HostProgramStatusFrameKind,
  {
    tabs: [string, string];
    title: string;
  }
> = {
  closed: {
    tabs: ["마감일순", "종료일순"],
    title: "마감된 프로그램",
  },
  open: {
    tabs: ["출발일순", "오픈일순"],
    title: "오픈된 프로그램",
  },
  upcoming: {
    tabs: ["예정일순", "등록일순"],
    title: "예정된 프로그램",
  },
};

export function HostProgramStatusFrame({
  action,
  actionLabel,
  items,
  status,
}: {
  action?: ReactNode;
  actionLabel: string;
  items: HostProgramListItem[];
  status: HostProgramStatusFrameKind;
}) {
  const copy = hostProgramStatusFrameCopy[status];
  const displayItems = items.length > 0 ? items : [];

  return (
    <section className="w-[var(--host-1118)] max-w-full">
      <div className="flex h-[var(--host-29)] items-center">
        <Link
          aria-label="내 프로그램으로 돌아가기"
          className="mr-[var(--host-14)] inline-flex h-[var(--host-20)] w-[var(--host-10)] items-center justify-center transition hover:opacity-70"
          href="/host"
        >
          <Image
            alt=""
            className="h-[var(--host-16)] w-auto"
            height={16}
            src={nuvioIcons.formEditorBack}
            width={10}
          />
        </Link>
        <h1 className="text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
          {copy.title} ({String(items.length).padStart(2, "0")})
        </h1>
        {action ? <div className="ml-[var(--host-14)]">{action}</div> : null}
      </div>

      <div className="mt-[var(--host-12)] flex h-[var(--host-27)] items-start gap-[var(--host-12)] pl-[var(--host-13)]">
        {copy.tabs.map((tab, index) => (
          <button
            className={`h-[var(--host-27)] px-0 text-[length:var(--host-12)] leading-[1.253] ${
              index === 0
                ? "border-b-2 border-[#FE701E] font-medium text-[#6D7A8A]"
                : "font-normal text-[#CAC4BC]"
            }`}
            key={tab}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-[var(--host-12)] flex flex-wrap gap-x-[clamp(26px,1.806vw,34.667px)] gap-y-[var(--host-16)]">
        {displayItems.length > 0
          ? displayItems.map((program) => (
              <HostMiniProgramCard
                actionLabel={actionLabel}
                key={`${program.projectId ?? "standalone"}-${program.id}`}
                program={program}
              />
            ))
          : Array.from({ length: 4 }).map((_, index) => (
              <HostMiniProgramCardPlaceholder key={index} />
            ))}
      </div>
    </section>
  );
}

export function HostMiniProgramCard({
  actionLabel,
  program,
}: {
  actionLabel: string;
  program: HostProgramListItem;
}) {
  const href = hostProgramHref(program);

  return (
    <article className="h-[var(--host-142)] w-[var(--host-235)] shrink-0 rounded-[8px] border border-[#D9D9D9] bg-white p-[var(--host-12)]">
      <Link
        className="grid h-full grid-cols-[var(--host-69)_minmax(0,1fr)] gap-[var(--host-10)]"
        href={href}
      >
        <div className="relative h-[var(--host-82)] w-[var(--host-69)] overflow-hidden rounded-[6px] bg-[#D9D9D9]">
          {program.imageUrl ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(min-width: 1920px) 92px, 69px"
              src={program.imageUrl}
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-[var(--host-4)] text-[#0D0D0C]">
          <p className="truncate text-[length:var(--host-12)] font-normal leading-[1.253]">
            프로그램 넘버{" "}
            <span className="text-[#FE701E]">{formatProgramDisplayCode(program.id)}</span>
          </p>
          <p className="line-clamp-1 text-[length:var(--host-14)] font-medium leading-[1.253]">
            {program.title}
          </p>
          <p className="truncate text-[length:var(--host-12)] font-normal leading-[1.253]">
            {program.periodLabel || "프로그램 기간"}
          </p>
          <p className="truncate text-[length:var(--host-12)] font-normal leading-[1.253]">
            {getHostMiniCardStatusText(program.status)}
          </p>
        </div>
        <div className="col-span-2 mt-auto flex items-center gap-[var(--host-6)] text-[length:var(--host-12)] font-normal leading-[1.253]">
          <span className="min-w-0 flex-1 truncate text-[#0D0D0C]">
            신청 {program.applicationCount}/00&nbsp;&nbsp; 조회 00&nbsp;&nbsp; 저장 00
          </span>
          <span className="inline-flex h-[var(--host-29)] shrink-0 items-center justify-center rounded-[4px] border-[0.8px] border-[#FE701E] bg-[#FCFCFC] px-[var(--host-18)] text-[length:var(--host-12)] font-normal leading-[1.253] text-[#FE701E]">
            {actionLabel}
          </span>
        </div>
      </Link>
    </article>
  );
}

function getHostMiniCardStatusText(status?: string) {
  if (status === "upcoming") return "예정 :";
  if (status === "closed" || status === "earlyClosed") return "마감 :";
  return "오픈 :";
}

function hostProgramHref(program: HostProgramListItem): string {
  return program.projectId
    ? `/host/projects/${encodeURIComponent(program.projectId)}/programs/${encodeURIComponent(program.id)}`
    : `/host/programs/${encodeURIComponent(program.id)}`;
}

function HostMiniProgramCardPlaceholder() {
  return (
    <div className="h-[var(--host-142)] w-[var(--host-235)] shrink-0 rounded-[8px] border border-[#D9D9D9] bg-white p-[var(--host-12)]">
      <div className="grid h-full grid-cols-[var(--host-69)_minmax(0,1fr)] gap-[var(--host-10)]">
        <div className="h-[var(--host-82)] w-[var(--host-69)] rounded-[6px] bg-[#D9D9D9]" />
        <div>
          <div className="h-3 w-24 rounded bg-[#EEEAE7]" />
          <div className="mt-2 h-3 w-20 rounded bg-[#EEEAE7]" />
          <div className="mt-2 h-3 w-16 rounded bg-[#EEEAE7]" />
        </div>
        <div className="col-span-2 mt-auto flex justify-end">
          <span className="h-[var(--host-29)] w-[var(--host-58)] rounded-[4px] border-[0.8px] border-[#FF9A3D]" />
        </div>
      </div>
    </div>
  );
}

export function HostFolderInsideHeader({
  count,
  deleteActive = false,
  isBusy = false,
  onAdd,
  onDelete,
  onRemoveFolder,
  onRename,
  title,
}: {
  count: number;
  deleteActive?: boolean;
  isBusy?: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onRemoveFolder?: () => void;
  onRename?: (title: string) => Promise<void> | void;
  title: string;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isCommittingTitle, setIsCommittingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const displayTitle = `${title} (${count})`;

  useEffect(() => {
    if (!isEditingTitle) return;

    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isEditingTitle]);

  function beginTitleEdit() {
    if (!onRename || isBusy) return;

    setDraftTitle(title);
    setIsEditingTitle(true);
  }

  function cancelTitleEdit() {
    if (isCommittingTitle) return;

    setDraftTitle(title);
    setIsEditingTitle(false);
  }

  async function commitTitleEdit() {
    if (!onRename || isCommittingTitle) return;

    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === title) {
      cancelTitleEdit();
      return;
    }

    setIsCommittingTitle(true);
    try {
      await onRename(nextTitle);
      setIsEditingTitle(false);
    } catch {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    } finally {
      setIsCommittingTitle(false);
    }
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;

    if (event.key === "Enter") {
      event.preventDefault();
      void commitTitleEdit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelTitleEdit();
    }
  }

  return (
    <div className="flex h-[var(--host-20)] w-full items-center gap-[0.972vw]">
      <Link
        aria-label="내 프로그램으로 돌아가기"
        className="inline-flex h-[var(--host-20)] w-[0.833vw] min-w-3 items-center justify-center text-[#6D7A8A] transition hover:text-[#FE701E]"
        href="/host"
      >
        <ChevronLeft className="size-[var(--host-18)]" strokeWidth={1.8} />
      </Link>
      <div className="min-w-0 max-w-[min(66vw,720px)] shrink">
        {isEditingTitle ? (
          <input
            aria-label="폴더 이름"
            className="h-[var(--host-24)] w-[min(66vw,720px)] max-w-full rounded-[4px] border border-[#F7B267] bg-white px-[var(--host-6)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#4C5968] outline-none focus:border-[#FE701E] disabled:opacity-60"
            disabled={isBusy || isCommittingTitle}
            onBlur={cancelTitleEdit}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={handleTitleKeyDown}
            ref={titleInputRef}
            title="Enter로 저장, Esc로 취소"
            value={draftTitle}
          />
        ) : onRename ? (
          <button
            aria-label="폴더 이름 변경"
            className="group/title -ml-[var(--host-3)] min-w-0 rounded-[4px] border border-transparent px-[var(--host-3)] py-[var(--host-2)] text-left transition hover:border-[#F7B267] hover:bg-[#FFF6EC] focus-visible:border-[#FE701E] focus-visible:bg-[#FFF6EC] focus-visible:outline-none disabled:cursor-default disabled:hover:border-transparent disabled:hover:bg-transparent"
            disabled={isBusy}
            onDoubleClick={beginTitleEdit}
            title="더블클릭해서 폴더 이름 변경"
            type="button"
          >
            <span className="block truncate text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A] underline-offset-4 group-hover/title:decoration-[#F7B267]">
              {displayTitle}
            </span>
          </button>
        ) : (
          <h1 className="truncate text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
            {displayTitle}
          </h1>
        )}
      </div>
      <div className="flex flex-1 items-center justify-end" />
      <button
        aria-label={deleteActive ? "삭제 선택 취소" : "폴더에서 프로그램 제거"}
        className="inline-flex size-[var(--host-18)] min-h-[18px] min-w-[18px] items-center justify-center rounded-full transition hover:opacity-80 disabled:opacity-45"
        disabled={isBusy}
        onClick={onDelete}
        type="button"
      >
        <Image
          alt=""
          className="size-full"
          height={18}
          src={nuvioIcons.quantityMinus}
          width={18}
        />
      </button>
      <button
        aria-label="폴더에 프로그램 추가"
        className="inline-flex size-[var(--host-18)] min-h-[18px] min-w-[18px] items-center justify-center rounded-full transition hover:opacity-80 disabled:opacity-45"
        disabled={isBusy}
        onClick={onAdd}
        type="button"
      >
        <Image
          alt=""
          className="size-full"
          height={18}
          src={nuvioIcons.quantityPlus}
          width={18}
        />
      </button>
      {onRemoveFolder ? (
        <button
          aria-label="폴더 삭제"
          className="inline-flex size-[var(--host-18)] min-h-[18px] min-w-[18px] items-center justify-center rounded-[4px] transition hover:opacity-70 disabled:opacity-40"
          disabled={isBusy}
          onClick={onRemoveFolder}
          title="폴더 삭제"
          type="button"
        >
          <Image
            alt=""
            className="h-full w-auto"
            height={18}
            src={nuvioIcons.formItemTrash}
            width={16}
          />
        </button>
      ) : null}
    </div>
  );
}
