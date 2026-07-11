"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bookmark,
  CalendarDays,
  ChevronRight,
  Gift,
  LogOut,
  MessageCircle,
  Minus,
  Plus,
  Search,
  Settings,
  Ticket,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ComponentType,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type Ref,
  type ReactNode,
} from "react";
import { ReviewIcon } from "@/components/icons/review-icon";
import { getProgramById } from "@/lib/data";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { SupportContactForm } from "@/components/support-contact-form";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import type { HostApplication } from "@/lib/host-operations";
import type {
  HostInquiry,
  ProgramInquiryMessage,
} from "@/lib/host-inquiries";
import {
  createDefaultProgramAutoReplyConfig,
  normalizeProgramAutoReplyConfig,
  type ProgramAutoReplyConfig,
  type ProgramAutoReplyItem,
} from "@/lib/program-auto-replies";
import {
  formatApplicationDisplayCode,
  formatProgramDisplayName,
} from "@/lib/display-code";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { programPath } from "@/lib/program-routing";
import {
  disableBrowserPushNotifications,
  enableBrowserPushNotifications,
  getBrowserNotificationPermission,
  isBrowserPushSupported,
} from "@/lib/browser-push-client";
import type { Program, Review } from "@/lib/types";

type AuthProfile = {
  id: string;
  email: string;
  fullName: string | null;
  displayName: string | null;
  loginId: string | null;
  role: "user" | "partner" | "admin";
  onboardingIntent: "participant" | "host" | null;
  showHostCenterNav: boolean | null;
  avatarUrl: string | null;
  phone: string | null;
  contactEmail: string | null;
  address: string | null;
  addressDetail: string | null;
  gender: string | null;
  birthDate: string | null;
  paymentMethod: string | null;
  refundBank: string | null;
  refundAccount: string | null;
};

type AuthSessionPayload = {
  user: {
    id: string;
    email?: string;
    appMetadata?: Record<string, unknown>;
    userMetadata?: Record<string, unknown>;
  } | null;
  profile: AuthProfile | null;
};

type AuthSessionResponse = {
  data?: AuthSessionPayload;
  error?: string;
};

type StateMap = Record<string, boolean>;
type BookmarkStateDetail = {
  bookmarkedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ProgramStateMaps = {
  alerts: StateMap;
  bookmarkDetails?: Record<string, BookmarkStateDetail>;
  bookmarks: StateMap;
  tracks: StateMap;
};

type UserNotification = {
  body: string;
  createdAt: string;
  href: string;
  id: string;
  readAt: string | null;
  title: string;
  type: string;
};

type KakaoPostcodeData = {
  address: string;
  apartment: "Y" | "N";
  bname: string;
  buildingName: string;
  jibunAddress: string;
  roadAddress: string;
  userSelectedType: "R" | "J";
  zonecode: string;
};

type KakaoPostcodeOptions = {
  height?: string;
  maxSuggestItems?: number;
  oncomplete: (data: KakaoPostcodeData) => void;
  width?: string;
};

type KakaoPostcodeInstance = {
  embed: (element: HTMLElement) => void;
  open: () => void;
};

type MemberInformationFormState = {
  address: string;
  avatarUrl: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  detailAddress: string;
  emailDomain: string;
  emailDomainPreset: string;
  emailId: string;
  gender: string;
  loginId: string;
  name: string;
  nickname: string;
  paymentMethod: string;
  phone: string;
  refundAccount: string;
  refundBank: string;
};

type NicknameCheckState = {
  checkedValue: string;
  status: "idle" | "checking" | "available" | "duplicate" | "error";
};

function createMemberInformationSnapshot(form: MemberInformationFormState) {
  return JSON.stringify({
    address: form.address,
    avatarUrl: form.avatarUrl,
    birthDay: form.birthDay,
    birthMonth: form.birthMonth,
    birthYear: form.birthYear,
    detailAddress: form.detailAddress,
    emailDomain: form.emailDomain,
    emailDomainPreset: form.emailDomainPreset,
    emailId: form.emailId,
    gender: form.gender,
    loginId: form.loginId,
    name: form.name,
    nickname: form.nickname,
    paymentMethod: form.paymentMethod,
    phone: form.phone,
    refundAccount: form.refundAccount,
    refundBank: form.refundBank,
  });
}

declare global {
  interface Window {
    kakao?: {
      Postcode: new (options: KakaoPostcodeOptions) => KakaoPostcodeInstance;
    };
    daum?: {
      Postcode: new (options: KakaoPostcodeOptions) => KakaoPostcodeInstance;
    };
  }
}

type MypageData = {
  authSession: AuthSessionPayload;
  applications: HostApplication[];
  inquiries: HostInquiry[];
  loading: boolean;
  notifications: UserNotification[];
  programState: ProgramStateMaps;
  publicPrograms: Program[];
  reviews: Review[];
  signedIn: boolean;
  updateProfile: (profile: AuthProfile) => void;
};

type MypageContext = MypageData & {
  bookmarkedProgramItems: BookmarkedProgramItem[];
  bookmarkedPrograms: Program[];
  nickname: string;
  profileName: string;
  recentlyViewedPrograms: Program[];
  reviewCount: number;
  unreadMessageCount: number;
  visibleTrips: HostApplication[];
};

type BookmarkedProgramItem = {
  bookmarkedAt: string | null;
  program: Program;
};

type MypageSection =
  | "home"
  | "trips"
  | "reviews"
  | "bookmarks"
  | "messages"
  | "member"
  | "points"
  | "coupons"
  | "settings"
  | "support";

const CUSTOM_EMAIL_DOMAIN = "custom";
const KAKAO_POSTCODE_SCRIPT_SRC =
  "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const DAUM_POSTCODE_SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const EMAIL_DOMAIN_OPTIONS = [
  "naver.com",
  "gmail.com",
  "daum.net",
  "hanmail.net",
  "kakao.com",
  "nate.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "yahoo.com",
] as const;
const DEFAULT_ADULT_BIRTH_YEAR = new Date().getFullYear() - 19;
const BIRTH_YEAR_OPTIONS = Array.from(
  { length: DEFAULT_ADULT_BIRTH_YEAR - 1900 + 1 },
  (_, index) => String(DEFAULT_ADULT_BIRTH_YEAR - index),
);
const BIRTH_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);
const ADDRESS_FALLBACK_OPTIONS = [
  "서울특별시 중구 세종대로 110",
  "서울특별시 종로구 세종대로 175",
  "서울특별시 강남구 테헤란로 152",
  "서울특별시 마포구 월드컵북로 396",
  "경기도 성남시 분당구 판교역로 166",
  "경기도 수원시 팔달구 효원로 241",
  "인천광역시 남동구 정각로 29",
  "부산광역시 해운대구 센텀중앙로 97",
  "대구광역시 중구 국채보상로 648",
  "광주광역시 서구 내방로 111",
  "대전광역시 서구 둔산로 100",
  "제주특별자치도 제주시 문연로 6",
];

let kakaoPostcodeScriptPromise: Promise<void> | null = null;

const EMPTY_PROGRAM_STATE: ProgramStateMaps = {
  alerts: {},
  bookmarkDetails: {},
  bookmarks: {},
  tracks: {},
};

const mypageScaleStyle = {
  "--mypage-scale": "clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333)",
  "--mypage-shell": "clamp(1060px, 73.6111vw, 1413.333px)",
  "--mypage-sidebar": "clamp(80px, 5.556vw, 106.667px)",
  "--mypage-gap": "clamp(92px, 6.3889vw, 122.667px)",
  "--mypage-mini-card": "clamp(130px, 9.0278vw, 173.333px)",
  "--mypage-mini-gap": "clamp(40px, 2.7778vw, 53.333px)",
  "--mypage-bookmark-card": "clamp(186px, 12.9167vw, 248px)",
  "--mypage-bookmark-gap": "clamp(32px, 2.2222vw, 42.667px)",
  "--mypage-orange": "#FE701E",
  "--mypage-brown": "#5B3A29",
  "--mypage-muted": "#C7BDB5",
  "--mypage-line": "#F3E2D5",
  "--mypage-olive": "#7F9154",
} as CSSProperties;

const nuvioIconSources = {
  bookmark: "/icons/nuvio/bookmark.svg",
  bookmarkFilled: "/icons/nuvio/bookmark-filled.svg",
  calendar: "/icons/nuvio/calendar.svg",
  mail: "/icons/nuvio/mail.svg",
  message: "/icons/nuvio/message.svg",
  messageOrange: "/icons/nuvio/message-orange.svg",
  mypageBack: "/icons/nuvio/mypage-back.svg",
  phone: "/icons/nuvio/phone.svg",
  settings: "/icons/nuvio/settings.svg",
  summaryCalendar: "/icons/nuvio/summary-calendar.svg",
  summaryMessage: "/icons/nuvio/summary-message.svg",
  user: "/icons/nuvio/user.svg",
} as const;

const tripStatusLabels: Record<HostApplication["status"], string> = {
  accepted: "여행예정",
  checkedIn: "여행중",
  completed: "여행완료",
  rejected: "취소됨",
  screening: "검토중",
  submitted: "신청완료",
};

function ReviewMenuIcon({
  className,
  size,
}: {
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  return <ReviewIcon className={className} size={size} />;
}

const sideMenuItems: Array<{
  href: string;
  icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  label: string;
  section: MypageSection;
}> = [
  {
    href: "/mypage/trips",
    label: "내 여행",
    icon: CalendarDays,
    section: "trips",
  },
  { href: "/mypage/reviews", label: "후기", icon: ReviewMenuIcon, section: "reviews" },
  {
    href: "/mypage/bookmarks",
    label: "북마크",
    icon: Bookmark,
    section: "bookmarks",
  },
  {
    href: "/mypage/messages",
    label: "메시지함",
    icon: MessageCircle,
    section: "messages",
  },
  {
    href: "/mypage/member-information",
    label: "회원 정보",
    icon: UserRound,
    section: "member",
  },
  { href: "/mypage/points", label: "포인트", icon: WalletCards, section: "points" },
  { href: "/mypage/coupons", label: "쿠폰함", icon: Ticket, section: "coupons" },
  { href: "/mypage/settings", label: "설정", icon: Settings, section: "settings" },
];

const visibleSideMenuItems = sideMenuItems.filter((item) => {
  if (item.section === "reviews") return launchFeatureFlags.reviews;
  if (item.section === "coupons") return launchFeatureFlags.coupons;
  return true;
});

export function Mypage() {
  return (
    <MypageFrame activeSection="home" showOverview>
      {(context) => <MypageHomeContent context={context} />}
    </MypageFrame>
  );
}

export function MypageTrips() {
  return (
    <MypageFrame activeSection="trips">
      {(context) => <TripsContent context={context} />}
    </MypageFrame>
  );
}

export function MypageReviews() {
  return (
    <MypageFrame activeSection="reviews">
      {(context) => <ReviewsContentV2 context={context} />}
    </MypageFrame>
  );
}

export function MypageBookmarks() {
  return (
    <MypageFrame activeSection="bookmarks">
      {(context) => <BookmarksContent context={context} />}
    </MypageFrame>
  );
}

export function MypageMessages() {
  const data = useMypageData();
  const context = useMypageContext(data);

  return <MessagesContent context={context} />;
}

export function MypageMemberInformation({
  initialAddressSearchOpen = false,
  initialEditMode = false,
  initialSelectedAddress = "",
}: {
  initialAddressSearchOpen?: boolean;
  initialEditMode?: boolean;
  initialSelectedAddress?: string;
}) {
  return (
    <MypageFrame activeSection="member">
      {(context) => (
        <MemberInformationContent
          context={context}
          initialAddressSearchOpen={initialAddressSearchOpen}
          initialEditMode={initialEditMode}
          initialSelectedAddress={initialSelectedAddress}
        />
      )}
    </MypageFrame>
  );
}

export function MypagePoints() {
  return (
    <MypageFrame activeSection="points">
      {() => <PointsContent />}
    </MypageFrame>
  );
}

export function MypageCoupons() {
  return (
    <MypageFrame activeSection="coupons">
      {() => <CouponsContent />}
    </MypageFrame>
  );
}

export function MypageSettings() {
  return (
    <MypageFrame activeSection="settings">
      {(context) => <SettingsContent context={context} />}
    </MypageFrame>
  );
}

export function MypageSupport() {
  return (
    <MypageFrame activeSection="support">
      {(context) => <SupportContent context={context} />}
    </MypageFrame>
  );
}

function MypageFrame({
  activeSection,
  children,
  showOverview = false,
}: {
  activeSection: MypageSection;
  children: (context: MypageContext) => ReactNode;
  showOverview?: boolean;
}) {
  const data = useMypageData();
  const context = useMypageContext(data);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }
  const topPaddingClass = showOverview
    ? "pt-[clamp(82px,5.6944vw,109.333px)]"
    : "pt-[clamp(32px,2.2222vw,42.667px)]";

  return (
    <div
      className="font-pretendard min-h-screen overflow-x-clip bg-white text-[var(--mypage-brown)]"
      style={mypageScaleStyle}
    >
      <main
        className={`mx-auto w-full px-5 pb-[clamp(72px,5vw,96px)] lg:w-[var(--mypage-shell)] lg:px-0 ${topPaddingClass}`}
      >
        {showOverview ? <MypageOverview context={context} /> : null}

        <div
          className={
            showOverview
              ? "mt-[clamp(20px,1.3889vw,26.667px)] grid gap-10 lg:grid-cols-[var(--mypage-sidebar)_minmax(0,1fr)] lg:gap-[var(--mypage-gap)]"
              : "grid gap-10 lg:grid-cols-[var(--mypage-sidebar)_minmax(0,1fr)] lg:gap-[var(--mypage-gap)]"
          }
        >
          <MypageSideMenu
            activeSection={activeSection}
            onLogout={logout}
            signedIn={context.signedIn}
          />
          <div className="min-w-0">{children(context)}</div>
        </div>
      </main>
    </div>
  );
}

function MypageOverview({ context }: { context: MypageContext }) {
  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {context.loading ? (
          <MypageSkeletonBlock className="h-[clamp(30px,2.0833vw,40px)] w-[clamp(220px,15.2778vw,293.333px)]" />
        ) : (
          <h1 className="text-[clamp(24px,1.6667vw,32px)] font-semibold leading-tight tracking-normal text-[var(--mypage-brown)]">
            {context.profileName} 누비어님, 안녕하세요.
          </h1>
        )}
        {context.loading ? (
          <MypageSkeletonBlock className="h-[clamp(30px,2.0833vw,40px)] w-[clamp(112px,7.7778vw,149.333px)]" />
        ) : (
          <Link
            className="inline-flex h-[clamp(30px,2.0833vw,40px)] min-h-11 w-fit items-center justify-center rounded-[clamp(4px,0.2778vw,5.333px)] border border-[#d9d9d9] px-[clamp(16px,1.1111vw,21.333px)] text-[clamp(12px,0.8333vw,16px)] font-medium text-[#6B5145] transition hover:border-[#ffa143] hover:text-[var(--mypage-orange)] lg:min-h-0"
            href={context.signedIn ? "/mypage/member-information" : "/login"}
          >
            회원 정보 수정하기
          </Link>
        )}
      </header>

      <section className="mt-[clamp(52px,3.6111vw,69.333px)] grid gap-[clamp(12px,0.8333vw,16px)] lg:grid-cols-[minmax(0,1fr)_clamp(220px,15.2778vw,293.333px)]">
        <ProfileSummaryCard
          avatarUrl={context.authSession.profile?.avatarUrl}
          bookmarkCount={context.bookmarkedPrograms.length}
          loading={context.loading}
          messageCount={context.unreadMessageCount}
          nickname={context.nickname}
          tripCount={context.visibleTrips.length}
        />
        <WalletSummaryCard loading={context.loading} pointCount={0} />
      </section>
    </>
  );
}

function MypageHomeContent({ context }: { context: MypageContext }) {
  const showTripLoading = context.loading;
  const showRecentLoading = context.loading;
  const tripSlots = context.visibleTrips.slice(0, 4).map((application) => ({
    application,
    program: findProgramForApplication(application, context.publicPrograms),
  }));

  return (
    <>
      <DashboardSection heading="내 여행 프로그램" href="/mypage/trips">
        {showTripLoading ? (
          <div className="grid gap-[var(--mypage-mini-gap)] sm:grid-cols-2 lg:grid-cols-[repeat(4,var(--mypage-mini-card))]">
            {Array.from({ length: 4 }, (_, index) => (
              <MiniCardPlaceholder animated key={`loading-trip-${index}`} />
            ))}
          </div>
        ) : tripSlots.length > 0 ? (
          <div className="grid gap-[var(--mypage-mini-gap)] sm:grid-cols-2 lg:grid-cols-[repeat(4,var(--mypage-mini-card))]">
            {tripSlots.map((slot) => (
              <TripMiniCard
                application={slot.application}
                key={slot.application.id}
                loading={false}
                program={slot.program}
              />
            ))}
          </div>
        ) : (
          <DashboardEmptyPanel
            actionHref="/"
            actionLabel="프로그램 찾아보기"
            message="아직 여행 프로그램이 없어요"
          />
        )}
      </DashboardSection>

      <DashboardSection
        className="mt-[clamp(56px,3.8889vw,74.667px)]"
        heading="최근 본 프로그램"
        href="/"
      >
        {showRecentLoading ? (
          <div className="grid gap-[var(--mypage-mini-gap)] sm:grid-cols-2 lg:grid-cols-[repeat(4,var(--mypage-mini-card))]">
            {Array.from({ length: 4 }, (_, index) => (
              <MiniCardPlaceholder animated key={`recent-loading-${index}`} />
            ))}
          </div>
        ) : context.recentlyViewedPrograms.length > 0 ? (
          <div className="grid gap-[var(--mypage-mini-gap)] sm:grid-cols-2 lg:grid-cols-[repeat(4,var(--mypage-mini-card))]">
            {context.recentlyViewedPrograms.slice(0, 4).map((program) => (
              <ProgramMiniCard key={program.id} program={program} />
            ))}
          </div>
        ) : (
          <RecentEmptyState />
        )}
      </DashboardSection>
    </>
  );
}

function TripsContent({ context }: { context: MypageContext }) {
  const [tab, setTab] = useState<"planned" | "completed" | "cancelled">("planned");
  const [readyNoticeOpen, setReadyNoticeOpen] = useState(false);
  const filteredApplications = context.applications.filter((application) => {
    if (tab === "planned") {
      return ["submitted", "screening", "accepted", "checkedIn"].includes(
        application.status,
      );
    }
    if (tab === "completed") return application.status === "completed";
    return application.status === "rejected";
  });
  const tabItems = [
    { key: "planned" as const, label: "예정된 여행" },
    { key: "completed" as const, label: "여행완료" },
    { key: "cancelled" as const, label: "취소된 여행" },
  ];

  return (
    <section className="min-h-[clamp(420px,29.1667vw,560px)]">
      <TripFrameTabs
        active={tab}
        items={tabItems}
        onChange={setTab}
      />
      <div className="mt-[clamp(12px,0.8333vw,16px)]">
        {context.loading ? (
          <ListSkeleton count={3} />
        ) : filteredApplications.length > 0 ? (
          <div className="grid gap-0">
            {filteredApplications.map((application) => {
              const program = findProgramForApplication(
                application,
                context.publicPrograms,
              );

              return (
                <TripDetailCard
                  actionLabel={
                    tab === "completed"
                      ? application.reviewSubmitted
                        ? "후기 보기"
                        : "후기 작성"
                      : undefined
                  }
                  application={application}
                  isBookmarked={isProgramBookmarked(
                    program,
                    context.bookmarkedPrograms,
                  )}
                  key={application.id}
                  onActionClick={
                    tab === "completed" ? () => setReadyNoticeOpen(true) : undefined
                  }
                  program={program}
                />
              );
            })}
          </div>
        ) : (
          <TripEmptyPanel
            message={
              tab === "cancelled"
                ? "취소된 여행이 없어요"
                : tab === "completed"
                  ? "완료된 여행이 없어요"
                  : "예정된 여행이 없어요"
            }
          />
        )}
      </div>
      <ReadyNoticeToast
        open={readyNoticeOpen}
        onClose={() => setReadyNoticeOpen(false)}
      />
    </section>
  );
}

function ReviewsContentV2({ context }: { context: MypageContext }) {
  const [tab, setTab] = useState<"writable" | "written">("writable");
  const [sort, setSort] = useState<"reserved" | "completed">("reserved");
  const tabItems = [
    { key: "writable" as const, label: "작성 가능한 여행" },
    { key: "written" as const, label: "내가 쓴 후기" },
  ];
  const writableTrips = context.applications.filter(
    (application) =>
      ["checkedIn", "completed"].includes(application.status) &&
      !application.reviewSubmitted,
  );
  const writtenReviewItems = context.reviews.map((review) => {
    const application = findApplicationForReview(review, context.applications);
    const program = findProgramForReview(review, application, context.publicPrograms);
    return { application, program, review };
  });
  const sortedWritableTrips = [...writableTrips].sort((a, b) => {
    const aProgram = findProgramForApplication(a, context.publicPrograms);
    const bProgram = findProgramForApplication(b, context.publicPrograms);

    if (sort === "completed") {
      return (
        parseDateSortValue(bProgram?.activityEnd) -
        parseDateSortValue(aProgram?.activityEnd)
      );
    }

    return parseDateSortValue(b.submittedAt) - parseDateSortValue(a.submittedAt);
  });
  const sortedWrittenReviews = [...writtenReviewItems].sort((a, b) => {
    if (sort === "completed") {
      return (
        parseDateSortValue(b.program?.activityEnd ?? b.review.submittedAt ?? b.review.date) -
        parseDateSortValue(a.program?.activityEnd ?? a.review.submittedAt ?? a.review.date)
      );
    }

    return (
      parseDateSortValue(b.application?.submittedAt ?? b.review.submittedAt ?? b.review.date) -
      parseDateSortValue(a.application?.submittedAt ?? a.review.submittedAt ?? a.review.date)
    );
  });

  return (
    <section className="min-h-[clamp(420px,29.1667vw,560px)]">
      <TripFrameTabs
        active={tab}
        items={tabItems}
        onChange={(nextTab) => {
          setTab(nextTab);
          setSort("reserved");
        }}
      />
      <div className="flex min-h-11 items-center gap-[clamp(10px,0.6944vw,13.333px)] border-b border-[#f7eee7] pl-[clamp(7px,0.4861vw,9.333px)] lg:h-[clamp(31px,2.1528vw,41.333px)] lg:min-h-0">
        <BookmarkSortButton
          active={sort === "reserved"}
          label="예약일 순"
          onClick={() => setSort("reserved")}
        />
        <BookmarkSortButton
          active={sort === "completed"}
          label="완료일 순"
          onClick={() => setSort("completed")}
        />
      </div>
      <div className="mt-[clamp(27px,1.875vw,36px)]">
        {context.loading ? (
          <div className="grid gap-[clamp(27px,1.875vw,36px)]">
            {Array.from({ length: 2 }, (_, index) => (
              <ReviewListSkeleton key={`review-loading-${index}`} />
            ))}
          </div>
        ) : tab === "writable" ? (
          sortedWritableTrips.length > 0 ? (
            <div className="grid gap-[clamp(27px,1.875vw,36px)]">
              {sortedWritableTrips.map((application) => (
                <WritableReviewTripCard
                  application={application}
                  key={application.id}
                  program={findProgramForApplication(application, context.publicPrograms)}
                />
              ))}
            </div>
          ) : (
            <TripEmptyPanel message="아직 작성할 후기가 없어요" />
          )
        ) : sortedWrittenReviews.length > 0 ? (
          <div className="grid gap-[clamp(27px,1.875vw,36px)]">
            {sortedWrittenReviews.map(({ application, program, review }) => (
              <WrittenReviewCard
                application={application}
                key={String(review.id)}
                program={program}
                review={review}
              />
            ))}
          </div>
        ) : (
          <TripEmptyPanel message="아직 작성한 후기가 없어요" />
        )}
      </div>
    </section>
  );
}

function WritableReviewTripCard({
  application,
  program,
}: {
  application: HostApplication;
  program: Program | undefined;
}) {
  const displayTitle = program?.title || application.programTitle || "프로그램 제목 입력";
  const completionDate = program?.activityEnd || application.submittedAt;

  return (
    <article className="grid min-h-[clamp(103px,7.1528vw,137.333px)] grid-cols-[clamp(104px,7.2222vw,138.667px)_minmax(0,1fr)_auto] items-center gap-[clamp(24px,1.6667vw,32px)] border-b border-[#f7eee7] pb-[clamp(16px,1.1111vw,21.333px)]">
      <Link
        className="relative block h-[clamp(104px,7.2222vw,138.667px)] w-[clamp(104px,7.2222vw,138.667px)] overflow-hidden rounded-[clamp(8px,0.5556vw,10.667px)] bg-[#d9d9d9]"
        href={program ? programPath(program) : "/mypage/trips"}
      >
        {program?.image ? (
          <Image
            alt={displayTitle}
            className="object-cover"
            fill
            sizes="(min-width: 1920px) 139px, 7.3vw"
            src={program.image}
          />
        ) : null}
      </Link>
      <div className="min-w-0">
        <p className="text-[clamp(12px,0.8333vw,16px)] font-medium leading-[1.2] text-[#748190]">
          {formatReviewProgramLocation(program)}
        </p>
        <Link
          className="mt-[clamp(7px,0.4861vw,9.333px)] block line-clamp-2 text-[clamp(18px,1.25vw,24px)] font-semibold leading-[1.35] text-[var(--mypage-brown)]"
          href={program ? programPath(program) : "/mypage/trips"}
        >
          {displayTitle}
        </Link>
        <p className="mt-[clamp(8px,0.5556vw,10.667px)] text-[clamp(12px,0.8333vw,16px)] font-medium leading-[1.2] text-[#748190]">
          {program?.sourceName || "호스트명"}
        </p>
        <p className="mt-[clamp(12px,0.8333vw,16px)] text-[clamp(12px,0.8333vw,16px)] font-medium leading-[1.2] text-[var(--mypage-orange)]">
          여행완료 {formatShortDate(completionDate)}
        </p>
      </div>
      <Link
        className="inline-flex h-[clamp(38px,2.6389vw,50.667px)] min-h-11 min-w-[clamp(108px,7.5vw,144px)] items-center justify-center rounded-[clamp(4px,0.2778vw,5.333px)] border border-[var(--mypage-orange)] px-[clamp(18px,1.25vw,24px)] text-[clamp(13px,0.9028vw,17.333px)] font-semibold text-[var(--mypage-orange)] transition hover:bg-[#fff3eb] lg:min-h-0"
        href={`/reviews/new?applicationId=${application.id}`}
      >
        후기 작성
      </Link>
    </article>
  );
}

function WrittenReviewCard({
  application,
  program,
  review,
}: {
  application?: HostApplication;
  program?: Program;
  review: Review;
}) {
  const title = program?.title || review.programTitle || application?.programTitle || "프로그램 제목 입력";
  const hostName = program?.sourceName || "호스트명";
  const images = review.images.filter(Boolean).slice(0, 5);
  const body = review.body || review.excerpt;

  return (
    <article className="grid min-h-[clamp(236px,16.3889vw,314.667px)] grid-cols-[clamp(131px,9.0972vw,174.667px)_minmax(0,1fr)] gap-[clamp(34px,2.3611vw,45.333px)] border-b border-[#f7eee7] pb-[clamp(26px,1.8056vw,34.667px)]">
      <div className="min-w-0">
        <Link
          className="relative block h-[clamp(108px,7.5vw,144px)] w-[clamp(105px,7.2917vw,140px)] overflow-hidden rounded-[clamp(8px,0.5556vw,10.667px)] bg-[#d9d9d9]"
          href={program ? programPath(program) : "/mypage/trips"}
        >
          {program?.image ? (
            <Image
              alt={title}
              className="object-cover"
              fill
              sizes="(min-width: 1920px) 140px, 7.3vw"
              src={program.image}
            />
          ) : null}
        </Link>
        <p className="mt-[clamp(11px,0.7639vw,14.667px)] text-[clamp(12px,0.8333vw,16px)] font-medium leading-[1.2] text-[#748190]">
          {formatReviewProgramLocation(program)}
        </p>
        <Link
          className="mt-[clamp(4px,0.2778vw,5.333px)] block line-clamp-2 text-[clamp(16px,1.1111vw,21.333px)] font-semibold leading-[1.42] text-[var(--mypage-brown)]"
          href={program ? programPath(program) : "/mypage/trips"}
        >
          {title}
        </Link>
        <p className="mt-[clamp(7px,0.4861vw,9.333px)] text-[clamp(12px,0.8333vw,16px)] font-semibold leading-[1.2] text-[#748190]">
          {hostName}
        </p>
        <p className="mt-[clamp(14px,0.9722vw,18.667px)] text-[clamp(12px,0.8333vw,16px)] font-medium leading-[1.2] text-[var(--mypage-orange)]">
          여행완료 {formatShortDate(program?.activityEnd || review.submittedAt || review.date)}
        </p>
      </div>
      <div className="min-w-0">
        <div className="flex h-[clamp(19px,1.3194vw,25.333px)] items-center gap-[clamp(5px,0.3472vw,6.667px)]">
          <ReviewFireRating rating={review.rating ?? 0} />
          <span className="text-[clamp(12px,0.8333vw,16px)] font-semibold leading-none text-[var(--mypage-brown)]">
            {(review.rating ?? 0).toFixed(1)}
          </span>
          <span className="ml-auto text-[clamp(11px,0.7639vw,14.667px)] font-medium leading-none text-[#C7BDB5]">
            {formatReviewDisplayDate(review.submittedAt || review.publishedAt || review.date)}
          </span>
        </div>
        <p className="mt-[clamp(11px,0.7639vw,14.667px)] line-clamp-4 min-h-[clamp(65px,4.5139vw,86.667px)] text-[clamp(13px,0.9028vw,17.333px)] font-medium leading-[1.65] text-[#5F6C7B]">
          {body}
        </p>
        {images.length > 0 ? (
          <div className="mt-[clamp(22px,1.5278vw,29.333px)] flex gap-[clamp(6px,0.4167vw,8px)] overflow-hidden">
            {images.map((src, index) => (
              <div
                aria-label={`후기 사진 ${index + 1}`}
                className="h-[clamp(120px,8.3333vw,160px)] w-[clamp(120px,8.3333vw,160px)] shrink-0 rounded-[clamp(5px,0.3472vw,6.667px)] bg-cover bg-center bg-[#f0efec]"
                key={`${src}-${index}`}
                role="img"
                style={{ backgroundImage: `url("${src}")` }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-[clamp(22px,1.5278vw,29.333px)] grid h-[clamp(120px,8.3333vw,160px)] place-items-center rounded-[clamp(5px,0.3472vw,6.667px)] border border-dashed border-[#E6DDD6] text-[clamp(12px,0.8333vw,16px)] font-medium text-[#C7BDB5]">
            첨부된 사진이 없어요
          </div>
        )}
      </div>
    </article>
  );
}

function ReviewFireRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-[clamp(3px,0.2083vw,4px)]">
      {Array.from({ length: 5 }, (_, index) => {
        const active = rating >= index + 1;
        return (
          <ReviewIcon
            className={active ? "text-[var(--mypage-orange)]" : "text-[#D8D2CB]"}
            key={index}
            size="clamp(15px,1.0417vw,20px)"
          />
        );
      })}
    </div>
  );
}

function ReviewListSkeleton() {
  return (
    <article aria-busy="true" className="grid grid-cols-[clamp(104px,7.2222vw,138.667px)_minmax(0,1fr)] gap-[clamp(24px,1.6667vw,32px)] border-b border-[#f7eee7] pb-[clamp(18px,1.25vw,24px)]">
      <MypageSkeletonBlock className="h-[clamp(104px,7.2222vw,138.667px)] w-[clamp(104px,7.2222vw,138.667px)] rounded-[clamp(8px,0.5556vw,10.667px)]" />
      <div className="pt-[clamp(8px,0.5556vw,10.667px)]">
        <MypageSkeletonBlock className="h-[clamp(12px,0.8333vw,16px)] w-[24%]" />
        <MypageSkeletonBlock className="mt-[clamp(10px,0.6944vw,13.333px)] h-[clamp(22px,1.5278vw,29.333px)] w-[48%]" />
        <MypageSkeletonBlock className="mt-[clamp(10px,0.6944vw,13.333px)] h-[clamp(14px,0.9722vw,18.667px)] w-[32%]" />
      </div>
    </article>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ReviewsContent({ context }: { context: MypageContext }) {
  const [tab, setTab] = useState<"writable" | "written">("writable");
  const writableTrips = context.applications.filter(
    (application) =>
      ["checkedIn", "completed"].includes(application.status) &&
      !application.reviewSubmitted,
  );
  const writtenTrips = context.applications.filter(
    (application) => application.reviewSubmitted,
  );
  const matchedReviews = context.reviews;

  return (
    <section>
      <PageTitle title="후기" trailing={`${writtenTrips.length}건`} />
      <SegmentedTabs
        active={tab}
        items={[
          { key: "writable", label: "작성 가능한 여행" },
          { key: "written", label: "내가 쓴 후기" },
        ]}
        onChange={setTab}
      />
      <div className="mt-6 grid gap-4">
        {tab === "writable" ? (
          writableTrips.length > 0 ? (
            writableTrips.map((application) => (
              <TripDetailCard
                actionHref={`/reviews/new?applicationId=${application.id}`}
                actionLabel="후기 작성하기"
                application={application}
                key={application.id}
                program={findProgramForApplication(application, context.publicPrograms)}
              />
            ))
          ) : (
            <EmptyState
              icon={ReviewMenuIcon}
              title="아직 작성할 후기가 없어요"
              body="완료된 여행 프로그램이 생기면 이곳에 보여요."
            />
          )
        ) : matchedReviews.length > 0 || writtenTrips.length > 0 ? (
          <>
            {matchedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
            {matchedReviews.length === 0
              ? writtenTrips.map((application) => (
                  <TripDetailCard
                    application={application}
                    key={application.id}
                    program={findProgramForApplication(
                      application,
                      context.publicPrograms,
                    )}
                  />
                ))
              : null}
          </>
        ) : (
          <EmptyState icon={ReviewMenuIcon} title="아직 후기가 없어요" />
        )}
      </div>
    </section>
  );
}

function BookmarksContent({ context }: { context: MypageContext }) {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [sort, setSort] = useState<"bookmarked" | "date">("bookmarked");
  const showBookmarkLoading = context.loading;
  const tabItems = [
    { key: "open" as const, label: "오픈된 여행" },
    { key: "closed" as const, label: "마감된 여행" },
  ];
  const dateSortLabel = tab === "open" ? "출발일 순" : "마감일순";
  const visibleItems = context.bookmarkedProgramItems.filter(({ program }) => {
    const closed = program.status === "closed" || program.status === "earlyClosed";
    return tab === "closed" ? closed : !closed;
  });
  const sortedItems = [...visibleItems].sort((a, b) => {
    if (sort === "bookmarked") {
      return (
        parseDateSortValue(b.bookmarkedAt) -
        parseDateSortValue(a.bookmarkedAt)
      );
    }

    const leftDate = tab === "open" ? a.program.activityStart : a.program.recruitEnd;
    const rightDate = tab === "open" ? b.program.activityStart : b.program.recruitEnd;
    return tab === "open"
      ? parseDateSortValue(leftDate) - parseDateSortValue(rightDate)
      : parseDateSortValue(rightDate) - parseDateSortValue(leftDate);
  });

  return (
    <section className="min-h-[clamp(420px,29.1667vw,560px)]">
      <TripFrameTabs
        active={tab}
        items={tabItems}
        onChange={(nextTab) => {
          setTab(nextTab);
          setSort("bookmarked");
        }}
      />
      <div className="flex min-h-11 items-center gap-[clamp(10px,0.6944vw,13.333px)] border-b border-[#f7eee7] pl-[clamp(7px,0.4861vw,9.333px)] lg:h-[clamp(31px,2.1528vw,41.333px)] lg:min-h-0">
        <BookmarkSortButton
          active={sort === "bookmarked"}
          label="북마크순"
          onClick={() => setSort("bookmarked")}
        />
        <BookmarkSortButton
          active={sort === "date"}
          label={dateSortLabel}
          onClick={() => setSort("date")}
        />
      </div>
      <div className="mt-[clamp(27px,1.875vw,36px)]">
        {showBookmarkLoading ? (
          <div className="grid gap-[var(--mypage-bookmark-gap)] sm:grid-cols-2 lg:grid-cols-[repeat(4,var(--mypage-bookmark-card))]">
            {Array.from({ length: 4 }, (_, index) => (
              <MiniCardPlaceholder animated key={`bookmark-loading-${index}`} />
            ))}
          </div>
        ) : sortedItems.length > 0 ? (
          <div className="grid gap-[var(--mypage-bookmark-gap)] sm:grid-cols-2 lg:grid-cols-[repeat(4,var(--mypage-bookmark-card))]">
            {sortedItems.map(({ bookmarkedAt, program }) => (
              <BookmarkProgramMiniCard
                bookmarkedAt={bookmarkedAt}
                key={String(program.id)}
                program={program}
              />
            ))}
          </div>
        ) : (
          <DashboardEmptyPanel
            actionHref="/"
            actionLabel="프로그램 찾아보기"
            message="저장한 프로그램이 없어요"
          />
        )}
      </div>
    </section>
  );
}

type MessageThread = {
  hostName: string;
  id: string;
  inquiryId?: string;
  location: string;
  messages: MessageBubble[];
  period: string;
  programId: string;
  programTitle: string;
  statusLabel: string;
  statusTone: "closed" | "open";
  timeLabel: string;
  title: string;
  unread: boolean;
};

type MessageBubble = {
  body: string;
  id: string;
  sender: "host" | "user";
  timeLabel: string;
};

type RequestedProgramMessageThread = {
  hostName: string;
  programId: string;
  programTitle: string;
};

function MessagesContent({ context }: { context: MypageContext }) {
  const searchParams = useSearchParams();
  const requestedProgramId = searchParams.get("programId") ?? "";
  const requestedProgramTitle = searchParams.get("programTitle") ?? "";
  const requestedHostName = searchParams.get("hostName") ?? "";
  const [threadQuery, setThreadQuery] = useState("");
  const [conversationSearchOpen, setConversationSearchOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [localMessagesByThread, setLocalMessagesByThread] = useState<
    Record<string, MessageBubble[]>
  >({});
  const [localInquiryIdsByThread, setLocalInquiryIdsByThread] = useState<
    Record<string, string>
  >({});
  const [readThreadIds, setReadThreadIds] = useState<Set<string>>(
    () => new Set(),
  );
  const markThreadRead = useCallback((threadId: string) => {
    setReadThreadIds((current) => {
      if (current.has(threadId)) return current;

      const next = new Set(current);
      next.add(threadId);
      return next;
    });
  }, []);
  const requestedProgramThread = useMemo<RequestedProgramMessageThread | null>(() => {
    if (!requestedProgramId && !requestedProgramTitle) return null;

    return {
      hostName: requestedHostName.trim(),
      programId: requestedProgramId.trim(),
      programTitle: requestedProgramTitle.trim(),
    };
  }, [requestedHostName, requestedProgramId, requestedProgramTitle]);
  const threads = useMemo(
    () =>
      buildMessageThreads({
        applications: context.applications,
        inquiries: context.inquiries,
        notifications: context.notifications,
        publicPrograms: context.publicPrograms,
        requestedProgramThread,
        visibleTrips: context.visibleTrips,
      }),
    [
      context.applications,
      context.inquiries,
      context.notifications,
      context.publicPrograms,
      requestedProgramThread,
      context.visibleTrips,
    ],
  );
  const threadsWithLocalMessages = useMemo(
    () =>
      threads.map((thread) => ({
        ...thread,
        inquiryId: localInquiryIdsByThread[thread.id] ?? thread.inquiryId,
        unread: thread.unread && !readThreadIds.has(thread.id),
        messages: [
          ...thread.messages,
          ...(localMessagesByThread[thread.id] ?? []),
        ],
      })),
    [localInquiryIdsByThread, localMessagesByThread, readThreadIds, threads],
  );
  const visibleThreads = useMemo(() => {
    const query = threadQuery.trim().toLowerCase();
    const matchingThreads = query
      ? threadsWithLocalMessages.filter((thread) =>
          [thread.title, thread.hostName, thread.location]
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : threadsWithLocalMessages;

    return matchingThreads.map((thread, index) => ({
      ...thread,
      unread: thread.unread && !(activeThreadId === null && index === 0),
    }));
  }, [activeThreadId, threadQuery, threadsWithLocalMessages]);
  const activeThread =
    visibleThreads.find((thread) => thread.id === activeThreadId) ??
    visibleThreads[0] ??
    null;

  async function sendMessage(thread: MessageThread, message: string) {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    if (!thread.programId && !thread.programTitle) {
      throw new Error("연결된 프로그램 정보를 찾지 못했습니다.");
    }

    const profile = context.authSession.profile;
    const response = await fetch(
      thread.inquiryId
        ? `/api/me/inquiries/${thread.inquiryId}/messages`
        : "/api/program-inquiries",
      {
        body: JSON.stringify(
          thread.inquiryId
            ? { message: trimmedMessage }
            : {
                contactEmail:
                  profile?.contactEmail ?? context.authSession.user?.email ?? "",
                contactName: context.profileName,
                contactPhone: profile?.phone ?? "",
                message: trimmedMessage,
                programId: thread.programId || thread.programTitle,
                programTitle: thread.programTitle || thread.title,
                source: "mypage-message",
                title: `${thread.title} 문의`,
              },
        ),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      data?: HostInquiry | ProgramInquiryMessage;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || "메시지를 보내지 못했습니다.");
    }

    let savedInquiryId = thread.inquiryId;
    let savedMessage: ProgramInquiryMessage | undefined;

    if (isProgramInquiryMessagePayload(payload.data)) {
      savedMessage = payload.data;
      savedInquiryId = payload.data.inquiryId;
    } else if (isHostInquiryPayload(payload.data)) {
      savedInquiryId = payload.data.id;
      savedMessage = [...payload.data.messages]
        .reverse()
        .find((item) => item.senderRole === "user");
    }

    if (savedInquiryId && savedInquiryId !== thread.inquiryId) {
      setLocalInquiryIdsByThread((current) => ({
        ...current,
        [thread.id]: savedInquiryId,
      }));
    }

    const sentMessage =
      createMessageBubbleFromInquiryMessage(savedMessage) ?? {
        body: trimmedMessage,
        id: `sent-${thread.id}-${Date.now()}`,
        sender: "user" as const,
        timeLabel: "방금 전",
      };

    setLocalMessagesByThread((current) => ({
      ...current,
      [thread.id]: [...(current[thread.id] ?? []), sentMessage],
    }));
  }

  async function sendAutoReply(
    thread: MessageThread,
    item: ProgramAutoReplyItem,
  ) {
    if (!item.response.trim()) return;

    const now = Date.now();
    const selectedQuestionMessage: MessageBubble = {
      body: item.label.trim() || item.response,
      id: `auto-reply-question-${thread.id}-${item.id}-${now}`,
      sender: "user",
      timeLabel: "방금 전",
    };
    const fallbackReplyMessage: MessageBubble = {
      body: item.response,
      id: `auto-reply-${thread.id}-${item.id}-${now}`,
      sender: "host",
      timeLabel: "방금 전",
    };
    let savedMessages: ProgramInquiryMessage[] = [];

    if (thread.inquiryId) {
      const response = await fetch(
        `/api/me/inquiries/${thread.inquiryId}/auto-replies`,
        {
          body: JSON.stringify({ itemId: item.id }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        data?: ProgramInquiryMessage | ProgramInquiryMessage[];
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "자동응답을 불러오지 못했습니다.");
      }

      savedMessages = Array.isArray(payload.data) ? payload.data : [payload.data];
    }

    const savedMessageBubbles = savedMessages
      .map(createMessageBubbleFromInquiryMessage)
      .filter((message): message is MessageBubble => Boolean(message));
    const hasSavedUserQuestion = savedMessageBubbles.some(
      (message) => message.sender === "user",
    );
    const hasSavedHostReply = savedMessageBubbles.some(
      (message) => message.sender === "host",
    );
    const messagesToAppend = [
      ...(hasSavedUserQuestion ? [] : [selectedQuestionMessage]),
      ...savedMessageBubbles,
      ...(hasSavedHostReply ? [] : [fallbackReplyMessage]),
    ];

    setLocalMessagesByThread((current) => ({
      ...current,
      [thread.id]: [...(current[thread.id] ?? []), ...messagesToAppend],
    }));
  }

  return (
    <section
      className="font-pretendard overflow-hidden bg-white text-[#5B3A29]"
      style={{ height: "calc(100dvh - max(56px, 4.861vw))" }}
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1025px] flex-col px-5 pb-5 pt-3 lg:px-0 min-[1440px]:w-[71.181vw] min-[1440px]:max-w-none min-[1440px]:pb-[1.389vw] min-[1440px]:pt-[0.833vw]">
        <Link
          aria-label="마이페이지로 돌아가기"
          className="flex min-h-11 shrink-0 items-center gap-[19px] rounded-[8px] transition hover:text-[#FE701E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FE701E] lg:min-h-0 min-[1440px]:gap-[1.319vw]"
          href="/mypage"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="h-[15px] w-[11px] shrink-0 min-[1440px]:h-[1.045vw] min-[1440px]:w-[0.775vw]"
            height={15}
            src={nuvioIconSources.mypageBack}
            width={11}
          />
          <h1 className="min-w-0 flex-1 text-[16px] font-semibold leading-[1.253]">
            메세지
          </h1>
        </Link>

        <div className="flex min-h-0 w-full flex-1 items-stretch justify-center gap-4 py-5 max-lg:flex-col min-[1440px]:gap-[1.111vw] min-[1440px]:py-[1.389vw]">
          <aside className="flex h-full min-h-0 w-[357px] shrink-0 flex-col gap-[6px] border-r-[3px] border-[#F3F3F3] pr-5 max-lg:h-[42dvh] max-lg:w-full max-lg:border-b-[3px] max-lg:border-r-0 max-lg:pb-5 max-lg:pr-0 min-[1440px]:w-[24.792vw] min-[1440px]:gap-[0.417vw] min-[1440px]:border-r-[0.208vw] min-[1440px]:pr-[1.389vw]">
            <MessageThreadSearch value={threadQuery} onChange={setThreadQuery} />
            <div className="flex min-h-0 flex-1 flex-col gap-[6px] overflow-y-auto pr-1 min-[1440px]:gap-[0.417vw] min-[1440px]:pr-[0.278vw]">
              {context.loading && threads.length === 0 ? (
                <MessageListSkeleton />
              ) : visibleThreads.length > 0 ? (
                visibleThreads.map((thread) => (
                  <MessageThreadRow
                    active={thread.id === activeThread?.id}
                    key={thread.id}
                    onSelect={() => {
                      markThreadRead(thread.id);
                      setActiveThreadId(thread.id);
                      setConversationSearchOpen(false);
                    }}
                    thread={thread}
                  />
                ))
              ) : null}
            </div>
          </aside>

          <MessageConversationPanel
            key={activeThread?.id ?? "empty"}
            searchOpen={conversationSearchOpen}
            thread={activeThread}
            onCloseSearch={() => setConversationSearchOpen(false)}
            onOpenSearch={() => setConversationSearchOpen(true)}
            onSendAutoReply={sendAutoReply}
            onSendMessage={sendMessage}
          />
        </div>
      </div>
    </section>
  );
}

function MessageThreadSearch({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex h-11 w-full items-center gap-2 rounded-[40px] border border-[#6D7A8A] bg-[#F9F9F9] px-[13px] lg:h-6 lg:px-[9px] lg:py-1 min-[1440px]:h-[1.667vw] min-[1440px]:gap-[0.556vw] min-[1440px]:px-[0.625vw] min-[1440px]:py-[0.278vw]">
      <Search
        aria-hidden="true"
        className="h-[14px] w-[14px] shrink-0 text-[#6D7A8A] min-[1440px]:h-[0.972vw] min-[1440px]:w-[0.972vw]"
        strokeWidth={1.75}
      />
      <input
        aria-label="메세지 검색"
        className="h-11 min-w-0 flex-1 bg-transparent pl-[3px] pr-[6px] text-base font-semibold leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#6D7A8A] lg:h-full lg:text-[12px]"
        onChange={(event) => onChange(event.target.value)}
        placeholder="검색"
        value={value}
      />
    </label>
  );
}

function MessageThreadRow({
  active,
  onSelect,
  thread,
}: {
  active: boolean;
  onSelect: () => void;
  thread: MessageThread;
}) {
  return (
    <button
      className={`flex w-full items-center justify-center gap-3 rounded-[12px] bg-[#F3F3F3] px-[6px] py-2 text-left transition hover:bg-[#EFEFEF] min-[1440px]:gap-[0.833vw] min-[1440px]:rounded-[0.833vw] min-[1440px]:px-[0.417vw] min-[1440px]:py-[0.556vw] ${
        active ? "shadow-[inset_0_0_0_1px_rgba(247,178,103,0.22)]" : ""
      }`}
      onClick={onSelect}
      type="button"
    >
      <span className="size-[35px] shrink-0 rounded-full bg-[#D9D9D9] min-[1440px]:size-[2.431vw]" />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px] leading-[1.253]">
        <span
          className={`truncate text-[14px] text-[#5B3A29] ${
            thread.unread ? "font-semibold" : "font-normal"
          }`}
        >
          {thread.title}
        </span>
        <span className="truncate text-[12px] font-medium text-[#6D7A8A]">
          {thread.hostName}
        </span>
      </span>
      <span className="flex self-stretch flex-col items-end justify-center pr-[6px]">
        <span className="flex min-h-[20px] items-center justify-center">
          {thread.unread ? (
            <span className="size-[6px] rounded-full bg-[#FE701E]" />
          ) : null}
        </span>
        <span className="whitespace-nowrap text-right text-[12px] font-normal leading-[1.6] text-[#6D7A8A]">
          {thread.timeLabel}
        </span>
      </span>
    </button>
  );
}

function MessageConversationPanel({
  onCloseSearch,
  onOpenSearch,
  onSendAutoReply,
  onSendMessage,
  searchOpen,
  thread,
}: {
  onCloseSearch: () => void;
  onOpenSearch: () => void;
  onSendAutoReply: (
    thread: MessageThread,
    item: ProgramAutoReplyItem,
  ) => Promise<void>;
  onSendMessage: (thread: MessageThread, message: string) => Promise<void>;
  searchOpen: boolean;
  thread: MessageThread | null;
}) {
  const [draftMessage, setDraftMessage] = useState("");
  const [autoReplyConfig, setAutoReplyConfig] =
    useState<ProgramAutoReplyConfig | null>(null);
  const [autoReplyError, setAutoReplyError] = useState("");
  const [autoReplyMenuOpen, setAutoReplyMenuOpen] = useState(false);
  const [autoReplySendingId, setAutoReplySendingId] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const hasActiveThread = Boolean(thread);
  const activeMessageCount = thread?.messages.length ?? 0;
  const scrollMessagesToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      window.requestAnimationFrame(() => {
        const element = messagesScrollRef.current;
        if (!element) return;

        element.scrollTo({
          behavior,
          top: element.scrollHeight,
        });
      });
    },
    [],
  );

  useEffect(() => {
    let active = true;

    async function loadAutoReplies() {
      if (!thread?.programId) {
        setAutoReplyConfig(null);
        setAutoReplyMenuOpen(false);
        return;
      }

      setAutoReplyConfig(createDefaultProgramAutoReplyConfig(thread.programId));
      setAutoReplyError("");
      setAutoReplyMenuOpen(true);

      try {
        const response = await fetch(
          `/api/program-auto-replies?programId=${encodeURIComponent(
            thread.programId,
          )}`,
          { cache: "no-store" },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          data?: ProgramAutoReplyConfig;
          error?: string;
        };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "자동응답을 불러오지 못했습니다.");
        }

        if (active) {
          const config = normalizeProgramAutoReplyConfig(payload.data);
          setAutoReplyConfig(config);
          setAutoReplyMenuOpen(config.enabled);
        }
      } catch (error) {
        if (active) {
          setAutoReplyError(
            error instanceof Error
              ? error.message
              : "자동응답을 불러오지 못했습니다.",
          );
        }
      }
    }

    void loadAutoReplies();

    return () => {
      active = false;
    };
  }, [thread?.id, thread?.programId]);

  useEffect(() => {
    if (!hasActiveThread) return;
    scrollMessagesToBottom("auto");
  }, [hasActiveThread, scrollMessagesToBottom, thread?.id]);

  useEffect(() => {
    if (!hasActiveThread) return;
    scrollMessagesToBottom("smooth");
  }, [
    activeMessageCount,
    autoReplyConfig?.items.length,
    autoReplyMenuOpen,
    hasActiveThread,
    scrollMessagesToBottom,
  ]);

  if (!thread) {
    return (
      <div className="flex h-[503px] min-w-0 flex-1 flex-col items-center justify-center rounded-[22px] bg-[#F9F9F9] px-[6px] py-2 max-lg:w-full min-[1440px]:h-[34.931vw] min-[1440px]:rounded-[1.528vw] min-[1440px]:px-[0.417vw] min-[1440px]:py-[0.556vw]">
        <NuvioEmptyState
          className="h-full min-h-0"
          compact
          label="메시지"
        />
      </div>
    );
  }

  const activeThread = thread;

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draftMessage.trim();
    if (!message || sending) return;

    setSending(true);
    setSendError("");
    try {
      await onSendMessage(activeThread, message);
      setDraftMessage("");
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "메시지를 보내지 못했습니다.",
      );
    } finally {
      setSending(false);
    }
  }

  async function selectAutoReply(item: ProgramAutoReplyItem) {
    if (autoReplySendingId) return;

    setAutoReplySendingId(item.id);
    setSendError("");
    try {
      await onSendAutoReply(activeThread, item);
      setAutoReplyMenuOpen(false);
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "자동응답을 불러오지 못했습니다.",
      );
    } finally {
      setAutoReplySendingId("");
    }
  }

  function openDirectMessage() {
    setAutoReplyMenuOpen(false);
    window.setTimeout(() => messageInputRef.current?.focus(), 0);
  }

  const availableAutoReplyItems =
    autoReplyConfig?.enabled === false
      ? []
      : (autoReplyConfig?.items ?? []).filter((item) => item.enabled);

  return (
    <div className="flex h-[503px] min-w-0 flex-1 flex-col items-center gap-3 rounded-[22px] bg-[#F9F9F9] px-[6px] py-2 max-lg:w-full min-[1440px]:h-[34.931vw] min-[1440px]:gap-[0.833vw] min-[1440px]:rounded-[1.528vw] min-[1440px]:px-[0.417vw] min-[1440px]:py-[0.556vw]">
      <div className="flex w-full items-center justify-center gap-3 border-b border-[#F3F3F3] px-2.5 pb-3 pt-[7px] min-[1440px]:gap-[0.833vw] min-[1440px]:px-[0.694vw] min-[1440px]:pb-[0.833vw] min-[1440px]:pt-[0.486vw]">
        <span className="h-[49px] w-[45px] shrink-0 rounded-[6px] bg-[#D9D9D9] min-[1440px]:h-[3.403vw] min-[1440px]:w-[3.125vw] min-[1440px]:rounded-[0.417vw]" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <div className="flex min-w-0 items-end gap-2">
            <h2 className="truncate text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
              {thread.title}
            </h2>
            <span
              className={`inline-flex h-[19px] shrink-0 items-center justify-center rounded-[6px] px-[6px] py-[3px] text-[12px] leading-[1.253] ${
                thread.statusTone === "closed"
                  ? "bg-[#6D7A8A] font-semibold text-[#F3F3F3]"
                  : "bg-[#F7B267] font-normal leading-[1.6] text-[#FCFCFC]"
              }`}
            >
              {thread.statusLabel}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-center gap-3 text-[12px] text-[#6D7A8A] max-md:flex-wrap max-md:justify-start">
            <p className="min-w-0 flex-1 truncate font-medium leading-[1.253]">
              {thread.location}
            </p>
            <p className="shrink-0 whitespace-nowrap font-medium leading-[1.253]">
              여행 기간 {thread.period}
            </p>
            <p className="w-[177px] shrink-0 truncate text-right font-normal leading-[1.6] max-md:w-auto min-[1440px]:w-[12.292vw]">
              {thread.hostName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center justify-end gap-3 px-2.5 py-1 min-[1440px]:gap-[0.833vw] min-[1440px]:px-[0.694vw] min-[1440px]:py-[0.278vw]">
        {searchOpen ? (
          <div className="flex h-[26px] w-[571px] max-w-[calc(100%-30px)] items-center gap-2 rounded-[12px] bg-[#F3F3F3] py-1 pl-[12px] pr-2 min-[1440px]:h-[1.806vw] min-[1440px]:w-[39.653vw] min-[1440px]:gap-[0.556vw] min-[1440px]:rounded-[0.833vw] min-[1440px]:py-[0.278vw] min-[1440px]:pl-[0.833vw] min-[1440px]:pr-[0.556vw]">
            <Search
              aria-hidden="true"
              className="size-[18px] shrink-0 text-[#FE701E]"
              strokeWidth={1.8}
            />
            <input
              aria-label="대화내용 검색"
              className="min-w-0 flex-1 bg-transparent text-[12px] font-normal leading-[1.6] text-[#6D7A8A] outline-none placeholder:text-[#CAC4BC]"
              placeholder="대화내용 검색"
            />
          </div>
        ) : (
          <button
            aria-label="대화내용 검색 열기"
            className="inline-flex size-[18px] items-center justify-center text-[#CAC4BC] transition hover:text-[#FE701E]"
            onClick={onOpenSearch}
            type="button"
          >
            <Search aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
          </button>
        )}
        <button
          aria-label={searchOpen ? "대화내용 검색 닫기" : "대화 접기"}
          className="inline-flex size-[18px] items-center justify-center rounded-full bg-[#CAC4BC] text-white transition hover:bg-[#B8B0A8]"
          onClick={searchOpen ? onCloseSearch : undefined}
          type="button"
        >
          <Minus aria-hidden="true" className="size-[11px]" strokeWidth={2.4} />
        </button>
      </div>

      <div
        className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-2.5 py-3 min-[1440px]:gap-[0.833vw] min-[1440px]:px-[0.694vw] min-[1440px]:py-[0.833vw]"
        ref={messagesScrollRef}
      >
        {thread.messages.map((message) => (
          <div
            className={`flex w-full ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
            key={message.id}
          >
            <div
              className={`max-w-[72%] rounded-[18px] px-4 py-3 text-[13px] leading-[1.65] shadow-sm ${
                message.sender === "user"
                  ? "rounded-br-[6px] bg-[#FE701E] text-white"
                  : "rounded-bl-[6px] bg-white text-[#5B3A29]"
              }`}
            >
              <p className="whitespace-pre-line break-keep">{message.body}</p>
              <p
                className={`mt-1 text-right text-[11px] ${
                  message.sender === "user" ? "text-white/70" : "text-[#CAC4BC]"
                }`}
              >
                {message.timeLabel}
              </p>
            </div>
          </div>
        ))}
        {autoReplyMenuOpen && availableAutoReplyItems.length > 0 ? (
          <div className="flex w-full justify-start">
            <div className="max-w-[78%] rounded-[18px] rounded-bl-[6px] bg-white px-4 py-3 text-[#5B3A29] shadow-sm">
              <p className="whitespace-pre-line text-[13px] font-medium leading-[1.65]">
                {autoReplyConfig?.greeting}
              </p>
              <div className="mt-3 grid gap-2">
                {availableAutoReplyItems.map((item) => (
                  <button
                    className="min-h-9 rounded-[10px] border border-[#F7B267] px-3 text-left text-[12px] font-semibold leading-[1.35] text-[#5B3A29] transition hover:border-[#FE701E] hover:text-[#FE701E] disabled:cursor-wait disabled:opacity-60"
                    disabled={Boolean(autoReplySendingId)}
                    key={item.id}
                    onClick={() => void selectAutoReply(item)}
                    type="button"
                  >
                    {autoReplySendingId === item.id ? "불러오는 중" : item.label}
                  </button>
                ))}
                <button
                  className="min-h-9 rounded-[10px] border border-[#FE701E] px-3 text-left text-[12px] font-semibold leading-[1.35] text-[#FE701E] transition hover:bg-[#FFF6EC]"
                  onClick={openDirectMessage}
                  type="button"
                >
                  호스트에게 직접 문의하기
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {autoReplyError ? (
          <p className="px-2 text-[12px] font-medium text-[#C75300]">
            {autoReplyError}
          </p>
        ) : null}
      </div>

      <form
        className="flex w-full shrink-0 flex-col items-center gap-2 pb-[11px] min-[1440px]:pb-[0.764vw]"
        onSubmit={(event) => void submitMessage(event)}
      >
        <label className="flex h-[37px] w-[593px] max-w-full items-center gap-2 rounded-[40px] border border-[#FF9A3D] bg-[#F9F9F9] p-[9px] min-[1440px]:h-[2.569vw] min-[1440px]:w-[41.181vw] min-[1440px]:gap-[0.556vw] min-[1440px]:p-[0.625vw]">
          <button
            aria-label="자동응답 메뉴 열기"
            aria-pressed={autoReplyMenuOpen}
            className="inline-flex size-3 shrink-0 items-center justify-center rounded-full bg-[#FF9A3D] text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!availableAutoReplyItems.length}
            onClick={() => setAutoReplyMenuOpen((open) => !open)}
            type="button"
          >
            <Plus aria-hidden="true" className="size-2" strokeWidth={2.4} />
          </button>
          <input
            aria-label="메세지 입력"
            ref={messageInputRef}
            className="min-w-0 flex-1 bg-transparent pl-[3px] pr-[6px] text-[12px] font-normal leading-[1.6] text-[#6D7A8A] outline-none placeholder:text-[#D9D9D9]"
            disabled={sending}
            onChange={(event) => setDraftMessage(event.target.value)}
            placeholder={sending ? "메세지 전송 중" : "메세지 입력"}
            value={draftMessage}
          />
          <button
            className="inline-flex h-6 shrink-0 items-center justify-center rounded-full bg-[#FE701E] px-3 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!draftMessage.trim() || sending}
            type="submit"
          >
            전송
          </button>
        </label>
        {sendError ? (
          <p className="w-[593px] max-w-full px-3 text-left text-[12px] font-medium text-[#C75300]">
            {sendError}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function MessageListSkeleton() {
  return (
    <>
      {[0, 1].map((item) => (
        <div
          className="flex animate-pulse items-center gap-3 rounded-[12px] bg-[#F3F3F3] px-[6px] py-2"
          key={item}
        >
          <span className="size-[35px] rounded-full bg-[#D9D9D9]" />
          <span className="flex flex-1 flex-col gap-[7px]">
            <span className="h-3 w-28 rounded bg-[#D9D9D9]" />
            <span className="h-3 w-16 rounded bg-[#D9D9D9]" />
          </span>
        </div>
      ))}
    </>
  );
}

function isProgramInquiryMessagePayload(
  value: unknown,
): value is ProgramInquiryMessage {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as ProgramInquiryMessage).inquiryId === "string" &&
    typeof (value as ProgramInquiryMessage).message === "string"
  );
}

function isHostInquiryPayload(value: unknown): value is HostInquiry {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as HostInquiry).id === "string" &&
    Array.isArray((value as HostInquiry).messages)
  );
}

function createMessageBubbleFromInquiryMessage(
  message?: ProgramInquiryMessage,
): MessageBubble | null {
  if (!message?.message) return null;

  return {
    body: message.message,
    id: message.id,
    sender: message.senderRole === "host" ? "host" : "user",
    timeLabel: formatMessageRelativeTime(message.createdAt),
  };
}

function createMessageBubblesFromInquiry(inquiry: HostInquiry): MessageBubble[] {
  const messages = [...inquiry.messages].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );

  if (messages.length > 0) {
    return messages
      .map(createMessageBubbleFromInquiryMessage)
      .filter((message): message is MessageBubble => Boolean(message));
  }

  return [
    {
      body: inquiry.message,
      id: inquiry.id,
      sender: "user",
      timeLabel: formatMessageRelativeTime(inquiry.submittedAt),
    },
  ];
}

function getLatestInquiryMessageCreatedAt(inquiries: HostInquiry[]): string {
  const messages = inquiries
    .flatMap((inquiry) => inquiry.messages)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const latestMessage = messages[messages.length - 1];
  if (latestMessage) return latestMessage.createdAt;

  return inquiries[inquiries.length - 1]?.submittedAt ?? new Date().toISOString();
}

function buildMessageThreads({
  applications,
  inquiries,
  notifications,
  publicPrograms,
  requestedProgramThread,
  visibleTrips,
}: Pick<
  MypageContext,
  "applications" | "inquiries" | "notifications" | "publicPrograms" | "visibleTrips"
> & {
  requestedProgramThread: RequestedProgramMessageThread | null;
}): MessageThread[] {
  const inquiryThreads = buildInquiryMessageThreads(inquiries, publicPrograms);
  const notificationThreads = notifications.map((notification) => {
    const application = findApplicationForMessageNotification(
      notification,
      applications,
    );
    const program =
      findProgramForMessageNotification(notification, publicPrograms) ??
      (application
        ? findProgramForApplication(application, publicPrograms)
        : undefined);

    return createMessageThread({
      application,
      createdAt: notification.createdAt,
      id: `notification-${notification.id}`,
      messageBody: notification.body,
      program,
      title: program?.title ?? (application
        ? formatProgramDisplayName(application.programTitle, application.programId)
        : notification.title),
      unread: !notification.readAt,
    });
  });

  const tripThreads = visibleTrips.slice(0, 6).map((application) => {
    const program = findProgramForApplication(application, publicPrograms);

    return createMessageThread({
      application,
      createdAt: application.submittedAt,
      id: `application-${application.id}`,
      program,
      title: program?.title ?? formatProgramDisplayName(application.programTitle, application.programId),
      unread: false,
    });
  });

  const baseThreads =
    notificationThreads.length > 0
      ? [...inquiryThreads, ...notificationThreads]
      : [...inquiryThreads, ...tripThreads];

  if (!requestedProgramThread) return baseThreads;

  const channelThread = createRequestedProgramMessageThread(
    requestedProgramThread,
    publicPrograms,
    inquiries,
  );
  return [
    channelThread,
    ...baseThreads.filter((thread) => thread.id !== channelThread.id),
  ];
}

function buildInquiryMessageThreads(
  inquiries: HostInquiry[],
  programs: Program[],
): MessageThread[] {
  const grouped = new Map<string, HostInquiry[]>();

  for (const inquiry of inquiries) {
    const key = inquiry.programId || inquiry.programTitle || inquiry.id;
    grouped.set(key, [...(grouped.get(key) ?? []), inquiry]);
  }

  return Array.from(grouped.values()).flatMap((items): MessageThread[] => {
    const sortedItems = [...items].sort(
      (a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt),
    );
    const latest = sortedItems[sortedItems.length - 1];
    if (!latest) return [];

    const program = findProgramForInquiry(latest, programs);
    const title = formatProgramDisplayName(
      program?.title || latest.programTitle || latest.title,
      latest.programId,
    );
    const hostName = program?.sourceName || "프로그램 관리자";
    const closed = program?.status === "closed" || program?.status === "earlyClosed";
    const inquiryMessages = sortedItems.flatMap(createMessageBubblesFromInquiry);
    const latestMessageCreatedAt = getLatestInquiryMessageCreatedAt(sortedItems);

    return [{
      hostName,
      id: `program-channel-${latest.programId || latest.programTitle || latest.id}`,
      inquiryId: latest.id,
      location: program ? `${program.region} ${program.city}` : "프로그램 문의 채널",
      messages: [
        {
          body: `안녕하세요, ${hostName}입니다.\n${title} 관련 문의는 이 메시지함에서 이어갈 수 있습니다.`,
          id: `${latest.id}-welcome`,
          sender: "host",
          timeLabel: formatMessageRelativeTime(sortedItems[0].submittedAt),
        },
        ...inquiryMessages,
      ],
      period: program
        ? `${formatMessageDate(program.activityStart)} - ${formatMessageDate(
            program.activityEnd,
          )}`
        : "메시지함에서 연결됨",
      programId: latest.programId ?? "",
      programTitle: title,
      statusLabel: closed ? "마감" : "문의 가능",
      statusTone: closed ? "closed" : "open",
      timeLabel: formatMessageRelativeTime(latestMessageCreatedAt),
      title,
      unread: false,
    }];
  });
}

function createMessageThread({
  application,
  createdAt,
  id,
  messageBody,
  program,
  title,
  unread,
}: {
  application?: HostApplication;
  createdAt: string;
  id: string;
  messageBody?: string;
  program?: Program;
  title: string;
  unread: boolean;
}): MessageThread {
  const closed =
    program?.status === "closed" ||
    program?.status === "earlyClosed" ||
    application?.status === "completed" ||
    application?.status === "rejected";
  const displayTitle = formatProgramDisplayName(
    title || program?.title || application?.programTitle,
    application?.programId ?? (program ? String(program.id || program.slug || "") : ""),
  );

  return {
    hostName: program?.sourceName || "호스트명",
    id,
    location: program ? `${program.region} ${program.city}` : "프로그램 지역 위치",
    messages: [
      {
        body:
          messageBody ||
          `${program?.sourceName || "프로그램 관리자"}입니다.\n${displayTitle} 관련 안내와 문의를 이 메시지함에서 확인할 수 있습니다.`,
        id: `${id}-host-message`,
        sender: "host",
        timeLabel: formatMessageRelativeTime(createdAt),
      },
    ],
    period: program
      ? `${formatMessageDate(program.activityStart)} - ${formatMessageDate(
          program.activityEnd,
        )}`
      : "0000. 00. 00 - 0000. 00. 00",
    programId:
      application?.programId ??
      (program ? String(program.id || program.slug || "") : ""),
    programTitle: displayTitle,
    statusLabel: closed ? "마감" : "모집중",
    statusTone: closed ? "closed" : "open",
    timeLabel: formatMessageRelativeTime(createdAt),
    title: displayTitle,
    unread,
  };
}

function createRequestedProgramMessageThread(
  requested: RequestedProgramMessageThread,
  programs: Program[],
  inquiries: HostInquiry[] = [],
): MessageThread {
  const program = findProgramForRequestedMessage(requested, programs);
  const title = formatProgramDisplayName(
    program?.title || requested.programTitle,
    requested.programId || (program ? String(program.id) : ""),
  );
  const hostName = requested.hostName || program?.sourceName || "프로그램 관리자";
  const matchingInquiries = inquiries
    .filter((inquiry) => inquiryMatchesRequestedProgram(inquiry, requested, program))
    .sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt));
  const latestInquiry = matchingInquiries[matchingInquiries.length - 1];
  const inquiryMessages = matchingInquiries.flatMap(createMessageBubblesFromInquiry);
  const now = new Date().toISOString();

  return {
    hostName,
    id: `program-channel-${requested.programId || title}`,
    inquiryId: latestInquiry?.id,
    location: program ? `${program.region} ${program.city}` : "프로그램 문의 채널",
    messages: [
      {
        body: `안녕하세요, ${hostName}입니다.\n${title} 관련 문의는 이 메시지함에서 남겨주세요. 신청 일정, 준비물, 참여 조건처럼 확인이 필요한 내용을 보내주시면 담당자가 이어서 안내드릴게요.`,
        id: `program-channel-${requested.programId || title}-welcome`,
        sender: "host",
        timeLabel: "방금 전",
      },
      ...inquiryMessages,
    ],
    period: program
      ? `${formatMessageDate(program.activityStart)} - ${formatMessageDate(
          program.activityEnd,
        )}`
      : "상세 페이지에서 연결됨",
    programId: requested.programId || (program ? String(program.id) : ""),
    programTitle: title,
    statusLabel:
      program?.status === "closed" || program?.status === "earlyClosed"
        ? "마감"
        : "문의 가능",
    statusTone:
      program?.status === "closed" || program?.status === "earlyClosed"
        ? "closed"
        : "open",
    timeLabel: formatMessageRelativeTime(now),
    title,
    unread: true,
  };
}

function inquiryMatchesRequestedProgram(
  inquiry: HostInquiry,
  requested: RequestedProgramMessageThread,
  program?: Program,
) {
  const programId = program ? String(program.id) : "";
  const programSlug = program?.slug ?? "";
  const requestedId = requested.programId;
  const requestedTitle = requested.programTitle;

  return (
    Boolean(inquiry.programId) &&
    (inquiry.programId === requestedId ||
      inquiry.programId === programId ||
      inquiry.programId === programSlug)
  ) || (Boolean(requestedTitle) && inquiry.programTitle === requestedTitle);
}

function findProgramForInquiry(
  inquiry: HostInquiry,
  programs: Program[],
): Program | undefined {
  return programs.find(
    (program) =>
      String(program.id) === inquiry.programId ||
      program.slug === inquiry.programId ||
      program.title === inquiry.programTitle,
  );
}

function findProgramForRequestedMessage(
  requested: RequestedProgramMessageThread,
  programs: Program[],
): Program | undefined {
  const id = requested.programId;
  const title = requested.programTitle;
  const program =
    programs.find(
      (item) =>
        String(item.id) === id ||
        item.slug === id ||
        (title ? item.title === title : false),
    ) ?? (Number.isInteger(Number(id)) ? getProgramById(Number(id)) : undefined);

  return program;
}

function findApplicationForMessageNotification(
  notification: UserNotification,
  applications: HostApplication[],
) {
  const searchText = getNotificationSearchText(notification);

  return applications.find((application) => {
    if (searchText.includes(application.programTitle)) return true;
    return application.programId ? searchText.includes(application.programId) : false;
  });
}

function findProgramForMessageNotification(
  notification: UserNotification,
  programs: Program[],
) {
  const searchText = getNotificationSearchText(notification);

  return programs.find((program) => {
    const id = String(program.id);
    return (
      searchText.includes(program.title) ||
      searchText.includes(program.slug) ||
      searchText.includes(id)
    );
  });
}

function getNotificationSearchText(notification: UserNotification) {
  return `${notification.title} ${notification.body} ${notification.href}`;
}

function MemberInformationContent({
  context,
  initialAddressSearchOpen,
  initialEditMode,
  initialSelectedAddress,
}: {
  context: MypageContext;
  initialAddressSearchOpen: boolean;
  initialEditMode: boolean;
  initialSelectedAddress: string;
}) {
  const profileKey =
    context.authSession.profile?.id ?? context.authSession.user?.id ?? "guest";

  return (
    <MemberInformationForm
      context={context}
      initialAddressSearchOpen={initialAddressSearchOpen}
      initialEditMode={initialEditMode}
      initialSelectedAddress={initialSelectedAddress}
      key={profileKey}
    />
  );
}

function MemberInformationForm({
  context,
  initialAddressSearchOpen,
  initialEditMode,
  initialSelectedAddress,
}: {
  context: MypageContext;
  initialAddressSearchOpen: boolean;
  initialEditMode: boolean;
  initialSelectedAddress: string;
}) {
  const profile = context.authSession.profile;
  const authProvider = getPrimaryAuthProvider(context.authSession.user?.appMetadata);
  const isPasswordManagedAccount = isPasswordAuthProvider(
    context.authSession.user?.appMetadata,
  );
  const socialProviderLabel = getAuthProviderLabel(authProvider);
  const accountEmail = context.authSession.user?.email ?? profile?.email ?? "";
  const initialEmail = profile?.contactEmail || accountEmail;
  const initialEmailParts = splitEmailAddress(initialEmail);
  const initialBirthDateParts = splitBirthDate(profile?.birthDate);
  const initialNickname = profile?.displayName ?? "";
  const [form, setForm] = useState<MemberInformationFormState>({
    address: initialSelectedAddress || profile?.address || "",
    avatarUrl: profile?.avatarUrl ?? "",
    birthDay: initialBirthDateParts.day,
    birthMonth: initialBirthDateParts.month,
    birthYear: initialBirthDateParts.year || String(DEFAULT_ADULT_BIRTH_YEAR),
    detailAddress: profile?.addressDetail ?? "",
    emailDomain: initialEmailParts.domain,
    emailDomainPreset: isKnownEmailDomain(initialEmailParts.domain)
      ? initialEmailParts.domain
      : CUSTOM_EMAIL_DOMAIN,
    emailId: initialEmailParts.id,
    gender: profile?.gender || "neutral",
    loginId: profile?.loginId || accountEmail.split("@")[0] || "",
    name: profile?.fullName ?? "",
    nickname: profile?.displayName ?? "",
    paymentMethod: profile?.paymentMethod ?? "",
    phone: profile?.phone ?? "",
    refundAccount: profile?.refundAccount ?? "",
    refundBank: profile?.refundBank ?? "",
  });
  const [nicknameCheck, setNicknameCheck] = useState<NicknameCheckState>({
    checkedValue: "",
    status: "idle",
  });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editMode, setEditMode] = useState(
    initialEditMode || initialAddressSearchOpen || Boolean(initialSelectedAddress),
  );
  const [addressSearchOpen, setAddressSearchOpen] = useState(
    initialAddressSearchOpen,
  );
  const [addressSearchError, setAddressSearchError] = useState("");
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSearchLayerTick, setAddressSearchLayerTick] = useState(0);
  const [postcodeEmbedded, setPostcodeEmbedded] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const addressSearchLayerRef = useRef<HTMLDivElement>(null);
  const detailAddressInputRef = useRef<HTMLInputElement>(null);
  const currentFormSnapshot = useMemo(
    () => createMemberInformationSnapshot(form),
    [form],
  );
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(currentFormSnapshot);
  const hasUnsavedMemberChanges =
    editMode && !saving && currentFormSnapshot !== savedFormSnapshot;
  const normalizedNickname = normalizeNicknameForCheck(form.nickname);
  const normalizedInitialNickname = normalizeNicknameForCheck(initialNickname);
  const nicknameChanged = normalizedNickname !== normalizedInitialNickname;
  const nicknameCheckPassed =
    !nicknameChanged ||
    (nicknameCheck.status === "available" &&
      nicknameCheck.checkedValue === normalizedNickname);
  const saveDisabled =
    saving ||
    nicknameCheck.status === "checking" ||
    (nicknameChanged && nicknameCheck.status === "duplicate");
  const birthDayOptions = getBirthDayOptions(form.birthYear, form.birthMonth);
  const fallbackAddressOptions = useMemo(() => {
    const query = addressSearchQuery.trim();
    if (!query) return ADDRESS_FALLBACK_OPTIONS;

    return ADDRESS_FALLBACK_OPTIONS.filter((address) => address.includes(query));
  }, [addressSearchQuery]);

  useEffect(() => {
    if (!addressSearchOpen) return;

    const layer = addressSearchLayerRef.current;
    if (!layer) {
      const retryFrame = window.requestAnimationFrame(() => {
        setAddressSearchLayerTick((current) => current + 1);
      });

      return () => window.cancelAnimationFrame(retryFrame);
    }
    const postcodeLayer = layer;

    let active = true;

    async function embedAddressSearch() {
      setStatus("주소 검색을 불러오는 중입니다.");
      setAddressSearchError("");
      setPostcodeEmbedded(false);
      try {
        await loadKakaoPostcodeScript();
        if (!active) return;

        const Postcode = getKakaoPostcodeConstructor();
        if (!Postcode) {
          throw new Error("주소 검색 서비스를 사용할 수 없습니다.");
        }

        postcodeLayer.innerHTML = "";
        new Postcode({
          height: "100%",
          maxSuggestItems: 5,
          oncomplete: (data: KakaoPostcodeData) => {
            setForm((current) => ({
              ...current,
              address: getSelectedKakaoAddress(data),
              detailAddress: "",
            }));
            setAddressSearchOpen(false);
            window.history.replaceState(null, "", "/mypage/member-information");
            setStatus(
              `${data.zonecode} 주소를 선택했습니다. 상세주소를 입력해주세요.`,
            );
            window.setTimeout(() => detailAddressInputRef.current?.focus(), 0);
          },
          width: "100%",
        }).embed(postcodeLayer);
        setPostcodeEmbedded(true);
        setStatus("");
      } catch (error) {
        setAddressSearchError(
          error instanceof Error
            ? error.message
            : "주소 검색 서비스를 불러오지 못했어요.",
        );
        setStatus("");
      }
    }

    void embedAddressSearch();

    return () => {
      active = false;
      postcodeLayer.innerHTML = "";
    };
  }, [addressSearchLayerTick, addressSearchOpen]);

  function openAddressSearch() {
    setAddressSearchError("");
    setPostcodeEmbedded(false);
    setAddressSearchOpen(true);
  }

  function selectAddress(address: string) {
    setForm((current) => ({
      ...current,
      address,
      detailAddress: "",
    }));
    setAddressSearchOpen(false);
    window.history.replaceState(null, "", "/mypage/member-information");
    setStatus("주소를 선택했습니다. 상세주소를 입력해주세요.");
    window.setTimeout(() => detailAddressInputRef.current?.focus(), 0);
  }

  function updateNickname(value: string) {
    setForm((current) => ({ ...current, nickname: value }));
    setNicknameCheck({ checkedValue: "", status: "idle" });
    setStatus("");
  }

  async function checkNicknameDuplicate() {
    if (!context.signedIn) {
      window.location.href = "/login?next=/mypage/member-information";
      return;
    }

    if (!normalizedNickname) {
      setNicknameCheck({ checkedValue: "", status: "error" });
      setStatus("닉네임을 입력해 주세요.");
      return;
    }

    if (!nicknameChanged) {
      setNicknameCheck({
        checkedValue: normalizedNickname,
        status: "available",
      });
      setStatus("현재 사용 중인 닉네임입니다.");
      return;
    }

    setNicknameCheck({
      checkedValue: normalizedNickname,
      status: "checking",
    });
    setStatus("닉네임을 확인하는 중입니다.");

    try {
      const response = await fetch(
        `/api/me/profile/nickname?nickname=${encodeURIComponent(form.nickname.trim())}`,
      );
      const payload = (await response.json()) as {
        data?: { available?: boolean };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "닉네임 중복확인을 완료하지 못했어요.");
      }

      if (payload.data?.available) {
        setNicknameCheck({
          checkedValue: normalizedNickname,
          status: "available",
        });
        setStatus("사용 가능한 닉네임입니다.");
      } else {
        setNicknameCheck({
          checkedValue: normalizedNickname,
          status: "duplicate",
        });
        setStatus("이미 사용 중인 닉네임입니다.");
      }
    } catch (error) {
      setNicknameCheck({
        checkedValue: normalizedNickname,
        status: "error",
      });
      setStatus(
        error instanceof Error
          ? error.message
          : "닉네임 중복확인을 완료하지 못했어요.",
      );
    }
  }

  async function uploadAvatar(file: File) {
    if (!context.signedIn) {
      window.location.href = "/login?next=/mypage/member-information";
      return;
    }

    setAvatarUploading(true);
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/me/avatar", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: { url?: string };
        error?: string;
      };
      const uploadedUrl = payload.data?.url;

      if (!response.ok || !uploadedUrl) {
        throw new Error(payload.error ?? "프로필 이미지를 업로드하지 못했어요.");
      }

      setForm((current) => ({ ...current, avatarUrl: uploadedUrl }));
      setStatus("프로필 이미지가 업로드됐어요. 저장하기를 눌러 반영해 주세요.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "프로필 이미지를 업로드하지 못했어요.",
      );
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }
  async function saveProfile() {
    if (!context.signedIn) {
      window.location.href = "/login?next=/mypage/member-information";
      return;
    }

    if (!normalizedNickname) {
      setStatus("닉네임을 입력해 주세요.");
      return;
    }

    if (!nicknameCheckPassed) {
      setStatus(
        nicknameCheck.status === "duplicate"
          ? "이미 사용 중인 닉네임입니다."
          : "닉네임 중복확인을 완료해 주세요.",
      );
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/me/profile", {
        body: JSON.stringify({
          address: form.address,
          addressDetail: form.detailAddress,
          avatarUrl: form.avatarUrl,
          birthDate: composeBirthDate(form.birthYear, form.birthMonth, form.birthDay),
          contactEmail: composeEmailAddress(form.emailId, form.emailDomain),
          displayName: form.nickname || form.name,
          fullName: form.name,
          gender: form.gender,
          ...(isPasswordManagedAccount ? { loginId: form.loginId } : {}),
          paymentMethod: form.paymentMethod,
          phone: form.phone,
          refundAccount: form.refundAccount,
          refundBank: form.refundBank,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json()) as {
        data?: AuthProfile;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "회원 정보를 저장하지 못했어요.");
      }
      const updatedProfile = payload.data;
      const updatedEmailParts = splitEmailAddress(updatedProfile.contactEmail ?? "");
      const updatedBirthDateParts = splitBirthDate(updatedProfile.birthDate);
      const nextFormState: MemberInformationFormState = {
        address: updatedProfile.address ?? "",
        detailAddress: updatedProfile.addressDetail ?? "",
        avatarUrl: updatedProfile.avatarUrl ?? "",
        birthDay: updatedBirthDateParts.day,
        birthMonth: updatedBirthDateParts.month,
        birthYear: updatedBirthDateParts.year || String(DEFAULT_ADULT_BIRTH_YEAR),
        emailDomain: updatedEmailParts.domain,
        emailDomainPreset: isKnownEmailDomain(updatedEmailParts.domain)
          ? updatedEmailParts.domain
          : CUSTOM_EMAIL_DOMAIN,
        emailId: updatedEmailParts.id,
        gender: updatedProfile.gender || "neutral",
        loginId: updatedProfile.loginId ?? "",
        name: updatedProfile.fullName ?? "",
        nickname: updatedProfile.displayName ?? "",
        paymentMethod: updatedProfile.paymentMethod ?? "",
        phone: updatedProfile.phone ?? "",
        refundAccount: updatedProfile.refundAccount ?? "",
        refundBank: updatedProfile.refundBank ?? "",
      };

      context.updateProfile(updatedProfile);
      setForm(nextFormState);
      setSavedFormSnapshot(createMemberInformationSnapshot(nextFormState));
      setNicknameCheck({
        checkedValue: normalizeNicknameForCheck(updatedProfile.displayName ?? ""),
        status: "available",
      });
      setEditMode(false);
      window.history.replaceState(null, "", "/mypage/member-information");
      setStatus("저장됐어요.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "회원 정보를 저장하지 못했어요.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <UnsavedChangesGuard when={hasUnsavedMemberChanges} />
      <section className="w-full pt-0 lg:min-h-[clamp(430px,29.8611vw,573.333px)]">
        <div className="relative min-h-[clamp(363px,25.2083vw,484px)] w-full max-w-[clamp(724px,50.2778vw,965.333px)]">
          <div className="absolute left-0 top-0 z-10">
            <div className="grid content-start justify-items-center gap-3">
              <button
                aria-label="프로필 이미지 변경"
                className="relative grid size-[clamp(63px,4.375vw,84px)] place-items-center overflow-visible rounded-full !text-[clamp(18px,1.25vw,24px)] font-semibold text-white transition disabled:cursor-default"
                disabled={!editMode || avatarUploading}
                onClick={() => avatarInputRef.current?.click()}
                type="button"
              >
                <span
                  className="grid size-full place-items-center overflow-hidden rounded-full bg-[#d9d9d9] bg-cover bg-center"
                  style={
                    form.avatarUrl
                      ? { backgroundImage: `url(${form.avatarUrl})` }
                      : undefined
                  }
                >
                  {form.avatarUrl ? null : getInitial(form.nickname || context.nickname)}
                </span>
                {editMode ? (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 right-0 z-20 grid size-[clamp(15px,1.0417vw,20px)] translate-x-[8%] translate-y-[8%] place-items-center rounded-full border border-white bg-[#ff8a2a] !text-[clamp(13px,0.9028vw,17.333px)] leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.16)]"
                  >
                    +
                  </span>
                ) : null}
              </button>
              {editMode ? (
                <input
                  accept="image/gif,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadAvatar(file);
                  }}
                  ref={avatarInputRef}
                  type="file"
                />
              ) : null}
            </div>
            <div className="hidden">
              <div>
                <h2 className="!text-[20px] font-semibold leading-[1.35] tracking-normal text-[#4B3328]">
                  회원 정보
                </h2>
                <p className="mt-1 !text-[13px] leading-5 text-[#8b98a6]">
                  누비오에서 사용할 기본 연락처와 프로필 정보를 관리합니다.
                </p>
              </div>
              {editMode ? (
                <div className="grid max-w-[620px] gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                  <MemberLineInput
                    onChange={(value) =>
                      setForm((current) => ({ ...current, avatarUrl: value }))
                    }
                    placeholder="프로필 이미지 URL을 입력하거나 이미지를 업로드해 주세요"
                    value={form.avatarUrl}
                  />
                  <MemberSmallButton onClick={() => avatarInputRef.current?.click()}>
                    {avatarUploading ? "업로드 중" : "이미지 업로드"}
                  </MemberSmallButton>
                  <MemberSmallButton
                    onClick={() => {
                      setForm((current) => ({ ...current, avatarUrl: "" }));
                      setStatus("프로필 이미지를 삭제하려면 저장하기를 눌러주세요.");
                    }}
                  >
                    삭제
                  </MemberSmallButton>
                </div>
              ) : (
                <p className="!text-[14px] font-medium leading-6 text-[#6B5145]">
                  {form.nickname || form.name || context.nickname}님의 회원 정보입니다.
                </p>
              )}
            </div>
          </div>

          {editMode ? (
            <>
              <div className="grid gap-y-[clamp(13px,0.9028vw,17.333px)] pl-[clamp(15px,1.0417vw,20px)] pt-[clamp(70px,4.8611vw,93.333px)]">
          <div className="grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(145px,10.0694vw,193.333px)_clamp(60px,4.1667vw,80px)_clamp(145px,10.0694vw,193.333px)_clamp(68px,4.7222vw,90.667px)_clamp(45px,3.125vw,60px)_clamp(180px,12.5vw,240px)] md:items-end">
            <MemberLabel>이름</MemberLabel>
            <MemberLineInput
              onChange={(value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="이름을 입력해 주세요"
              value={form.name}
            />
            <MemberLabel>닉네임</MemberLabel>
            <MemberLineInput
              onChange={updateNickname}
              placeholder="누비오에서 사용할 닉네임을 입력해 주세요"
              value={form.nickname}
            />
            <MemberSmallButton
              disabled={nicknameCheck.status === "checking"}
              onClick={() => void checkNicknameDuplicate()}
            >
              {nicknameCheck.status === "checking" ? "확인중" : "중복확인"}
            </MemberSmallButton>
            <MemberLabel>성별</MemberLabel>
            <div className="flex items-center gap-[clamp(5px,0.3472vw,6.667px)]">
              {(["female", "male", "neutral"] as const).map((gender) => (
                <button
                  className={`h-[clamp(22px,1.5278vw,29.333px)] shrink-0 whitespace-nowrap rounded-[clamp(3px,0.2083vw,4px)] px-[clamp(8px,0.5556vw,10.667px)] !text-[clamp(11px,0.7639vw,14.667px)] font-medium transition ${
                    form.gender === gender
                      ? "bg-[#ff8a2a] text-white"
                      : "bg-[#f1f1f1] text-[#b5aaa4]"
                  }`}
                  key={gender}
                  onClick={() => setForm((current) => ({ ...current, gender }))}
                  type="button"
                >
                  {gender === "female"
                    ? "여성"
                    : gender === "male"
                      ? "남성"
                      : "선택 안 함"}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:items-end ${
              isPasswordManagedAccount
                ? "md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(220px,15.2778vw,293.333px)_clamp(72px,5vw,96px)_clamp(220px,15.2778vw,293.333px)]"
                : "md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(300px,20.8333vw,400px)]"
            }`}
          >
            <MemberLabel>아이디</MemberLabel>
            {isPasswordManagedAccount ? (
              <div className="flex min-w-0 items-center gap-[clamp(8px,0.5556vw,10.667px)]">
                <MemberLineInput
                  onChange={(value) =>
                    setForm((current) => ({ ...current, loginId: value }))
                  }
                  placeholder="로그인 아이디를 입력해 주세요"
                  value={form.loginId}
                />
                <MemberSmallButton onClick={() => setStatus("사용 가능한 아이디입니다.")}>
                  중복확인
                </MemberSmallButton>
              </div>
            ) : (
              <MemberLineDisplay>{socialProviderLabel} 로그인 계정</MemberLineDisplay>
            )}
            {isPasswordManagedAccount ? (
              <>
                <MemberLabel>비밀번호</MemberLabel>
                <button
                  className="w-fit self-end text-left !text-[clamp(12px,0.8333vw,16px)] font-medium leading-none text-[#748190] underline underline-offset-2 transition hover:text-[#f7983a]"
                  onClick={() => setStatus("비밀번호 변경은 인증 화면과 함께 연결할게요.")}
                  type="button"
                >
                  변경하기
                </button>
              </>
            ) : null}
          </div>

          <div className="grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(520px,36.1111vw,693.333px)] md:items-end">
            <MemberLabel>이메일</MemberLabel>
            <div className="grid min-w-0 grid-cols-[minmax(90px,0.9fr)_auto_minmax(112px,1fr)_minmax(112px,1fr)] items-end gap-[clamp(8px,0.5556vw,10.667px)]">
              <MemberLineInput
                onChange={(value) =>
                  setForm((current) => ({ ...current, emailId: value }))
                }
                placeholder="이메일 앞부분"
                value={form.emailId}
              />
              <span className="self-end pb-[clamp(3px,0.2083vw,4px)] text-[14px] font-semibold leading-none text-[#8F7A6C]">@</span>
              <MemberLineInput
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    emailDomain: value,
                    emailDomainPreset: isKnownEmailDomain(value)
                      ? value
                      : CUSTOM_EMAIL_DOMAIN,
                  }))
                }
                placeholder="도메인 직접 입력"
                value={form.emailDomain}
              />
              <MemberLineSelect
                ariaLabel="이메일 도메인 선택"
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    emailDomain:
                      value === CUSTOM_EMAIL_DOMAIN ? current.emailDomain : value,
                    emailDomainPreset: value,
                  }))
                }
                value={form.emailDomainPreset}
              >
                <option value={CUSTOM_EMAIL_DOMAIN}>직접입력</option>
                {EMAIL_DOMAIN_OPTIONS.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </MemberLineSelect>
            </div>
          </div>

          <div className="grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(260px,18.0556vw,346.667px)] md:items-end">
            <MemberLabel>연락처</MemberLabel>
            <div className="flex min-w-0 items-end gap-[clamp(8px,0.5556vw,10.667px)]">
              <MemberLineInput
                onChange={(value) =>
                  setForm((current) => ({ ...current, phone: value }))
                }
                placeholder="010-0000-0000"
                value={form.phone}
              />
              <MemberSmallButton onClick={() => setStatus("연락처 인증을 준비 중입니다.")}>
                인증받기
              </MemberSmallButton>
            </div>
          </div>

          <div className="grid gap-x-[clamp(10px,0.6944vw,13.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(270px,18.75vw,360px)_clamp(75px,5.2083vw,100px)_clamp(260px,18.0556vw,346.667px)] md:items-end">
            <MemberLabel>주소</MemberLabel>
            <MemberLineInput
              onChange={(value) =>
                setForm((current) => ({ ...current, address: value }))
              }
              placeholder="주소 검색으로 기본 주소를 선택해 주세요"
              value={form.address}
            />
            <MemberSmallLink
              href="/mypage/member-information?addressSearch=1"
              onClick={(event) => {
                event.preventDefault();
                openAddressSearch();
              }}
            >
              주소검색
            </MemberSmallLink>
            <span className="sr-only">상세주소</span>
            <MemberLineInput
              inputRef={detailAddressInputRef}
              onChange={(value) =>
                setForm((current) => ({ ...current, detailAddress: value }))
              }
              placeholder="건물명, 호수 등 상세주소를 입력해 주세요"
              value={form.detailAddress}
            />
          </div>

          <div className="grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(330px,22.9167vw,440px)] md:items-end">
            <MemberLabel>생년월일</MemberLabel>
            <div className="grid grid-cols-[minmax(112px,1fr)_minmax(82px,0.7fr)_minmax(82px,0.7fr)] items-end gap-[clamp(12px,0.8333vw,16px)]">
              <MemberLineSelect
                ariaLabel="출생 연도"
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    birthDay: normalizeBirthDay(value, current.birthMonth, current.birthDay),
                    birthYear: value,
                  }))
                }
                value={form.birthYear}
              >
                {BIRTH_YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </MemberLineSelect>
              <MemberLineSelect
                ariaLabel="출생 월"
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    birthDay: normalizeBirthDay(current.birthYear, value, current.birthDay),
                    birthMonth: value,
                  }))
                }
                value={form.birthMonth}
              >
                <option value="">월</option>
                {BIRTH_MONTH_OPTIONS.map((month) => (
                  <option key={month} value={month}>
                    {month}월
                  </option>
                ))}
              </MemberLineSelect>
              <MemberLineSelect
                ariaLabel="출생 일"
                onChange={(value) =>
                  setForm((current) => ({ ...current, birthDay: value }))
                }
                value={form.birthDay}
              >
                <option value="">일</option>
                {birthDayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}일
                  </option>
                ))}
              </MemberLineSelect>
            </div>
          </div>

          <div className="mt-[clamp(9px,0.625vw,12px)] grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(340px,23.6111vw,453.333px)] md:items-end">
            <MemberLabel>결제정보</MemberLabel>
            <MemberLineInput
              onChange={(value) =>
                setForm((current) => ({ ...current, paymentMethod: value }))
              }
              placeholder="자주 사용하는 결제수단을 입력해 주세요"
              value={form.paymentMethod}
            />
          </div>

          <div className="grid gap-x-[clamp(12px,0.8333vw,16px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(170px,11.8056vw,226.667px)_clamp(300px,20.8333vw,400px)] md:items-end">
            <MemberLabel>환불계좌</MemberLabel>
            <MemberLineInput
              onChange={(value) =>
                setForm((current) => ({ ...current, refundBank: value }))
              }
              placeholder="은행명"
              value={form.refundBank}
            />
            <MemberLineInput
              onChange={(value) =>
                setForm((current) => ({ ...current, refundAccount: value }))
              }
              placeholder="환불받을 계좌번호를 입력해 주세요"
              value={form.refundAccount}
            />
          </div>
          </div>

        <div className="mt-[clamp(24px,1.6667vw,32px)] flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <p className="min-h-5 text-right text-[13px] text-[#8F7A6C] md:mr-4">
            {status}
          </p>
          <button
            className="h-[42px] w-[112px] rounded-[4px] bg-[#ff6f1a] !text-[14px] font-semibold text-white transition hover:bg-[#f05f0d] disabled:opacity-50 max-md:w-full"
            disabled={saveDisabled}
            onClick={saveProfile}
            type="button"
          >
            {saving ? "저장 중" : "저장하기"}
          </button>
              </div>
            </>
          ) : (
            <MemberInformationReadOnly
              form={form}
              isPasswordManagedAccount={isPasswordManagedAccount}
              onEdit={() => {
                setStatus("");
                setEditMode(true);
              }}
              socialProviderLabel={socialProviderLabel}
              status={status}
            />
          )}
        </div>
      </section>
      {addressSearchOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[100] grid place-items-center bg-black/35 px-4 py-8"
          role="dialog"
        >
          <div className="w-full max-w-[620px] overflow-hidden rounded-[8px] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <div className="flex h-[58px] items-center justify-between border-b border-[#eeeeee] px-6">
              <h2 className="text-[18px] font-semibold text-[#4B3328]">주소 검색</h2>
              <Link
                className="inline-flex h-[34px] items-center rounded-[4px] border border-[#d9d9d9] px-4 !text-[13px] font-semibold text-[#748190] transition hover:border-[#f7983a] hover:text-[#f7983a]"
                href="/mypage/member-information"
                onClick={(event) => {
                  event.preventDefault();
                  setAddressSearchOpen(false);
                  window.history.replaceState(null, "", "/mypage/member-information");
                }}
              >
                닫기
              </Link>
            </div>
            {addressSearchError ? null : (
              <div
                className={`w-full bg-white ${
                  postcodeEmbedded ? "h-[520px]" : "h-[220px]"
                }`}
                ref={addressSearchLayerRef}
              >
                <div className="grid h-full place-items-center text-[14px] text-[#8F7A6C]">
                  주소 검색을 불러오는 중입니다.
                </div>
              </div>
            )}
            {!postcodeEmbedded || addressSearchError ? (
              <div className="grid max-h-[360px] gap-5 overflow-y-auto border-t border-[#eeeeee] px-6 py-6">
                <div className="grid gap-2">
                  <input
                    className="h-[44px] rounded-[4px] border border-[#d9d9d9] px-4 !text-[15px] text-[#4B3328] outline-none transition placeholder:text-[#9a8c84] focus:border-[#f7983a]"
                    onChange={(event) => setAddressSearchQuery(event.target.value)}
                    placeholder="도로명, 건물명, 지번을 입력하세요"
                    value={addressSearchQuery}
                  />
                  <p className="text-[13px] leading-6 text-[#8F7A6C]">
                    Kakao 주소 검색이 열리지 않으면 아래에서 주소를 선택하거나 직접 입력하세요.
                  </p>
                </div>
                <div className="grid gap-2">
                  {fallbackAddressOptions.length > 0 ? (
                    fallbackAddressOptions.map((address) => (
                      <Link
                        className="rounded-[4px] border border-[#eeeeee] px-4 py-3 text-left !text-[14px] font-medium text-[#4B3328] transition hover:border-[#f7983a] hover:text-[#f7983a]"
                        href={`/mypage/member-information?selectedAddress=${encodeURIComponent(address)}`}
                        key={address}
                        onClick={(event) => {
                          event.preventDefault();
                          selectAddress(address);
                        }}
                      >
                        {address}
                      </Link>
                    ))
                  ) : (
                    <Link
                      className="rounded-[4px] border border-[#f7983a] px-4 py-3 text-left !text-[14px] font-semibold text-[#f7983a]"
                      href={`/mypage/member-information?selectedAddress=${encodeURIComponent(addressSearchQuery.trim())}`}
                      onClick={(event) => {
                        event.preventDefault();
                        selectAddress(addressSearchQuery.trim());
                      }}
                    >
                      입력한 주소 사용: {addressSearchQuery}
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              null
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function MemberInformationReadOnly({
  form,
  isPasswordManagedAccount,
  onEdit,
  socialProviderLabel,
  status,
}: {
  form: MemberInformationFormState;
  isPasswordManagedAccount: boolean;
  onEdit: () => void;
  socialProviderLabel: string;
  status: string;
}) {
  const email = composeEmailAddress(form.emailId, form.emailDomain);
  const birthDate = formatBirthDate(form.birthYear, form.birthMonth, form.birthDay);
  const fullAddress = [form.address, form.detailAddress].filter(Boolean).join(" ");
  const refundAccount = [form.refundBank, form.refundAccount]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="grid gap-y-[clamp(13px,0.9028vw,17.333px)] pl-[clamp(15px,1.0417vw,20px)] pt-[clamp(70px,4.8611vw,93.333px)]">
        <div className="grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(145px,10.0694vw,193.333px)_clamp(60px,4.1667vw,80px)_clamp(145px,10.0694vw,193.333px)_clamp(45px,3.125vw,60px)_clamp(180px,12.5vw,240px)] md:items-end">
          <MemberLabel>이름</MemberLabel>
          <MemberTextValue>{form.name || "-"}</MemberTextValue>
          <MemberLabel>닉네임</MemberLabel>
          <MemberTextValue>{form.nickname || "-"}</MemberTextValue>
          <MemberLabel>성별</MemberLabel>
          <MemberTextValue>{genderLabel(form.gender)}</MemberTextValue>
        </div>

        <div
          className={`grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:items-end ${
            isPasswordManagedAccount
              ? "md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(220px,15.2778vw,293.333px)_clamp(72px,5vw,96px)_clamp(220px,15.2778vw,293.333px)]"
              : "md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(300px,20.8333vw,400px)]"
          }`}
        >
          <MemberLabel>아이디</MemberLabel>
          <MemberTextValue>
            {isPasswordManagedAccount
              ? form.loginId || "-"
              : `${socialProviderLabel} 로그인 계정`}
          </MemberTextValue>
          {isPasswordManagedAccount ? (
            <>
              <MemberLabel>비밀번호</MemberLabel>
              <MemberTextValue>변경하기</MemberTextValue>
            </>
          ) : null}
        </div>

        <div className="grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(520px,36.1111vw,693.333px)] md:items-end">
          <MemberLabel>이메일</MemberLabel>
          <MemberTextValue>{email || "-"}</MemberTextValue>
        </div>

        <div className="grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(260px,18.0556vw,346.667px)] md:items-end">
          <MemberLabel>연락처</MemberLabel>
          <MemberTextValue>{form.phone || "-"}</MemberTextValue>
        </div>

        <div className="grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_minmax(0,1fr)] md:items-end">
          <MemberLabel>주소</MemberLabel>
          <MemberTextValue>{fullAddress || "-"}</MemberTextValue>
        </div>

        <div className="grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(330px,22.9167vw,440px)] md:items-end">
          <MemberLabel>생년월일</MemberLabel>
          <MemberTextValue>{birthDate || "-"}</MemberTextValue>
        </div>

        <div className="mt-[clamp(9px,0.625vw,12px)] grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_clamp(340px,23.6111vw,453.333px)] md:items-end">
          <MemberLabel>결제정보</MemberLabel>
          <MemberTextValue>{form.paymentMethod || "-"}</MemberTextValue>
        </div>

        <div className="grid gap-x-[clamp(13px,0.9028vw,17.333px)] gap-y-3 md:grid-cols-[clamp(50px,3.4722vw,66.667px)_minmax(0,1fr)] md:items-end">
          <MemberLabel>환불계좌</MemberLabel>
          <MemberTextValue>{refundAccount || "-"}</MemberTextValue>
        </div>
      </div>

      <div className="mt-[clamp(24px,1.6667vw,32px)] flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
        <p className="min-h-5 text-right text-[13px] text-[#8F7A6C] md:mr-4">
          {status}
        </p>
        <Link
          className="inline-flex h-[42px] min-h-11 w-[136px] items-center justify-center rounded-[4px] bg-[#ff6f1a] !text-[14px] font-semibold text-white transition hover:bg-[#f05f0d] lg:min-h-0"
          href="/mypage/member-information?edit=1"
          onClick={onEdit}
        >
          회원 정보 수정하기
        </Link>
      </div>
    </>
  );
}

function PointsContent() {
  return (
    <section>
      <PageTitle title="포인트" trailing="0 P" />
      <div className="mt-6 rounded-[6px] border border-[#d9d9d9] px-5 py-6">
        <div className="flex items-center justify-between border-b border-[#d9d9d9] pb-5">
          <span className="text-[16px] font-semibold">보유 포인트</span>
          <span className="text-[24px] font-semibold text-[#f7983a]">0 P</span>
        </div>
        <div className="mt-6">
          <SectionHeader title="포인트 내역" />
          <EmptyState icon={WalletCards} title="아직 포인트가 없어요" compact />
        </div>
      </div>
    </section>
  );
}

function CouponsContent() {
  const [message, setMessage] = useState("");

  return (
    <section>
      <PageTitle eyebrow="COUPON" title="쿠폰함" trailing="0개" />
      <div className="mt-6 grid gap-6">
        <div className="rounded-[6px] border border-[#d9d9d9] px-5 py-6">
          <SectionHeader title="쿠폰 코드 등록" />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="h-11 min-w-0 flex-1 rounded-[4px] border border-[#d9d9d9] px-3 text-[14px] outline-none focus:border-[#f7983a]"
              placeholder="쿠폰 코드를 입력하세요"
            />
            <button
              className="h-11 rounded-[4px] bg-[#f7983a] px-5 text-[14px] font-semibold text-white"
              onClick={() => setMessage("등록 가능한 쿠폰이 생기면 알려드릴게요.")}
              type="button"
            >
              등록
            </button>
          </div>
          <p className="mt-3 min-h-5 text-[13px] text-[#8F7A6C]">{message}</p>
        </div>
        <EmptyState icon={Ticket} title="아직 쿠폰이 없어요" />
      </div>
    </section>
  );
}

function SettingsContent({ context }: { context: MypageContext }) {
  return (
    <section>
      <PageTitle title="설정" />
      <div className="mt-6 grid gap-3">
        <SettingRow label="마케팅 수신 동의" value="미설정" />
        <HostCenterNavSettingRow context={context} />
        <BrowserPushSettingRow signedIn={context.signedIn} />
        <SettingRow label="계정 보안" value="소셜 로그인" />
      </div>
    </section>
  );
}

function HostCenterNavSettingRow({ context }: { context: MypageContext }) {
  const profile = context.authSession.profile;
  const [optimisticEnabled, setOptimisticEnabled] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const enabled = optimisticEnabled ?? getEffectiveHostCenterNavVisibility(profile);
  const statusMessage =
    message ||
    (profile
      ? enabled
        ? "상단 메뉴에서 호스트센터로 바로 이동할 수 있어요."
        : "필요할 때 다시 켜면 상단 메뉴에 호스트센터가 표시돼요."
      : "로그인 후 설정할 수 있어요.");

  async function handleToggle() {
    if (busy || !profile) return;

    const nextEnabled = !enabled;
    setBusy(true);
    setOptimisticEnabled(nextEnabled);
    setMessage(nextEnabled ? "호스트센터 메뉴를 켜고 있어요." : "호스트센터 메뉴를 숨기고 있어요.");

    try {
      const response = await fetch("/api/me/profile", {
        body: JSON.stringify({ showHostCenterNav: nextEnabled }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: AuthProfile;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "설정을 저장하지 못했어요.");
      }

      context.updateProfile(payload.data);
      window.dispatchEvent(new Event("nuvio-profile-updated"));
      setOptimisticEnabled(null);
      setMessage(
        nextEnabled
          ? "상단 메뉴에 호스트센터가 표시돼요."
          : "상단 메뉴에서 호스트센터를 숨겼어요.",
      );
    } catch (error) {
      setOptimisticEnabled(null);
      setMessage(
        error instanceof Error ? error.message : "설정을 저장하지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[6px] border border-[#d9d9d9] px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-semibold text-[#4B3328]">
            호스트센터 메뉴
          </p>
          <p className="mt-1 text-[13px] text-[#8F7A6C]">
            상단 메뉴의 매거진, 채널 옆에 호스트센터 바로가기를 표시해요.
          </p>
          <p className="mt-2 text-[12px] text-[#748190]">{statusMessage}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[13px] text-[#8F7A6C]">
            {enabled ? "사용 중" : "꺼짐"}
          </span>
          <button
            aria-label="호스트센터 메뉴 표시"
            aria-pressed={enabled}
            className={[
              "flex h-11 w-12 items-center justify-center",
              busy ? "cursor-not-allowed opacity-50" : "",
            ].join(" ")}
            disabled={busy || !profile}
            onClick={handleToggle}
            type="button"
          >
            <span
              className={[
                "relative block h-7 w-12 rounded-full border transition",
                enabled
                  ? "border-[#ff6b1a] bg-[#ff6b1a]"
                  : "border-[#cfc7c0] bg-[#f4f1ee]",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition",
                  enabled ? "left-6" : "left-1",
                ].join(" ")}
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function getEffectiveHostCenterNavVisibility(
  profile: AuthProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.showHostCenterNav !== null && profile.showHostCenterNav !== undefined) {
    return profile.showHostCenterNav;
  }

  return (
    profile.onboardingIntent === "host" ||
    profile.role === "admin" ||
    profile.role === "partner"
  );
}

type BrowserPushSettingState =
  | "denied"
  | "loading"
  | "off"
  | "on"
  | "unsupported";

function BrowserPushSettingRow({ signedIn }: { signedIn: boolean }) {
  const [state, setState] = useState<BrowserPushSettingState>("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBrowserPushState() {
      if (!signedIn) {
        if (!cancelled) {
          setState("off");
          setMessage("로그인 후 알림을 설정할 수 있어요.");
        }
        return;
      }

      if (!isBrowserPushSupported()) {
        if (!cancelled) {
          setState("unsupported");
          setMessage("이 브라우저에서는 알림을 사용할 수 없어요.");
        }
        return;
      }

      const permission = getBrowserNotificationPermission();
      if (permission === "denied") {
        if (!cancelled) {
          setState("denied");
          setMessage("브라우저에서 누비오 알림 권한이 차단되어 있어요.");
        }
        return;
      }

      try {
        const response = await fetch("/api/me/notification-preferences", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          data?: { browserPushEnabled?: boolean };
        };
        if (!response.ok) throw new Error("Failed to load preferences.");

        if (!cancelled) {
          const enabled =
            Boolean(payload.data?.browserPushEnabled) && permission === "granted";
          setState(enabled ? "on" : "off");
          setMessage(
            enabled
              ? "신청 결과와 메시지 답장을 브라우저 알림으로 받아요."
              : "브라우저 권한을 허용하면 신청 결과와 메시지 답장을 받을 수 있어요.",
          );
        }
      } catch {
        if (!cancelled) {
          setState("off");
          setMessage("알림 설정을 불러오지 못했어요.");
        }
      }
    }

    void loadBrowserPushState();

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  async function handleToggle() {
    if (!signedIn || busy || state === "unsupported" || state === "denied") return;

    setBusy(true);
    setMessage("");

    try {
      const enabling = state !== "on";
      const result = enabling
        ? await enableBrowserPushNotifications()
        : await disableBrowserPushNotifications();
      const succeeded = enabling
        ? result.status === "subscribed"
        : result.status === "unsubscribed";

      if (!succeeded) {
        setMessage(result.message ?? "브라우저 알림 설정을 변경하지 못했어요.");
        if (getBrowserNotificationPermission() === "denied") setState("denied");
        return;
      }

      setState(enabling ? "on" : "off");
      setMessage(
        enabling
          ? "브라우저 알림을 켰어요."
          : "브라우저 알림을 껐어요.",
      );
    } finally {
      setBusy(false);
    }
  }

  const enabled = state === "on";
  const disabled =
    !signedIn ||
    busy ||
    state === "loading" ||
    state === "unsupported" ||
    state === "denied";
  const valueLabel = getBrowserPushSettingLabel(state);

  return (
    <div className="rounded-[6px] border border-[#d9d9d9] px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-semibold text-[#4B3328]">프로그램 알림</p>
          <p className="mt-1 text-[13px] text-[#8F7A6C]">
            새 메시지, 신청 접수와 결과 변경을 브라우저 알림으로 받아요.
          </p>
          {message ? (
            <p className="mt-2 text-[12px] text-[#748190]">{message}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[13px] text-[#8F7A6C]">{valueLabel}</span>
          <button
            aria-label="브라우저 알림"
            aria-pressed={enabled}
            className={[
              "flex h-11 w-12 items-center justify-center",
              disabled ? "cursor-not-allowed opacity-50" : "",
            ].join(" ")}
            disabled={disabled}
            onClick={handleToggle}
            type="button"
          >
            <span
              className={[
                "relative block h-7 w-12 rounded-full border transition",
                enabled
                  ? "border-[#ff6b1a] bg-[#ff6b1a]"
                  : "border-[#cfc7c0] bg-[#f4f1ee]",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition",
                  enabled ? "left-6" : "left-1",
                ].join(" ")}
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function getBrowserPushSettingLabel(state: BrowserPushSettingState) {
  if (state === "loading") return "확인 중";
  if (state === "on") return "사용 중";
  if (state === "denied") return "권한 차단";
  if (state === "unsupported") return "지원 안 함";
  return "꺼짐";
}

function SupportContent({ context }: { context: MypageContext }) {
  const profile = context.authSession.profile;

  return (
    <section>
      <PageTitle title="고객센터" />
      <SupportContactForm
        initialValues={{
          email: profile?.contactEmail ?? context.authSession.user?.email ?? "",
          name: context.signedIn ? context.profileName : "",
          phone: profile?.phone ?? "",
        }}
      />
    </section>
  );
}

function ProfileSummaryCard({
  avatarUrl,
  bookmarkCount,
  loading = false,
  messageCount,
  nickname,
  tripCount,
}: {
  avatarUrl?: string | null;
  bookmarkCount: number;
  loading?: boolean;
  messageCount: number;
  nickname: string;
  tripCount: number;
}) {
  if (loading) {
    return (
      <section className="rounded-[clamp(4px,0.2778vw,5.333px)] border border-[#d9d9d9] bg-white px-[clamp(48px,3.3333vw,64px)] py-[clamp(24px,1.6667vw,32px)]">
        <div className="flex flex-col gap-[clamp(36px,2.5vw,48px)] md:flex-row md:items-center">
          <div className="flex shrink-0 flex-col items-center gap-[clamp(10px,0.6944vw,13.333px)] md:w-[clamp(82px,5.6944vw,109.333px)]">
            <MypageSkeletonBlock className="size-[clamp(54px,3.75vw,72px)] rounded-full" />
            <MypageSkeletonBlock className="h-[clamp(14px,0.9722vw,18.667px)] w-[clamp(64px,4.4444vw,85.333px)]" />
          </div>
          <div className="grid flex-1 grid-cols-3 gap-y-[clamp(18px,1.25vw,24px)]">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                className="flex flex-col items-center gap-[clamp(8px,0.5556vw,10.667px)]"
                key={`summary-loading-${index}`}
              >
                <MypageSkeletonBlock className="size-[clamp(18px,1.25vw,24px)] rounded-[clamp(4px,0.2778vw,5.333px)]" />
                <MypageSkeletonBlock className="h-[clamp(13px,0.9028vw,17.333px)] w-[clamp(58px,4.0278vw,77.333px)]" />
                <MypageSkeletonBlock className="h-[clamp(18px,1.25vw,24px)] w-[clamp(22px,1.5278vw,29.333px)]" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[clamp(4px,0.2778vw,5.333px)] border border-[#d9d9d9] bg-white px-[clamp(48px,3.3333vw,64px)] py-[clamp(24px,1.6667vw,32px)]">
      <div className="flex flex-col gap-[clamp(36px,2.5vw,48px)] md:flex-row md:items-center">
        <div className="flex shrink-0 flex-col items-center gap-[clamp(10px,0.6944vw,13.333px)] md:w-[clamp(82px,5.6944vw,109.333px)]">
          <span
            aria-hidden="true"
            className="grid size-[clamp(54px,3.75vw,72px)] place-items-center rounded-full bg-[#d9d9d9] bg-cover bg-center text-[clamp(14px,0.9722vw,18.667px)] font-semibold text-white"
            style={
              avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined
            }
          >
            {avatarUrl ? null : getInitial(nickname)}
          </span>
          <span className="max-w-[clamp(90px,6.25vw,120px)] truncate text-[clamp(13px,0.9028vw,17.333px)] font-semibold text-[#8F98A3]">
            {nickname}
          </span>
        </div>

        <div className="grid flex-1 grid-cols-3 gap-y-[clamp(18px,1.25vw,24px)]">
          <SummaryMetric
            href="/mypage/trips"
            iconName="summaryCalendar"
            label="예약 일정"
            value={tripCount}
          />
          <SummaryMetric
            href="/mypage/bookmarks"
            iconName="bookmark"
            label="북마크"
            value={bookmarkCount}
          />
          <SummaryMetric
            href="/mypage/messages"
            iconName="summaryMessage"
            label="메시지"
            value={messageCount}
          />
        </div>
      </div>
    </section>
  );
}

function WalletSummaryCard({
  loading = false,
  pointCount,
}: {
  loading?: boolean;
  pointCount: number;
}) {
  return (
    <section className="rounded-[clamp(4px,0.2778vw,5.333px)] border border-[#d9d9d9] bg-white px-[clamp(24px,1.6667vw,32px)] py-[clamp(22px,1.5278vw,29.333px)]">
      <div className="grid h-full min-h-[clamp(96px,6.6667vw,128px)] content-center gap-[clamp(18px,1.25vw,24px)]">
        {loading ? (
          <div className="flex items-center justify-between">
            <MypageSkeletonBlock className="h-[clamp(20px,1.3889vw,26.667px)] w-[clamp(54px,3.75vw,72px)]" />
            <MypageSkeletonBlock className="h-[clamp(20px,1.3889vw,26.667px)] w-[clamp(58px,4.0278vw,77.333px)]" />
          </div>
        ) : (
          <WalletLine label="포인트" unit="P" value={pointCount} />
        )}
      </div>
    </section>
  );
}

function SummaryMetric({
  href,
  iconName,
  label,
  value,
}: {
  href?: string;
  iconName: keyof typeof nuvioIconSources;
  label: string;
  value: number;
}) {
  const content = (
    <>
      <NuvioAssetIcon alt="" name={iconName} size={18} />
      <span className="text-[clamp(12px,0.8333vw,16px)] font-medium text-[#6F7E56]">
        {label}
      </span>
      <span className="text-[clamp(16px,1.1111vw,21.333px)] font-semibold text-[#748190]">
        {value}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        className="flex flex-col items-center gap-[clamp(7px,0.4861vw,9.333px)] rounded-[clamp(8px,0.5556vw,10.667px)] text-center transition hover:text-[#FE701E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FE701E]"
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-center gap-[clamp(7px,0.4861vw,9.333px)] text-center">
      {content}
    </div>
  );
}

function WalletLine({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between text-[clamp(16px,1.1111vw,21.333px)] font-semibold text-[var(--mypage-brown)]">
      <span>{label}</span>
      <span className="text-[var(--mypage-orange)]">
        {value.toLocaleString("ko-KR")}{" "}
        <span className="text-[var(--mypage-brown)]">{unit}</span>
      </span>
    </div>
  );
}

function MypageSideMenu({
  activeSection,
  onLogout,
  signedIn,
}: {
  activeSection: MypageSection;
  onLogout: () => void;
  signedIn: boolean;
}) {
  const pathname = usePathname();
  const supportActive = activeSection === "support" || pathname === "/support";
  const menuRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    function centerActiveLink() {
      const menu = menuRef.current;
      const activeLink = activeLinkRef.current;
      if (
        !menu ||
        !activeLink ||
        window.matchMedia("(min-width: 1024px)").matches
      ) {
        return;
      }

      const centeredLeft =
        activeLink.offsetLeft - (menu.clientWidth - activeLink.clientWidth) / 2;
      menu.scrollTo({ left: Math.max(0, centeredLeft) });
    }

    centerActiveLink();
    window.addEventListener("resize", centerActiveLink);

    return () => window.removeEventListener("resize", centerActiveLink);
  }, [activeSection, pathname]);

  return (
    <aside
      className="flex gap-3 overflow-x-auto pb-2 lg:block lg:space-y-[clamp(13px,0.9028vw,17.333px)] lg:overflow-visible lg:pb-0"
      ref={menuRef}
    >
      {visibleSideMenuItems.map((item) => {
        const active = item.section === activeSection || pathname === item.href;

        return (
          <SideMenuLink
            active={active}
            href={item.href}
            icon={item.icon}
            key={item.label}
            label={item.label}
            linkRef={active ? activeLinkRef : undefined}
          />
        );
      })}
      <Link
        aria-current={supportActive ? "page" : undefined}
        className={`flex min-h-11 shrink-0 items-center gap-2 text-[clamp(14px,0.9722vw,18.667px)] font-medium transition lg:min-h-0 lg:w-full ${
          supportActive ? "text-[var(--mypage-orange)]" : "text-[var(--mypage-brown)] hover:text-[var(--mypage-orange)]"
        }`}
        href="/support"
        ref={supportActive ? activeLinkRef : undefined}
      >
        <Gift className="lg:hidden" size={16} strokeWidth={1.8} />
        고객센터
      </Link>
      <button
        className="flex min-h-11 shrink-0 items-center gap-2 text-left text-[clamp(14px,0.9722vw,18.667px)] font-medium text-[#b6a79f] transition hover:text-[var(--mypage-orange)] disabled:cursor-not-allowed disabled:text-[#d5cbc5] lg:min-h-0 lg:w-full"
        disabled={!signedIn}
        onClick={onLogout}
        type="button"
      >
        <LogOut className="lg:hidden" size={16} strokeWidth={1.8} />
        로그아웃
      </button>
    </aside>
  );
}

function SideMenuLink({
  active,
  href,
  icon: Icon,
  label,
  linkRef,
}: {
  active: boolean;
  href: string;
  icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  label: string;
  linkRef?: Ref<HTMLAnchorElement>;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 shrink-0 items-center gap-2 text-[clamp(14px,0.9722vw,18.667px)] font-medium transition lg:min-h-0 lg:w-full ${
        active ? "text-[var(--mypage-orange)]" : "text-[var(--mypage-brown)] hover:text-[var(--mypage-orange)]"
      }`}
      href={href}
      ref={linkRef}
    >
      <Icon className="lg:hidden" size={16} strokeWidth={1.8} />
      {label}
    </Link>
  );
}

function DashboardSection({
  children,
  className,
  heading,
  href,
}: {
  children: ReactNode;
  className?: string;
  heading: string;
  href: string;
}) {
  return (
    <section className={className}>
      <div className="mb-[clamp(20px,1.3889vw,26.667px)] grid grid-cols-[auto_minmax(24px,1fr)_auto] items-center gap-[clamp(16px,1.1111vw,21.333px)]">
        <h2 className="whitespace-nowrap text-[clamp(16px,1.1111vw,21.333px)] font-semibold text-[var(--mypage-brown)]">
          {heading}
        </h2>
        <span className="h-px bg-[var(--mypage-line)]" />
        <Link
          className="inline-flex min-h-11 items-center gap-1 text-[clamp(12px,0.8333vw,16px)] font-medium text-[#8F7A6C] transition hover:text-[var(--mypage-orange)] lg:min-h-0"
          href={href}
        >
          더보기
          <ChevronRight size={14} strokeWidth={1.8} />
        </Link>
      </div>
      {children}
    </section>
  );
}

function PageTitle({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  trailing?: string;
}) {
  return (
    <header className="flex flex-col gap-2 border-b border-[#d9d9d9] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[12px] font-semibold text-[#f7983a]">{eyebrow}</p>
        ) : null}
        <h1 className={`${eyebrow ? "mt-1" : ""} text-[24px] font-semibold text-[#4B3328]`}>
          {title}
        </h1>
      </div>
      {trailing ? (
        <span className="text-[14px] font-semibold text-[#8F7A6C]">{trailing}</span>
      ) : null}
    </header>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-[16px] font-semibold text-[#4B3328]">{title}</h2>;
}

function SegmentedTabs<T extends string>({
  active,
  items,
  onChange,
}: {
  active: T;
  items: Array<{ key: T; label: string }>;
  onChange: (key: T) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          className={`min-h-11 rounded-full border px-4 text-[13px] font-semibold transition lg:h-9 lg:min-h-0 ${
            active === item.key
              ? "border-[#f7983a] bg-[#fff7ef] text-[#f7983a]"
              : "border-[#d9d9d9] bg-white text-[#8F7A6C] hover:border-[#f7983a]"
          }`}
          key={item.key}
          onClick={() => onChange(item.key)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function TripFrameTabs<T extends string>({
  active,
  items,
  onChange,
}: {
  active: T;
  items: Array<{ key: T; label: string }>;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex items-end gap-[clamp(28px,1.9444vw,37.333px)] border-b border-[var(--mypage-line)]">
      {items.map((item) => (
        <button
          className={`relative inline-flex min-h-11 items-end pb-[clamp(11px,0.7639vw,14.667px)] text-[clamp(14px,0.9722vw,18.667px)] font-medium transition lg:min-h-0 ${
            active === item.key
              ? "text-[var(--mypage-brown)]"
              : "text-[var(--mypage-muted)] hover:text-[#8F7A6C]"
          }`}
          key={item.key}
          onClick={() => onChange(item.key)}
          type="button"
        >
          {item.label}
          {active === item.key ? (
            <span className="absolute bottom-[-1px] left-0 h-[clamp(2px,0.1389vw,2.667px)] w-full bg-[var(--mypage-orange)]" />
          ) : null}
        </button>
      ))}
    </div>
  );
}

function BookmarkSortButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex min-h-11 items-center px-1 text-[clamp(11px,0.7639vw,14.667px)] font-medium leading-none transition lg:min-h-0 lg:px-0 ${
        active ? "text-[#748190]" : "text-[var(--mypage-muted)] hover:text-[#8F7A6C]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function TripMeta({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[clamp(12px,0.8333vw,16px)] font-medium leading-[1.2] text-[#748190]">
        {label}
      </p>
      <p
        className={`mt-[clamp(6px,0.4167vw,8px)] truncate whitespace-nowrap text-[clamp(12px,0.8333vw,16px)] leading-[1.2] ${
          strong
            ? "font-semibold text-[var(--mypage-olive)]"
            : "font-semibold text-[#748190]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TripEmptyPanel({ message }: { message: string }) {
  return (
    <div className="grid min-h-[clamp(300px,20.8333vw,400px)] place-items-center">
      <NuvioEmptyState
        className="min-h-0 bg-transparent"
        compact
        iconClassName="h-[clamp(34px,2.3611vw,45.333px)] w-[clamp(30px,2.0833vw,40px)]"
        message={message}
        textClassName="mt-[clamp(12px,0.8333vw,16px)] text-[clamp(13px,0.9028vw,17.333px)] text-[#C7BDB5]"
      />
    </div>
  );
}

function ReadyNoticeToast({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(timer);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed left-1/2 top-[clamp(92px,6.3889vw,122.667px)] z-50 -translate-x-1/2 rounded-[clamp(6px,0.4167vw,8px)] border border-[var(--mypage-line)] bg-white px-[clamp(22px,1.5278vw,29.333px)] py-[clamp(13px,0.9028vw,17.333px)] text-[clamp(14px,0.9722vw,18.667px)] font-semibold text-[var(--mypage-brown)] shadow-[0_12px_30px_rgba(91,58,41,0.12)]">
      준비중인 기능입니다.
    </div>
  );
}

function NuvioAssetIcon({
  alt,
  name,
  size,
}: {
  alt: string;
  name: keyof typeof nuvioIconSources;
  size: number;
}) {
  const iconSize = `clamp(${size}px,${(size / 1440) * 100}vw,${size * 4 / 3}px)`;

  return (
    <Image
      alt={alt}
      height={Math.round(size * 1.333)}
      src={nuvioIconSources[name]}
      style={{
        height: iconSize,
        width: iconSize,
      }}
      width={Math.round(size * 1.333)}
    />
  );
}

function MiniCardPlaceholder({ animated = false }: { animated?: boolean }) {
  if (animated) {
    return (
      <article aria-busy="true" className="block min-w-0">
        <MypageSkeletonBlock className="aspect-square w-full rounded-[clamp(9px,0.625vw,12px)]" />
        <MypageSkeletonBlock className="mt-[clamp(11px,0.7639vw,14.667px)] h-[clamp(12px,0.8333vw,16px)] w-[58%]" />
        <MypageSkeletonBlock className="mt-[clamp(8px,0.5556vw,10.667px)] h-[clamp(18px,1.25vw,24px)] w-[88%]" />
        <MypageSkeletonBlock className="mt-[clamp(7px,0.4861vw,9.333px)] h-[clamp(14px,0.9722vw,18.667px)] w-[64%]" />
      </article>
    );
  }

  return (
    <article className="block min-w-0">
      <div
        className="aspect-square w-full rounded-[clamp(9px,0.625vw,12px)] bg-[#d9d9d9]"
      />
      <p className="mt-[clamp(11px,0.7639vw,14.667px)] text-[clamp(12px,0.8333vw,16px)] font-medium leading-none text-[var(--mypage-orange)]">
        여행예정 00/00
      </p>
      <p className="mt-[clamp(6px,0.4167vw,8px)] line-clamp-2 min-h-[clamp(46px,3.1944vw,61.333px)] text-[clamp(16px,1.1111vw,21.333px)] font-semibold leading-[1.42] text-[var(--mypage-brown)]">
        프로그램 제목 입력
      </p>
    </article>
  );
}

function MypageSkeletonBlock({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-[clamp(4px,0.2778vw,5.333px)] bg-[#E3E0DA] ${className ?? ""}`}
    />
  );
}

function TripMiniCard({
  application,
  loading,
  program,
}: {
  application?: HostApplication;
  loading: boolean;
  program?: Program;
}) {
  if (!application && loading) {
    return (
      <MiniCardPlaceholder animated />
    );
  }

  if (!application) {
    return <MiniCardPlaceholder />;
  }

  const image = program?.image;
  const href = program ? programPath(program) : "/mypage/trips";

  return (
    <Link className="group block min-w-0" href={href}>
      <div className="relative aspect-square w-full overflow-hidden rounded-[clamp(9px,0.625vw,12px)] bg-[#d9d9d9]">
        {image ? (
          <Image
            alt={program?.title ?? formatProgramDisplayName(application.programTitle, application.programId)}
            className="object-cover transition duration-300 group-hover:scale-105"
            fill
            sizes="(min-width: 1920px) 360px, (min-width: 1024px) 18vw, (min-width: 640px) 45vw, 90vw"
            src={image}
          />
        ) : (
          <div className="grid h-full place-items-center text-[#c7bbb4]">
            <CalendarDays size={28} strokeWidth={1.6} />
          </div>
        )}
      </div>
      <p className="mt-[clamp(11px,0.7639vw,14.667px)] text-[clamp(12px,0.8333vw,16px)] font-medium text-[var(--mypage-orange)]">
        {tripStatusLabels[application.status]} {formatShortDate(application.submittedAt)}
      </p>
      <p className="mt-[clamp(4px,0.2778vw,5.333px)] line-clamp-2 min-h-[clamp(46px,3.1944vw,61.333px)] text-[clamp(16px,1.1111vw,21.333px)] font-semibold leading-[1.42] text-[var(--mypage-brown)] transition group-hover:text-[var(--mypage-orange)]">
        {program?.title ?? formatProgramDisplayName(application.programTitle, application.programId)}
      </p>
    </Link>
  );
}

function normalizeTelHref(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function TripDetailCard({
  actionHref,
  actionLabel,
  application,
  isBookmarked = false,
  onActionClick,
  program,
}: {
  actionHref?: string;
  actionLabel?: string;
  application: HostApplication;
  isBookmarked?: boolean;
  onActionClick?: () => void;
  program?: Program;
}) {
  const href = program ? programPath(program) : "/mypage/trips";
  const displayTitle =
    program?.title ?? formatProgramDisplayName(application.programTitle, application.programId);
  const people = application.answers?.participants;
  const peopleLabel =
    typeof people === "number"
      ? `${String(people).padStart(2, "0")}명`
      : typeof people === "string" && people.trim()
        ? people
        : "00명";
  const actionButtonClass = `inline-flex h-[clamp(28px,1.9444vw,37.333px)] min-h-11 min-w-[clamp(70px,4.8611vw,93.333px)] items-center justify-center rounded-[clamp(4px,0.2778vw,5.333px)] px-[clamp(14px,0.9722vw,18.667px)] text-[clamp(12px,0.8333vw,16px)] font-semibold text-white transition lg:min-h-0 ${
    actionLabel?.includes("보기")
      ? "bg-[var(--mypage-olive)] hover:bg-[#6E7F45]"
      : "bg-[#FF9A3D] hover:bg-[var(--mypage-orange)]"
  }`;
  const hostPhone = program?.phone?.trim() ?? "";
  const normalizedHostPhone = normalizeTelHref(hostPhone);
  const phoneHref = normalizedHostPhone ? `tel:${normalizedHostPhone}` : "";
  const messageSearchParams = new URLSearchParams();
  const programId = application.programId || program?.id;

  if (programId) {
    messageSearchParams.set("programId", String(programId));
  }

  messageSearchParams.set("applicationId", application.id);

  const messageHref = `/mypage/messages?${messageSearchParams.toString()}`;
  const quickActionClass =
    "grid size-11 place-items-center rounded-full transition hover:bg-[#FFF3EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mypage-orange)] disabled:cursor-not-allowed disabled:opacity-40 lg:size-[clamp(20px,1.3889vw,26.667px)]";

  return (
    <article className="grid border-b border-[var(--mypage-line)] py-[clamp(16px,1.1111vw,21.333px)] md:grid-cols-[clamp(84px,5.8333vw,112px)_minmax(0,1fr)_auto] md:items-start md:gap-[clamp(18px,1.25vw,24px)]">
      <Link
        className="relative aspect-square overflow-hidden rounded-[clamp(10px,0.6944vw,13.333px)] bg-[#d9d9d9]"
        href={href}
      >
        {program?.image ? (
          <Image
            alt={program.title}
            className="object-cover"
            fill
            sizes="clamp(92px,6.3889vw,122.667px)"
            src={program.image}
          />
        ) : (
          <span className="sr-only">{displayTitle}</span>
        )}
      </Link>
      <div className="grid min-w-0 gap-x-[clamp(16px,1.1111vw,21.333px)] gap-y-[clamp(10px,0.6944vw,13.333px)] md:w-[clamp(682px,47.3611vw,909.333px)] md:max-w-full md:grid-cols-[clamp(230px,15.9722vw,306.667px)_clamp(130px,9.0278vw,173.333px)_clamp(130px,9.0278vw,173.333px)_clamp(64px,4.4444vw,85.333px)_clamp(64px,4.4444vw,85.333px)] md:items-start">
        <div className="min-w-0">
          <p className="text-[clamp(10px,0.6944vw,13.333px)] font-medium leading-[1.2] text-[#748190]">
            프로그램 지역 위치
          </p>
          <Link
            className="mt-[clamp(4px,0.2778vw,5.333px)] block truncate whitespace-nowrap text-[clamp(16px,1.1111vw,21.333px)] font-semibold leading-[1.25] text-[var(--mypage-brown)] hover:text-[var(--mypage-orange)]"
            href={href}
          >
            {displayTitle}
          </Link>
          <p className="mt-[clamp(4px,0.2778vw,5.333px)] text-[clamp(11px,0.7639vw,14.667px)] font-medium text-[#8F7A6C]">
            {program?.sourceName || "호스트명"}
          </p>
        </div>
        <TripMeta
          label="시작일"
          value={program ? formatKoreanDateLabel(program.activityStart) : "0000년 00월 00일"}
        />
        <TripMeta
          label="종료일"
          value={program ? formatKoreanDateLabel(program.activityEnd) : "0000년 00월 00일"}
        />
        <TripMeta label="인원" value={peopleLabel} />
        <div className="text-right">
          <span
            className={`text-[clamp(17px,1.1806vw,22.667px)] font-semibold leading-[1.2] ${
              application.status === "rejected"
                ? "text-[#C7BDB5]"
                : application.status === "completed"
                  ? "text-[var(--mypage-olive)]"
                  : "text-[var(--mypage-orange)]"
            }`}
          >
            {application.status === "completed"
              ? "완료"
              : application.status === "rejected"
                ? "취소"
                : getProgramDday(program)}
          </span>
        </div>
        <div className="h-px bg-[#D9C8BD] md:col-start-1 md:col-end-6" />
        <div className="min-w-0">
          <TripMeta
            label="예약번호"
            strong
            value={formatApplicationDisplayCode(application.id, application.submittedAt)}
          />
          <div className="mt-[clamp(4px,0.2778vw,5.333px)] flex h-11 w-[132px] items-center justify-between lg:h-[clamp(20px,1.3889vw,26.667px)] lg:w-[clamp(87px,6.0417vw,116px)]">
            {phoneHref ? (
              <a
                aria-label={`${displayTitle} 전화 문의`}
                className={quickActionClass}
                href={phoneHref}
                title={`전화 문의 ${hostPhone}`}
              >
                <NuvioAssetIcon alt="" name="phone" size={12} />
              </a>
            ) : (
              <button
                aria-label="전화 문의 연락처 없음"
                className={quickActionClass}
                disabled
                title="전화 문의 연락처 없음"
                type="button"
              >
                <NuvioAssetIcon alt="" name="phone" size={12} />
              </button>
            )}
            <Link
              aria-label={`${displayTitle} 메시지 문의`}
              className={quickActionClass}
              href={messageHref}
              title="메시지 문의"
            >
              <NuvioAssetIcon alt="" name="messageOrange" size={12} />
            </Link>
            <Link
              aria-label={
                isBookmarked
                  ? "저장한 프로그램으로 이동"
                  : "저장하지 않은 프로그램입니다. 저장 목록으로 이동"
              }
              className={quickActionClass}
              href="/mypage/bookmarks"
              title={isBookmarked ? "저장됨" : "저장하지 않음"}
            >
              <NuvioAssetIcon
                alt=""
                name={isBookmarked ? "bookmarkFilled" : "bookmark"}
                size={12}
              />
            </Link>
          </div>
        </div>
        <TripMeta label="예약자 명" value={application.applicantName || "-"} />
        <TripMeta label="연락 번호" value={application.phone || "000-0000-0000"} />
      </div>
      {actionLabel ? (
        actionHref ? (
          <Link
            className={actionButtonClass}
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            className={actionButtonClass}
            onClick={onActionClick}
            type="button"
          >
            {actionLabel}
          </button>
        )
      ) : null}
    </article>
  );
}

function ProgramMiniCard({ program }: { program: Program }) {
  return (
    <Link className="group block min-w-0" href={programPath(program)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-[clamp(9px,0.625vw,12px)] bg-[#d9d9d9]">
        {program.image ? (
          <Image
            alt={program.title}
            className="object-cover transition duration-300 group-hover:scale-105"
            fill
            sizes="(min-width: 1920px) 360px, (min-width: 1024px) 18vw, (min-width: 640px) 45vw, 90vw"
            src={program.image}
          />
        ) : null}
      </div>
      <p className="mt-[clamp(11px,0.7639vw,14.667px)] text-[clamp(12px,0.8333vw,16px)] font-medium text-[#8F7A6C]">
        {program.region || program.city || "전국"} 여행
      </p>
      <p className="mt-[clamp(4px,0.2778vw,5.333px)] line-clamp-2 min-h-[clamp(46px,3.1944vw,61.333px)] text-[clamp(16px,1.1111vw,21.333px)] font-semibold leading-[1.42] text-[var(--mypage-brown)] transition group-hover:text-[var(--mypage-orange)]">
        {program.title}
      </p>
    </Link>
  );
}

function BookmarkProgramMiniCard({
  bookmarkedAt,
  program,
}: {
  bookmarkedAt: string | null;
  program: Program;
}) {
  return (
    <Link
      className="group block min-w-0"
      data-bookmarked-at={bookmarkedAt ?? undefined}
      href={programPath(program)}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[clamp(8px,0.5556vw,10.667px)] bg-[#d9d9d9]">
        {program.image ? (
          <Image
            alt={program.title}
            className="object-cover transition duration-300 ease-out group-hover:scale-105"
            fill
            sizes="(min-width: 1920px) 248px, (min-width: 1024px) 13vw, (min-width: 640px) 45vw, 90vw"
            src={program.image}
          />
        ) : null}
        <span className="absolute bottom-[clamp(9px,0.625vw,12px)] right-[clamp(9px,0.625vw,12px)] grid h-[clamp(18px,1.25vw,24px)] w-[clamp(18px,1.25vw,24px)] place-items-center">
          <Image
            alt=""
            height={24}
            src={nuvioIconSources.bookmarkFilled}
            width={24}
          />
        </span>
      </div>
      <p className="mt-[clamp(12px,0.8333vw,16px)] text-[clamp(12px,0.8333vw,16px)] font-medium leading-[1.2] text-[#748190]">
        {formatBookmarkProgramLocation(program)}
      </p>
      <p className="mt-[clamp(12px,0.8333vw,16px)] line-clamp-1 text-[clamp(16px,1.1111vw,21.333px)] font-semibold leading-[1.25] tracking-normal text-[var(--mypage-brown)]">
        {program.title || "프로그램 제목 입력"}
      </p>
      <p className="mt-[clamp(15px,1.0417vw,20px)] line-clamp-2 min-h-[clamp(38px,2.6389vw,50.667px)] text-[clamp(12px,0.8333vw,16px)] font-medium leading-[1.55] tracking-normal text-[#C7BDB5]">
        {program.summary || "프로그램 소개 간략한 작은글을 작성해 주세요."}
      </p>
      <p className="mt-[clamp(17px,1.1806vw,22.667px)] text-[clamp(12px,0.8333vw,16px)] font-semibold leading-[1.2] text-[#748190]">
        {program.sourceName || "호스트명"}
      </p>
    </Link>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article
      className="grid gap-3 rounded-[6px] border border-[#d9d9d9] px-5 py-5"
    >
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#8F7A6C]">
        <span>{review.date}</span>
        {review.badge ? <span>{review.badge}</span> : null}
      </div>
      <h2 className="text-[18px] font-semibold text-[#4B3328]">{review.title}</h2>
      <p className="line-clamp-2 text-[13px] leading-6 text-[#8F7A6C]">
        {review.excerpt}
      </p>
    </article>
  );
}

function EmptyState({
  actionHref,
  actionLabel,
  body,
  compact = false,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  body?: string;
  compact?: boolean;
  icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  title: string;
}) {
  return (
    <NuvioEmptyState
      actionHref={actionHref}
      actionLabel={actionLabel}
      className="rounded-[6px] border border-dashed border-[#d9d9d9] bg-white"
      compact={compact}
      description={body}
      message={title}
      textClassName="text-[16px] font-medium"
    />
  );
}

function RecentEmptyState() {
  return (
    <DashboardEmptyPanel
      actionHref="/"
      actionLabel="프로그램 찾아보기"
      message="아직 최근 본 프로그램이 없어요"
    />
  );
}

function DashboardEmptyPanel({
  actionHref,
  actionLabel,
  message,
}: {
  actionHref: string;
  actionLabel: string;
  message: string;
}) {
  return (
    <NuvioEmptyState
      actionHref={actionHref}
      actionLabel={actionLabel}
      className="min-h-[clamp(220px,15.2778vw,293.333px)] rounded-[clamp(6px,0.4167vw,8px)] border border-dashed border-[#d9d9d9] bg-white"
      iconClassName="h-[clamp(42px,2.9167vw,56px)] w-[clamp(37px,2.5694vw,49.333px)]"
      message={message}
      textClassName="mt-[clamp(14px,0.9722vw,18.667px)] text-[clamp(13px,0.9028vw,17.333px)] text-[#C7BDB5]"
    />
  );
}

function MemberLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[clamp(22px,1.5278vw,29.333px)] items-end whitespace-nowrap pb-[clamp(2px,0.1389vw,2.667px)] text-[clamp(14px,0.9722vw,18.667px)] font-semibold leading-none tracking-normal text-[#5A3829]">
      {children}
    </span>
  );
}

function MemberTextValue({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[clamp(22px,1.5278vw,29.333px)] min-w-0 items-end truncate border-b border-transparent px-0 pb-[clamp(3px,0.2083vw,4px)] text-[clamp(12px,0.8333vw,16px)] font-medium leading-none text-[#748190]">
      {children}
    </span>
  );
}

function MemberLineDisplay({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-[clamp(22px,1.5278vw,29.333px)] min-w-0 items-end truncate border-b border-transparent px-0 pb-[clamp(3px,0.2083vw,4px)] !text-[clamp(12px,0.8333vw,16px)] font-medium leading-none text-[#748190]">
      {children}
    </span>
  );
}

function MemberLineInput({
  inputRef,
  onChange,
  placeholder,
  value,
}: {
  inputRef?: Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <input
      className="h-[clamp(22px,1.5278vw,29.333px)] w-full min-w-0 border-0 border-b border-[#cfc7c0] bg-transparent px-0 pb-[clamp(3px,0.2083vw,4px)] !text-[clamp(12px,0.8333vw,16px)] font-medium leading-none text-[#4B3328] outline-none transition placeholder:text-[#8B98A6] focus:border-[#f7983a]"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      ref={inputRef}
      value={value}
    />
  );
}

function MemberLineSelect({
  ariaLabel,
  children,
  onChange,
  value,
}: {
  ariaLabel: string;
  children: ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className="h-[clamp(22px,1.5278vw,29.333px)] w-full min-w-0 border-0 border-b border-[#cfc7c0] bg-transparent px-0 pb-[clamp(3px,0.2083vw,4px)] !text-[clamp(12px,0.8333vw,16px)] font-medium leading-none text-[#4B3328] outline-none transition focus:border-[#f7983a]"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </select>
  );
}

function MemberSmallButton({
  children,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="h-[clamp(22px,1.5278vw,29.333px)] shrink-0 rounded-[clamp(3px,0.2083vw,4px)] border border-[#cfc7c0] px-[clamp(9px,0.625vw,12px)] !text-[clamp(11px,0.7639vw,14.667px)] font-semibold text-[#748190] transition hover:border-[#f7983a] hover:text-[#f7983a] disabled:cursor-not-allowed disabled:border-[#e2ddd8] disabled:text-[#c7bdb5] disabled:hover:border-[#e2ddd8] disabled:hover:text-[#c7bdb5]"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function MemberSmallLink({
  children,
  href,
  onClick,
}: {
  children: ReactNode;
  href: string;
  onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      className="inline-flex h-[clamp(22px,1.5278vw,29.333px)] shrink-0 items-center justify-center rounded-[clamp(3px,0.2083vw,4px)] border border-[#cfc7c0] px-[clamp(9px,0.625vw,12px)] !text-[clamp(11px,0.7639vw,14.667px)] font-semibold text-[#748190] transition hover:border-[#f7983a] hover:text-[#f7983a]"
      href={href}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[6px] border border-[#d9d9d9] px-5 py-4">
      <span className="text-[14px] font-semibold text-[#4B3328]">{label}</span>
      <span className="text-[13px] text-[#8F7A6C]">{value}</span>
    </div>
  );
}

function ListSkeleton({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <div
      className="h-[154px] animate-pulse rounded-[6px] border border-[#eeeeee] bg-[#f8f8f8]"
      key={index}
    />
  ));
}

function useMypageData(): MypageData {
  const [authSession, setAuthSession] = useState<AuthSessionPayload>({
    user: null,
    profile: null,
  });
  const [programState, setProgramState] =
    useState<ProgramStateMaps>(EMPTY_PROGRAM_STATE);
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [inquiries, setInquiries] = useState<HostInquiry[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [publicPrograms, setPublicPrograms] = useState<Program[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAccountData() {
      try {
        const [sessionResponse, programsResponse] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/programs", { cache: "no-store" }),
        ]);
        const sessionPayload =
          (await sessionResponse.json()) as AuthSessionResponse;
        const programPayload = (await programsResponse.json()) as {
          data?: Program[];
        };
        const nextSession = sessionPayload.data ?? {
          profile: null,
          user: null,
        };

        if (!active) return;

        setAuthSession(nextSession);
        setPublicPrograms(programPayload.data ?? []);

        if (!nextSession.user) {
          setApplications([]);
          setInquiries([]);
          setNotifications([]);
          setProgramState(EMPTY_PROGRAM_STATE);
          setReviews([]);
          return;
        }

        const [
          reviewsResponse,
          notificationsResponse,
          programStateResponse,
          applicationsResponse,
          inquiriesResponse,
        ] = await Promise.all([
          launchFeatureFlags.reviews
            ? fetch("/api/me/reviews", { cache: "no-store" })
            : Promise.resolve(undefined),
          fetch("/api/me/notifications", { cache: "no-store" }),
          fetch("/api/me/program-state", { cache: "no-store" }),
          fetch("/api/me/applications", { cache: "no-store" }),
          fetch("/api/me/inquiries", { cache: "no-store" }),
        ]);
        const reviewPayload =
          reviewsResponse?.ok
            ? ((await reviewsResponse.json().catch(() => ({ data: [] }))) as {
                data?: Review[];
              })
            : { data: [] };
        const notificationsPayload = (await notificationsResponse.json()) as {
          data?: UserNotification[];
        };
        const programStatePayload = (await programStateResponse.json()) as {
          data?: ProgramStateMaps;
        };
        const applicationPayload = (await applicationsResponse.json()) as {
          data?: HostApplication[];
        };
        const inquiryPayload = (await inquiriesResponse.json()) as {
          data?: HostInquiry[];
        };

        if (!active) return;

        setReviews(reviewPayload.data ?? []);
        setNotifications(notificationsPayload.data ?? []);
        setProgramState(programStatePayload.data ?? EMPTY_PROGRAM_STATE);
        setApplications(applicationPayload.data ?? []);
        setInquiries(inquiryPayload.data ?? []);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAccountData();

    return () => {
      active = false;
    };
  }, []);

  return {
    applications,
    authSession,
    inquiries,
    loading,
    notifications,
    programState,
    publicPrograms,
    reviews,
    signedIn: Boolean(authSession.user),
    updateProfile: (profile) =>
      setAuthSession((current) => ({
        ...current,
        profile,
      })),
  };
}

function useMypageContext(data: MypageData): MypageContext {
  const profileName =
    data.authSession.profile?.displayName ??
    getMetadataText(data.authSession.user?.userMetadata, "full_name") ??
    getMetadataText(data.authSession.user?.userMetadata, "name") ??
    "ㅇㅇ";
  const nickname = profileName === "ㅇㅇ" ? "닉네임" : profileName;

  const bookmarkedProgramItems = useMemo(
    () =>
      resolveProgramStateItems(
        data.programState.bookmarks,
        data.publicPrograms,
        data.programState.bookmarkDetails ?? {},
      ),
    [
      data.programState.bookmarkDetails,
      data.programState.bookmarks,
      data.publicPrograms,
    ],
  );
  const bookmarkedPrograms = useMemo(
    () => bookmarkedProgramItems.map((item) => item.program),
    [bookmarkedProgramItems],
  );
  const recentlyViewedPrograms = useMemo(
    () => resolvePrograms(data.programState.tracks, data.publicPrograms),
    [data.programState.tracks, data.publicPrograms],
  );
  const visibleTrips = useMemo(
    () =>
      data.applications
        .filter((application) => application.status !== "rejected")
        .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)),
    [data.applications],
  );

  return {
    ...data,
    bookmarkedProgramItems,
    bookmarkedPrograms,
    nickname,
    profileName,
    recentlyViewedPrograms,
    reviewCount: launchFeatureFlags.reviews
      ? data.applications.filter((application) => application.reviewSubmitted).length
      : 0,
    unreadMessageCount: data.notifications.filter((item) => !item.readAt).length,
    visibleTrips,
  };
}

function resolvePrograms(state: StateMap, publicPrograms: Program[]): Program[] {
  return resolveProgramStateItems(state, publicPrograms).map((item) => item.program);
}

function resolveProgramStateItems(
  state: StateMap,
  publicPrograms: Program[],
  details: Record<string, BookmarkStateDetail> = {},
): BookmarkedProgramItem[] {
  const seen = new Set<string>();
  return Object.keys(state)
    .filter((id) => state[id])
    .map((id) => {
      const program = findProgramByStateKey(id, publicPrograms);
      if (!program) return undefined;

      const identity = getProgramIdentity(program);
      if (seen.has(identity)) return undefined;
      seen.add(identity);

      return {
        bookmarkedAt:
          details[id]?.bookmarkedAt ?? details[id]?.updatedAt ?? details[id]?.createdAt ?? null,
        program,
      };
    })
    .filter((item): item is BookmarkedProgramItem => Boolean(item));
}

function findProgramByStateKey(
  id: string,
  publicPrograms: Program[],
): Program | undefined {
  const program = publicPrograms.find(
    (item) => String(item.id) === id || item.slug === id,
  );
  if (program) return program;

  const numericId = Number(id);
  return Number.isInteger(numericId) ? getProgramById(numericId) : undefined;
}

function getProgramIdentity(program: Program): string {
  return program.slug || String(program.id);
}

function isProgramBookmarked(
  program: Program | undefined,
  bookmarkedPrograms: Program[],
) {
  if (!program) return false;

  const identity = getProgramIdentity(program);
  return bookmarkedPrograms.some(
    (bookmarkedProgram) =>
      getProgramIdentity(bookmarkedProgram) === identity ||
      String(bookmarkedProgram.id) === String(program.id) ||
      bookmarkedProgram.slug === program.slug,
  );
}

function parseDateSortValue(value: string | null | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatBookmarkProgramLocation(program: Program): string {
  const location = [program.region, program.city]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(" ");
  return location ? `${location} 여행` : "프로그램 지역 위치";
}

function findProgramForApplication(
  application: HostApplication,
  programs: Program[],
): Program | undefined {
  return programs.find(
    (program) =>
      String(program.id) === application.programId ||
      program.slug === application.programId ||
      program.title === application.programTitle,
  );
}

function findApplicationForReview(
  review: Review,
  applications: HostApplication[],
): HostApplication | undefined {
  return applications.find(
    (application) =>
      application.id === review.applicationId ||
      application.programId === review.programUuid ||
      application.programId === review.programSlug ||
      application.programTitle === review.programTitle,
  );
}

function findProgramForReview(
  review: Review,
  application: HostApplication | undefined,
  programs: Program[],
): Program | undefined {
  if (application) {
    const program = findProgramForApplication(application, programs);
    if (program) return program;
  }

  return programs.find(
    (program) =>
      String(program.id) === String(review.programId) ||
      program.id === review.programUuid ||
      program.slug === review.programSlug ||
      program.title === review.programTitle,
  );
}

function formatReviewProgramLocation(program: Program | undefined): string {
  if (!program) return "프로그램 지역 위치";
  return [program.region, program.city]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(" ") || "프로그램 지역 위치";
}

function formatReviewDisplayDate(value: string | undefined): string {
  if (!value) return "-";
  return formatDate(value);
}

function getMetadataText(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getMetadataTextArray(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string[] {
  const value = metadata?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getPrimaryAuthProvider(
  metadata: Record<string, unknown> | undefined,
): string {
  return (
    getMetadataText(metadata, "provider") ??
    getMetadataTextArray(metadata, "providers")[0] ??
    "email"
  );
}

function isPasswordAuthProvider(
  metadata: Record<string, unknown> | undefined,
): boolean {
  const providers = getMetadataTextArray(metadata, "providers");
  const provider = getPrimaryAuthProvider(metadata);
  return provider === "email" || providers.includes("email");
}

function getAuthProviderLabel(provider: string): string {
  if (provider === "google") return "Google";
  if (provider === "kakao") return "Kakao";
  if (provider === "naver") return "Naver";
  return "이메일";
}

function getInitial(name: string) {
  return name.trim().slice(0, 1) || "누";
}

function normalizeNicknameForCheck(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function splitEmailAddress(email: string) {
  const [id = "", ...domainParts] = email.split("@");
  return {
    domain: domainParts.join("@"),
    id,
  };
}

function isKnownEmailDomain(domain: string) {
  return EMAIL_DOMAIN_OPTIONS.includes(
    domain as (typeof EMAIL_DOMAIN_OPTIONS)[number],
  );
}

function composeEmailAddress(id: string, domain: string) {
  const trimmedId = id.trim();
  const trimmedDomain = domain.trim();
  if (!trimmedId || !trimmedDomain) return trimmedId || trimmedDomain;
  return `${trimmedId}@${trimmedDomain}`;
}

function genderLabel(gender: string) {
  if (gender === "female") return "여성";
  if (gender === "male") return "남성";
  return "선택 안 함";
}

function formatBirthDate(year: string, month: string, day: string) {
  if (!year || !month || !day) return "";
  return [year ? `${year}년` : "", month ? `${month}월` : "", day ? `${day}일` : ""]
    .filter(Boolean)
    .join(" ");
}

function splitBirthDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { day: "", month: "", year: "" };
  }

  const [year, month, day] = value.split("-");
  return {
    day: String(Number(day)),
    month: String(Number(month)),
    year,
  };
}

function composeBirthDate(year: string, month: string, day: string) {
  if (!year || !month || !day) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function loadKakaoPostcodeScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 주소 검색을 사용할 수 있습니다."));
  }

  if (getKakaoPostcodeConstructor()) {
    return Promise.resolve();
  }

  if (!kakaoPostcodeScriptPromise) {
    kakaoPostcodeScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-kakao-postcode="true"], script[src*="/postcode/prod/postcode.v2.js"]',
      );

      if (existingScript) {
        if (existingScript.dataset.loaded === "true") {
          waitForKakaoPostcodeConstructor().then(resolve).catch(reject);
          return;
        }

        existingScript.addEventListener(
          "load",
          () => waitForKakaoPostcodeConstructor().then(resolve).catch(reject),
          { once: true },
        );
        existingScript.addEventListener(
          "error",
          () => {
            kakaoPostcodeScriptPromise = null;
            reject(new Error("주소 검색 서비스를 불러오지 못했어요."));
          },
          { once: true },
        );
        return;
      }

      const tryLoad = (sources: string[], index = 0) => {
        const source = sources[index];
        if (!source) {
          kakaoPostcodeScriptPromise = null;
          reject(new Error("주소 검색 서비스를 불러오지 못했어요."));
          return;
        }

        const script = document.createElement("script");
        const timer = window.setTimeout(() => {
          script.remove();
          tryLoad(sources, index + 1);
        }, 5000);

        script.async = true;
        script.dataset.kakaoPostcode = "true";
        script.src = source;
        script.onload = () => {
          window.clearTimeout(timer);
          script.dataset.loaded = "true";
          waitForKakaoPostcodeConstructor().then(resolve).catch(() => {
            script.remove();
            tryLoad(sources, index + 1);
          });
        };
        script.onerror = () => {
          window.clearTimeout(timer);
          script.remove();
          tryLoad(sources, index + 1);
        };
        document.head.appendChild(script);
      };

      tryLoad([KAKAO_POSTCODE_SCRIPT_SRC, DAUM_POSTCODE_SCRIPT_SRC]);
    });
  }

  return kakaoPostcodeScriptPromise;
}

function getKakaoPostcodeConstructor() {
  return window.kakao?.Postcode ?? window.daum?.Postcode;
}

function waitForKakaoPostcodeConstructor(timeoutMs = 3000) {
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();

    const checkReady = () => {
      if (getKakaoPostcodeConstructor()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("주소 검색 서비스를 불러오지 못했어요."));
        return;
      }

      window.setTimeout(checkReady, 50);
    };

    checkReady();
  });
}

function getSelectedKakaoAddress(data: KakaoPostcodeData) {
  const baseAddress =
    data.userSelectedType === "R"
      ? data.roadAddress || data.address
      : data.jibunAddress || data.address;

  if (data.userSelectedType !== "R") {
    return baseAddress;
  }

  const extraParts = [
    data.bname && /[동로가]$/.test(data.bname) ? data.bname : "",
    data.buildingName && data.apartment === "Y" ? data.buildingName : "",
  ].filter(Boolean);

  return extraParts.length > 0
    ? `${baseAddress} (${extraParts.join(", ")})`
    : baseAddress;
}

function getBirthDayOptions(year: string, month: string) {
  const dayCount =
    year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  return Array.from({ length: dayCount }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );
}

function normalizeBirthDay(year: string, month: string, day: string) {
  if (!day) return "";
  const maxDay = getBirthDayOptions(year, month).at(-1) ?? "31";
  return Number(day) > Number(maxDay) ? "" : day;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "00/00";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatMessageDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0000. 00. 00";
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}. ${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatKoreanDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0000년 00월 00일";
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}월 ${String(date.getDate()).padStart(2, "0")}일`;
}

function formatMessageRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / minute))}분전`;
  }
  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}시간전`;
  }
  if (diffMs < day * 30) {
    return `${Math.floor(diffMs / day)}일전`;
  }

  return formatDate(value);
}

function getProgramDday(program: Program | undefined) {
  if (!program?.activityStart) return "D-00";

  const today = new Date();
  const start = new Date(program.activityStart);
  if (Number.isNaN(start.getTime())) return "D-00";

  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const diff = Math.ceil((start.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : "진행중";
}
