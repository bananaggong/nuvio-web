"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  CalendarDays,
  ChevronRight,
  Gift,
  LogOut,
  MessageCircle,
  Settings,
  Star,
  Ticket,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  type Ref,
  type ReactNode,
} from "react";
import { getProgramById } from "@/lib/data";
import type { HostApplication } from "@/lib/host-operations";
import { programPath } from "@/lib/program-routing";
import type { Program, Review } from "@/lib/types";

type AuthProfile = {
  id: string;
  email: string;
  fullName: string | null;
  displayName: string | null;
  loginId: string | null;
  role: "user" | "partner" | "admin";
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

type ProgramStateMaps = {
  alerts: StateMap;
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
  loading: boolean;
  notifications: UserNotification[];
  programState: ProgramStateMaps;
  publicPrograms: Program[];
  reviews: Review[];
  signedIn: boolean;
  updateProfile: (profile: AuthProfile) => void;
};

type MypageContext = MypageData & {
  bookmarkedPrograms: Program[];
  nickname: string;
  profileName: string;
  recentlyViewedPrograms: Program[];
  reviewCount: number;
  unreadMessageCount: number;
  visibleTrips: HostApplication[];
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
  | "settings";

const DEFAULT_MEMBER_EMAIL = "rhkd3539@naver.com";
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
  bookmarks: {},
  tracks: {},
};

const tripStatusLabels: Record<HostApplication["status"], string> = {
  accepted: "여행예정",
  checkedIn: "여행중",
  completed: "여행완료",
  rejected: "취소됨",
  screening: "검토중",
  submitted: "신청완료",
};

const sideMenuItems: Array<{
  href: string;
  icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  label: string;
  section: MypageSection;
}> = [
  {
    href: "/mypage/trips",
    label: "내 여행 프로그램",
    icon: CalendarDays,
    section: "trips",
  },
  { href: "/mypage/reviews", label: "후기", icon: Star, section: "reviews" },
  {
    href: "/mypage/bookmarks",
    label: "저장",
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
      {(context) => <ReviewsContent context={context} />}
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
  return (
    <MypageFrame activeSection="messages">
      {(context) => <MessagesContent context={context} />}
    </MypageFrame>
  );
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
      {() => <SettingsContent />}
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

  return (
    <div className="font-pretendard min-h-screen bg-white text-[#4B3328]">
      <main className="mx-auto w-full px-5 pb-24 pt-[clamp(44px,5.694vw,82px)] lg:w-[75vw] lg:max-w-[1440px] lg:px-0">
        {showOverview ? <MypageOverview context={context} /> : null}

        <div
          className={
            showOverview
              ? "mt-[20px] grid gap-10 lg:grid-cols-[80px_minmax(0,1fr)] lg:gap-[50px]"
              : "grid gap-10 lg:grid-cols-[80px_minmax(0,1fr)] lg:gap-[50px]"
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
        <h1 className="text-[24px] font-semibold leading-tight tracking-normal text-[#4B3328]">
          {context.profileName} 누비어님, 안녕하세요.
        </h1>
        <Link
          className="inline-flex h-[30px] w-fit items-center justify-center rounded-[4px] border border-[#d9d9d9] px-4 text-[12px] font-medium text-[#6B5145] transition hover:border-[#ffa143] hover:text-[#f7983a]"
          href={context.signedIn ? "/mypage/member-information" : "/login"}
        >
          회원 정보 수정하기
        </Link>
      </header>

      <section className="mt-[32px] grid gap-4 lg:grid-cols-[minmax(0,1fr)_286px]">
        <ProfileSummaryCard
          avatarUrl={context.authSession.profile?.avatarUrl}
          bookmarkCount={context.bookmarkedPrograms.length}
          messageCount={context.unreadMessageCount}
          nickname={context.nickname}
          reviewCount={context.reviewCount}
          tripCount={context.visibleTrips.length}
        />
        <WalletSummaryCard couponCount={0} pointCount={0} />
      </section>
    </>
  );
}

function MypageHomeContent({ context }: { context: MypageContext }) {
  const tripSlots = Array.from({ length: 4 }, (_, index) => {
    const application = context.visibleTrips[index];
    return {
      application,
      program: application
        ? findProgramForApplication(application, context.publicPrograms)
        : undefined,
    };
  });

  return (
    <>
      <DashboardSection heading="내 여행 프로그램" href="/mypage/trips">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tripSlots.map((slot, index) => (
            <TripMiniCard
              application={slot.application}
              key={slot.application?.id ?? `empty-trip-${index}`}
              loading={context.loading}
              program={slot.program}
            />
          ))}
        </div>
      </DashboardSection>

      <DashboardSection className="mt-[56px]" heading="최근 본 프로그램" href="/programs">
        {context.recentlyViewedPrograms.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
  const filteredApplications = context.applications.filter((application) => {
    if (tab === "planned") {
      return ["submitted", "screening", "accepted", "checkedIn"].includes(
        application.status,
      );
    }
    if (tab === "completed") return application.status === "completed";
    return application.status === "rejected";
  });

  return (
    <section>
      <PageTitle
        eyebrow="MY TRIP"
        title="내 여행 프로그램"
        trailing={`${context.applications.length}건`}
      />
      <SegmentedTabs
        active={tab}
        items={[
          { key: "planned", label: "예정된 여행" },
          { key: "completed", label: "여행완료" },
          { key: "cancelled", label: "취소된 여행" },
        ]}
        onChange={setTab}
      />
      <div className="mt-6 grid gap-4">
        {context.loading ? (
          <ListSkeleton count={3} />
        ) : filteredApplications.length > 0 ? (
          filteredApplications.map((application) => {
            const reviewAction =
              tab === "completed"
                ? getCompletedTripReviewAction(application)
                : undefined;

            return (
              <TripDetailCard
                actionHref={reviewAction?.href}
                actionLabel={reviewAction?.label}
                application={application}
                key={application.id}
                program={findProgramForApplication(application, context.publicPrograms)}
              />
            );
          })
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="마음에 드는 프로그램을 찾아보세요"
            actionHref="/programs"
            actionLabel="프로그램 찾아보기"
          />
        )}
      </div>
    </section>
  );
}

function getCompletedTripReviewAction(application: HostApplication) {
  return application.reviewSubmitted
    ? { href: "/mypage/reviews", label: "후기 보기" }
    : { href: "/reviews/new", label: "후기 작성하기" };
}

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
  const profileName = context.profileName;
  const matchedReviews = context.reviews.filter(
    (review) => review.author === profileName || review.author === context.nickname,
  );

  return (
    <section>
      <PageTitle eyebrow="REVIEW" title="후기" trailing={`${writtenTrips.length}건`} />
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
                actionHref="/reviews/new"
                actionLabel="후기 작성하기"
                application={application}
                key={application.id}
                program={findProgramForApplication(application, context.publicPrograms)}
              />
            ))
          ) : (
            <EmptyState
              icon={Star}
              title="여행을 마치면 후기를 작성할 수 있어요"
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
          <EmptyState icon={Star} title="후기를 쓰면 이곳에서 다시 볼 수 있어요" />
        )}
      </div>
    </section>
  );
}

function BookmarksContent({ context }: { context: MypageContext }) {
  const [filter, setFilter] = useState<"all" | "open" | "upcoming">("all");
  const visibleSavedPrograms = context.bookmarkedPrograms.filter(
    (program) => program.status !== "closed" && program.status !== "earlyClosed",
  );
  const filteredPrograms = visibleSavedPrograms.filter((program) => {
    if (filter === "open") return program.status === "open";
    if (filter === "upcoming") return program.status === "upcoming";
    return true;
  });

  return (
    <section>
      <PageTitle
        eyebrow="BOOKMARK"
        title="저장"
        trailing={`${visibleSavedPrograms.length}개`}
      />
      <SegmentedTabs
        active={filter}
        items={[
          { key: "all", label: "전체" },
          { key: "open", label: "신청 가능" },
          { key: "upcoming", label: "오픈 예정" },
        ]}
        onChange={setFilter}
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {context.loading ? (
          <CardSkeleton count={3} />
        ) : filteredPrograms.length > 0 ? (
          filteredPrograms.map((program) => (
            <ProgramWideCard key={program.id} program={program} />
          ))
        ) : (
          <div className="sm:col-span-2 xl:col-span-3">
            <EmptyState
              icon={Bookmark}
              title="관심 있는 프로그램을 지금 저장해보세요"
              actionHref="/programs"
              actionLabel="프로그램 찾아보기"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function MessagesContent({ context }: { context: MypageContext }) {
  return (
    <section>
      <PageTitle
        eyebrow="MESSAGE"
        title="메시지함"
        trailing={`${context.notifications.length}개`}
      />
      <div className="mt-6 grid gap-3">
        {context.notifications.length > 0 ? (
          context.notifications.map((notification) => (
            <Link
              className="grid gap-1 rounded-[6px] border border-[#d9d9d9] px-5 py-4 text-[#4B3328] transition hover:border-[#f7983a]"
              href={notification.href || "/mypage/messages"}
              key={notification.id}
            >
              <span className="text-[15px] font-semibold">{notification.title}</span>
              <span className="text-[13px] leading-6 text-[#8F7A6C]">
                {notification.body}
              </span>
              <span className="text-[12px] text-[#b6a79f]">
                {formatDateTime(notification.createdAt)}
              </span>
            </Link>
          ))
        ) : (
          <EmptyState icon={MessageCircle} title="새 메시지가 오면 이곳에서 확인할 수 있어요" />
        )}
      </div>
    </section>
  );
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
  const initialEmail = profile?.contactEmail || accountEmail || DEFAULT_MEMBER_EMAIL;
  const initialEmailParts = splitEmailAddress(initialEmail);
  const initialBirthDateParts = splitBirthDate(profile?.birthDate);
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
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
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
  const addressSearchLayerRef = useRef<HTMLDivElement>(null);
  const detailAddressInputRef = useRef<HTMLInputElement>(null);
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
          oncomplete: (data) => {
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

  async function saveProfile() {
    if (!context.signedIn) {
      window.location.href = "/login?next=/mypage/member-information";
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

      context.updateProfile(updatedProfile);
      setForm((current) => ({
        ...current,
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
      }));
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
      <section className="w-full pt-2 lg:min-h-[620px]">
        <div className="w-full max-w-[1080px]">
          <div className="mb-[34px] pl-[144px] max-md:pl-0">
            <button
              aria-label="프로필 이미지 변경"
              className="relative block size-[86px] rounded-full bg-[#d9d9d9] bg-cover bg-center !text-[18px] font-semibold text-white"
              onClick={() => setStatus("프로필 이미지 업로드는 다음 단계에서 연결할게요.")}
              style={
                form.avatarUrl ? { backgroundImage: `url(${form.avatarUrl})` } : undefined
              }
              type="button"
            >
              {form.avatarUrl ? null : getInitial(context.nickname)}
              <span
                aria-hidden="true"
                className="absolute bottom-[3px] right-[3px] grid size-[18px] place-items-center rounded-full bg-[#ff7a1a] !text-[13px] leading-none text-white"
              >
                +
              </span>
            </button>
          </div>

          {editMode ? (
            <>
              <div className="grid gap-y-[26px]">
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-[58px_minmax(150px,1fr)_70px_minmax(190px,1.2fr)_50px_132px] md:items-center xl:grid-cols-[64px_minmax(190px,1fr)_76px_minmax(230px,1.2fr)_56px_150px]">
            <MemberLabel>이름</MemberLabel>
            <MemberLineInput
              onChange={(value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="실명을 입력하세요"
              value={form.name}
            />
            <MemberLabel>닉네임</MemberLabel>
            <div className="flex min-w-0 items-center gap-3">
              <MemberLineInput
                onChange={(value) =>
                  setForm((current) => ({ ...current, nickname: value }))
                }
                placeholder="닉네임을 입력하세요"
                value={form.nickname}
              />
              <MemberSmallButton onClick={() => setStatus("사용 가능한 닉네임입니다.")}>
                중복확인
              </MemberSmallButton>
            </div>
            <MemberLabel>성별</MemberLabel>
            <div className="flex items-center gap-[5px]">
              {(["female", "male", "neutral"] as const).map((gender) => (
                <button
                  className={`h-[32px] rounded-[4px] px-[11px] !text-[13px] font-medium transition ${
                    form.gender === gender
                      ? "bg-[#ff8a2a] text-white"
                      : "bg-[#f1f1f1] text-[#b5aaa4]"
                  }`}
                  key={gender}
                  onClick={() => setForm((current) => ({ ...current, gender }))}
                  type="button"
                >
                  {gender === "female" ? "여성" : gender === "male" ? "남성" : "중성"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-4 md:grid-cols-[58px_minmax(220px,1fr)_76px_minmax(180px,1.2fr)] md:items-center xl:grid-cols-[64px_minmax(260px,1fr)_86px_minmax(220px,1.2fr)]">
            <MemberLabel>아이디</MemberLabel>
            {isPasswordManagedAccount ? (
              <div className="flex min-w-0 items-center gap-3">
                <MemberLineInput
                  onChange={(value) =>
                    setForm((current) => ({ ...current, loginId: value }))
                  }
                  placeholder="아이디를 입력하세요"
                  value={form.loginId}
                />
                <MemberSmallButton onClick={() => setStatus("사용 가능한 아이디입니다.")}>
                  중복확인
                </MemberSmallButton>
              </div>
            ) : (
              <MemberLineDisplay>{socialProviderLabel} 로그인 계정</MemberLineDisplay>
            )}
            <MemberLabel>비밀번호</MemberLabel>
            {isPasswordManagedAccount ? (
              <button
                className="w-fit text-left text-[14px] font-medium text-[#76838f] underline underline-offset-2 transition hover:text-[#f7983a]"
                onClick={() => setStatus("비밀번호 변경은 인증 화면과 함께 연결할게요.")}
                type="button"
              >
                변경하기
              </button>
            ) : (
              <MemberLineDisplay>소셜 계정에서 관리</MemberLineDisplay>
            )}
          </div>

          <div className="grid gap-x-6 gap-y-4 md:grid-cols-[58px_minmax(360px,1.35fr)_76px_minmax(220px,0.8fr)] md:items-center xl:grid-cols-[64px_minmax(440px,1.35fr)_86px_minmax(260px,0.8fr)]">
            <MemberLabel>이메일</MemberLabel>
            <div className="grid min-w-0 grid-cols-[minmax(90px,0.9fr)_auto_minmax(120px,1fr)_132px] items-center gap-3">
              <MemberLineInput
                onChange={(value) =>
                  setForm((current) => ({ ...current, emailId: value }))
                }
                placeholder="이메일 아이디"
                value={form.emailId}
              />
              <span className="text-[14px] font-semibold text-[#8F7A6C]">@</span>
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
                placeholder="직접 입력"
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
            <MemberLabel>연락처</MemberLabel>
            <div className="flex min-w-0 items-center gap-3">
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

          <div className="grid gap-x-3 gap-y-4 md:grid-cols-[58px_minmax(260px,320px)_86px_minmax(220px,300px)] md:items-center xl:grid-cols-[64px_minmax(300px,360px)_94px_minmax(240px,320px)]">
            <MemberLabel>주소</MemberLabel>
            <MemberLineInput
              onChange={(value) =>
                setForm((current) => ({ ...current, address: value }))
              }
              placeholder="주소를 검색하세요"
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
              placeholder="상세주소 입력"
              value={form.detailAddress}
            />
          </div>

          <div className="grid gap-x-6 gap-y-4 md:grid-cols-[58px_minmax(260px,1fr)] md:items-center xl:grid-cols-[64px_minmax(320px,1fr)]">
            <MemberLabel>생년월일</MemberLabel>
            <div className="grid max-w-[340px] grid-cols-[minmax(112px,1fr)_minmax(82px,0.7fr)_minmax(82px,0.7fr)] gap-4">
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

          <div className="mt-[18px] grid gap-x-6 gap-y-4 md:grid-cols-[58px_minmax(260px,340px)] md:items-center xl:grid-cols-[64px_minmax(300px,380px)]">
            <MemberLabel>결제정보</MemberLabel>
            <MemberLineInput
              onChange={(value) =>
                setForm((current) => ({ ...current, paymentMethod: value }))
              }
              placeholder="결제수단"
              value={form.paymentMethod}
            />
          </div>

          <div className="grid gap-x-4 gap-y-4 md:grid-cols-[58px_minmax(150px,180px)_minmax(240px,320px)] md:items-center xl:grid-cols-[64px_minmax(170px,200px)_minmax(280px,360px)]">
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
              placeholder="계좌번호를 입력하세요"
              value={form.refundAccount}
            />
          </div>
        </div>

        <div className="mt-[78px] flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <p className="min-h-5 text-right text-[13px] text-[#8F7A6C] md:mr-4">
            {status}
          </p>
          <button
            className="h-[42px] w-[112px] rounded-[4px] bg-[#ff6f1a] !text-[14px] font-semibold text-white transition hover:bg-[#f05f0d] disabled:opacity-50 max-md:w-full"
            disabled={saving}
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
      <div className="grid gap-y-[24px]">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[64px_minmax(210px,1fr)_76px_minmax(250px,1.2fr)_56px_150px] md:items-center">
          <MemberLabel>이름</MemberLabel>
          <MemberTextValue>{form.name || "-"}</MemberTextValue>
          <MemberLabel>닉네임</MemberLabel>
          <MemberTextValue>{form.nickname || "-"}</MemberTextValue>
          <MemberLabel>성별</MemberLabel>
          <MemberTextValue>{genderLabel(form.gender)}</MemberTextValue>
        </div>

        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[64px_minmax(260px,1fr)_86px_minmax(220px,1.2fr)] md:items-center">
          <MemberLabel>아이디</MemberLabel>
          <MemberTextValue>
            {isPasswordManagedAccount
              ? form.loginId || "-"
              : `${socialProviderLabel} 로그인 계정`}
          </MemberTextValue>
          <MemberLabel>비밀번호</MemberLabel>
          <MemberTextValue>
            {isPasswordManagedAccount ? "변경하기" : "소셜 계정에서 관리"}
          </MemberTextValue>
        </div>

        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[64px_minmax(440px,1.35fr)_86px_minmax(260px,0.8fr)] md:items-center">
          <MemberLabel>이메일</MemberLabel>
          <MemberTextValue>{email || "-"}</MemberTextValue>
          <MemberLabel>연락처</MemberLabel>
          <MemberTextValue>{form.phone || "-"}</MemberTextValue>
        </div>

        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[64px_minmax(760px,1fr)] md:items-center">
          <MemberLabel>주소</MemberLabel>
          <MemberTextValue>{fullAddress || "-"}</MemberTextValue>
        </div>

        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[64px_minmax(320px,1fr)] md:items-center">
          <MemberLabel>생년월일</MemberLabel>
          <MemberTextValue>{birthDate || "-"}</MemberTextValue>
        </div>

        <div className="mt-[18px] grid gap-x-6 gap-y-4 md:grid-cols-[64px_minmax(520px,1fr)] md:items-center">
          <MemberLabel>결제정보</MemberLabel>
          <MemberTextValue>{form.paymentMethod || "-"}</MemberTextValue>
        </div>

        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[64px_minmax(700px,1fr)] md:items-center">
          <MemberLabel>환불계좌</MemberLabel>
          <MemberTextValue>{refundAccount || "-"}</MemberTextValue>
        </div>
      </div>

      <div className="mt-[78px] flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
        <p className="min-h-5 text-right text-[13px] text-[#8F7A6C] md:mr-4">
          {status}
        </p>
        <Link
          className="inline-flex h-[42px] w-[136px] items-center justify-center rounded-[4px] bg-[#ff6f1a] !text-[14px] font-semibold text-white transition hover:bg-[#f05f0d]"
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
      <PageTitle eyebrow="POINT" title="포인트" trailing="0 P" />
      <div className="mt-6 rounded-[6px] border border-[#d9d9d9] px-5 py-6">
        <div className="flex items-center justify-between border-b border-[#d9d9d9] pb-5">
          <span className="text-[16px] font-semibold">보유 포인트</span>
          <span className="text-[24px] font-semibold text-[#f7983a]">0 P</span>
        </div>
        <div className="mt-6">
          <SectionHeader title="포인트 내역" />
          <EmptyState icon={WalletCards} title="포인트가 쌓이면 이곳에서 확인할 수 있어요" compact />
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
        <EmptyState icon={Ticket} title="쿠폰이 생기면 이곳에서 확인할 수 있어요" />
      </div>
    </section>
  );
}

function SettingsContent() {
  return (
    <section>
      <PageTitle eyebrow="SETTING" title="설정" />
      <div className="mt-6 grid gap-3">
        <SettingRow label="마케팅 수신 동의" value="미설정" />
        <SettingRow label="프로그램 알림" value="기본값" />
        <SettingRow label="계정 보안" value="소셜 로그인" />
      </div>
    </section>
  );
}

function ProfileSummaryCard({
  avatarUrl,
  bookmarkCount,
  messageCount,
  nickname,
  reviewCount,
  tripCount,
}: {
  avatarUrl?: string | null;
  bookmarkCount: number;
  messageCount: number;
  nickname: string;
  reviewCount: number;
  tripCount: number;
}) {
  return (
    <section className="rounded-[6px] border border-[#d9d9d9] bg-white px-6 py-6">
      <div className="flex flex-col gap-7 md:flex-row md:items-center">
        <div className="flex shrink-0 flex-col items-center gap-3 md:w-[90px]">
          <span
            aria-hidden="true"
            className="grid size-[54px] place-items-center rounded-full bg-[#d9d9d9] bg-cover bg-center text-[14px] font-semibold text-white"
            style={
              avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined
            }
          >
            {avatarUrl ? null : getInitial(nickname)}
          </span>
          <span className="max-w-[90px] truncate text-[13px] font-semibold text-[#4B3328]">
            {nickname}
          </span>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-y-5 sm:grid-cols-4">
          <SummaryMetric icon={CalendarDays} label="내 여행" value={tripCount} />
          <SummaryMetric icon={Bookmark} label="저장" value={bookmarkCount} />
          <SummaryMetric icon={Star} label="후기" value={reviewCount} />
          <SummaryMetric icon={MessageCircle} label="메시지" value={messageCount} />
        </div>
      </div>
    </section>
  );
}

function WalletSummaryCard({
  couponCount,
  pointCount,
}: {
  couponCount: number;
  pointCount: number;
}) {
  return (
    <section className="rounded-[6px] border border-[#d9d9d9] bg-white px-6 py-6">
      <div className="grid h-full min-h-[96px] content-center gap-5">
        <WalletLine label="포인트" unit="P" value={pointCount} />
        <div className="h-px bg-[#d9d9d9]" />
        <WalletLine label="쿠폰" unit="개" value={couponCount} />
      </div>
    </section>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Icon className="text-[#8B9F67]" size={20} strokeWidth={1.8} />
      <span className="text-[12px] font-medium text-[#6F7E56]">{label}</span>
      <span className="text-[13px] font-semibold text-[#4B3328]">{value}</span>
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
    <div className="flex items-center justify-between text-[16px] font-semibold text-[#4B3328]">
      <span>{label}</span>
      <span className="text-[#f7983a]">
        {value.toLocaleString("ko-KR")} <span className="text-[#4B3328]">{unit}</span>
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

  return (
    <aside className="flex gap-3 overflow-x-auto pb-2 lg:block lg:space-y-[13px] lg:overflow-visible lg:pb-0">
      {sideMenuItems.map((item) => (
        <SideMenuLink
          active={item.section === activeSection || pathname === item.href}
          href={item.href}
          icon={item.icon}
          key={item.label}
          label={item.label}
        />
      ))}
      <Link
        className="flex shrink-0 items-center gap-2 text-[14px] font-medium text-[#4B3328] transition hover:text-[#f7983a] lg:w-full"
        href="/support"
      >
        <Gift className="lg:hidden" size={16} strokeWidth={1.8} />
        고객센터
      </Link>
      <button
        className="flex shrink-0 items-center gap-2 text-left text-[14px] font-medium text-[#b6a79f] transition hover:text-[#f7983a] disabled:cursor-not-allowed disabled:text-[#d5cbc5] lg:w-full"
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
}: {
  active: boolean;
  href: string;
  icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <Link
      className={`flex shrink-0 items-center gap-2 text-[14px] font-medium transition lg:w-full ${
        active ? "text-[#f7983a]" : "text-[#4B3328] hover:text-[#f7983a]"
      }`}
      href={href}
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
      <div className="mb-[20px] grid grid-cols-[auto_minmax(24px,1fr)_auto] items-center gap-4">
        <h2 className="whitespace-nowrap text-[16px] font-semibold text-[#4B3328]">
          {heading}
        </h2>
        <span className="h-px bg-[#d9d9d9]" />
        <Link
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#8F7A6C] transition hover:text-[#f7983a]"
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
  eyebrow: string;
  title: string;
  trailing?: string;
}) {
  return (
    <header className="flex flex-col gap-2 border-b border-[#d9d9d9] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[12px] font-semibold text-[#f7983a]">{eyebrow}</p>
        <h1 className="mt-1 text-[24px] font-semibold text-[#4B3328]">{title}</h1>
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
          className={`h-9 rounded-full border px-4 text-[13px] font-semibold transition ${
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
      <article className="min-w-0">
        <div className="aspect-square w-full animate-pulse rounded-[16px] bg-[#f0f0f0]" />
        <div className="mt-3 h-3 w-20 rounded-full bg-[#eeeeee]" />
        <div className="mt-2 h-4 w-4/5 rounded-full bg-[#eeeeee]" />
      </article>
    );
  }

  if (!application) {
    return (
      <article className="min-w-0">
        <div className="aspect-square w-full rounded-[16px] bg-[#f3f3f3]" />
        <p className="mt-3 text-[12px] font-medium text-[#b4a59b]">
          여행예정 00/00
        </p>
        <p className="mt-1 line-clamp-2 min-h-[44px] text-[16px] font-semibold leading-[22px] text-[#c7bbb4]">
          마음에 드는 프로그램을 찾아보세요
        </p>
      </article>
    );
  }

  const image = program?.image;
  const href = program ? programPath(program) : "/mypage/trips";

  return (
    <Link className="group block min-w-0" href={href}>
      <div className="relative aspect-square w-full overflow-hidden rounded-[16px] bg-[#f3f3f3]">
        {image ? (
          <Image
            alt={program?.title ?? application.programTitle}
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
      <p className="mt-3 text-[12px] font-medium text-[#8F7A6C]">
        {tripStatusLabels[application.status]} {formatShortDate(application.submittedAt)}
      </p>
      <p className="mt-1 line-clamp-2 min-h-[44px] text-[16px] font-semibold leading-[22px] text-[#4B3328] transition group-hover:text-[#f7983a]">
        {program?.title ?? application.programTitle}
      </p>
    </Link>
  );
}

function TripDetailCard({
  actionHref,
  actionLabel,
  application,
  program,
}: {
  actionHref?: string;
  actionLabel?: string;
  application: HostApplication;
  program?: Program;
}) {
  const href = program ? programPath(program) : "/mypage/trips";

  return (
    <article className="grid gap-4 rounded-[6px] border border-[#d9d9d9] px-5 py-5 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-center">
      <Link
        className="relative aspect-square overflow-hidden rounded-[12px] bg-[#f3f3f3]"
        href={href}
      >
        {program?.image ? (
          <Image
            alt={program.title}
            className="object-cover"
            fill
            sizes="120px"
            src={program.image}
          />
        ) : (
          <div className="grid h-full place-items-center text-[#c7bbb4]">
            <CalendarDays size={28} strokeWidth={1.6} />
          </div>
        )}
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#fff7ef] px-3 py-1 text-[12px] font-semibold text-[#f7983a]">
            {tripStatusLabels[application.status]}
          </span>
          <span className="text-[12px] text-[#8F7A6C]">
            신청번호 {application.id}
          </span>
        </div>
        <Link
          className="mt-2 line-clamp-2 text-[18px] font-semibold leading-7 text-[#4B3328] hover:text-[#f7983a]"
          href={href}
        >
          {program?.title ?? application.programTitle}
        </Link>
        <div className="mt-3 grid gap-1 text-[13px] leading-6 text-[#8F7A6C] sm:grid-cols-2">
          <span>신청일 {formatDate(application.submittedAt)}</span>
          <span>누비어 {application.applicantName}</span>
          <span>지역 {program?.region ?? "-"}</span>
          <span>기간 {program ? formatProgramPeriod(program) : "-"}</span>
        </div>
      </div>
      {actionHref && actionLabel ? (
        <Link
          className="inline-flex h-10 items-center justify-center rounded-[4px] border border-[#d9d9d9] px-4 text-[13px] font-semibold text-[#4B3328] transition hover:border-[#f7983a] hover:text-[#f7983a]"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      ) : null}
    </article>
  );
}

function ProgramMiniCard({ program }: { program: Program }) {
  return (
    <Link className="group block min-w-0" href={programPath(program)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-[16px] bg-[#f3f3f3]">
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
      <p className="mt-3 text-[12px] font-medium text-[#8F7A6C]">
        {program.region || program.city || "전국"} 여행
      </p>
      <p className="mt-1 line-clamp-2 min-h-[44px] text-[16px] font-semibold leading-[22px] text-[#4B3328] transition group-hover:text-[#f7983a]">
        {program.title}
      </p>
    </Link>
  );
}

function ProgramWideCard({ program }: { program: Program }) {
  return (
    <Link
      className="group grid min-w-0 gap-4 rounded-[6px] border border-[#d9d9d9] p-4 transition hover:border-[#f7983a]"
      href={programPath(program)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-[#f3f3f3]">
        {program.image ? (
          <Image
            alt={program.title}
            className="object-cover transition duration-300 group-hover:scale-105"
            fill
            sizes="(min-width: 1280px) 24vw, (min-width: 640px) 45vw, 90vw"
            src={program.image}
          />
        ) : null}
      </div>
      <div>
        <p className="text-[12px] font-semibold text-[#f7983a]">
          {program.region || program.city || "전국"}
        </p>
        <h2 className="mt-1 line-clamp-2 min-h-[48px] text-[17px] font-semibold leading-6 text-[#4B3328]">
          {program.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-[#8F7A6C]">
          {program.summary}
        </p>
      </div>
    </Link>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <Link
      className="grid gap-3 rounded-[6px] border border-[#d9d9d9] px-5 py-5 transition hover:border-[#f7983a]"
      href={`/reviews/${review.id}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#8F7A6C]">
        <span>{review.date}</span>
        {review.badge ? <span>{review.badge}</span> : null}
      </div>
      <h2 className="text-[18px] font-semibold text-[#4B3328]">{review.title}</h2>
      <p className="line-clamp-2 text-[13px] leading-6 text-[#8F7A6C]">
        {review.excerpt}
      </p>
    </Link>
  );
}

function EmptyState({
  actionHref,
  actionLabel,
  body,
  compact = false,
  icon: Icon,
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
    <div
      className={`grid place-items-center rounded-[6px] border border-dashed border-[#d9d9d9] text-center ${
        compact ? "min-h-[180px] px-5 py-8" : "min-h-[260px] px-5 py-12"
      }`}
    >
      <div>
        <Icon className="mx-auto text-[#c7bbb4]" size={30} strokeWidth={1.6} />
        <p className="mt-4 text-[16px] font-semibold text-[#4B3328]">{title}</p>
        {body ? <p className="mt-2 text-[13px] text-[#8F7A6C]">{body}</p> : null}
        {actionHref && actionLabel ? (
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center rounded-[4px] border border-[#f7983a] px-4 text-[13px] font-semibold text-[#f7983a]"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function RecentEmptyState() {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-[6px] bg-white">
      <div className="text-center">
        <Image
          alt="누비오"
          className="mx-auto opacity-30"
          height={24}
          src="/brand/nuvio-wordmark.svg"
          width={82}
        />
        <p className="mt-5 text-[16px] font-medium text-[#8F7A6C]">
          관심 있는 프로그램을 둘러보세요
        </p>
      </div>
    </div>
  );
}

function MemberLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[16px] font-semibold tracking-normal text-[#5A3829]">
      {children}
    </span>
  );
}

function MemberTextValue({ children }: { children: ReactNode }) {
  return (
    <span className="min-h-[36px] border-b border-transparent px-1 py-[7px] text-[15px] font-medium leading-[22px] text-[#6B5145]">
      {children}
    </span>
  );
}

function MemberLineDisplay({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-[36px] min-w-0 items-center border-b border-transparent px-1 !text-[15px] font-medium text-[#76838f]">
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
      className="h-[36px] w-full min-w-0 border-0 border-b border-[#cfc7c0] bg-transparent px-1 !text-[15px] font-medium text-[#4B3328] outline-none transition placeholder:text-[#8B98A6] focus:border-[#f7983a]"
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
      className="h-[36px] w-full min-w-0 border-0 border-b border-[#cfc7c0] bg-transparent px-1 !text-[15px] font-medium text-[#4B3328] outline-none transition focus:border-[#f7983a]"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </select>
  );
}

function MemberSmallButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="h-[36px] shrink-0 rounded-[4px] border border-[#cfc7c0] px-[14px] !text-[13px] font-semibold text-[#748190] transition hover:border-[#f7983a] hover:text-[#f7983a]"
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
      className="inline-flex h-[36px] shrink-0 items-center justify-center rounded-[4px] border border-[#cfc7c0] px-[14px] !text-[13px] font-semibold text-[#748190] transition hover:border-[#f7983a] hover:text-[#f7983a]"
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

function CardSkeleton({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <div
      className="h-[300px] animate-pulse rounded-[6px] border border-[#eeeeee] bg-[#f8f8f8]"
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
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [publicPrograms, setPublicPrograms] = useState<Program[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAccountData() {
      try {
        const [sessionResponse, programsResponse, reviewsResponse] =
          await Promise.all([
            fetch("/api/auth/session", { cache: "no-store" }),
            fetch("/api/programs", { cache: "no-store" }),
            fetch("/api/reviews", { cache: "no-store" }),
          ]);
        const sessionPayload =
          (await sessionResponse.json()) as AuthSessionResponse;
        const programPayload = (await programsResponse.json()) as {
          data?: Program[];
        };
        const reviewPayload = (await reviewsResponse.json()) as {
          data?: Review[];
        };
        const nextSession = sessionPayload.data ?? {
          profile: null,
          user: null,
        };

        if (!active) return;

        setAuthSession(nextSession);
        setPublicPrograms(programPayload.data ?? []);
        setReviews(reviewPayload.data ?? []);

        if (!nextSession.user) {
          setApplications([]);
          setNotifications([]);
          setProgramState(EMPTY_PROGRAM_STATE);
          return;
        }

        const [
          notificationsResponse,
          programStateResponse,
          applicationsResponse,
        ] = await Promise.all([
          fetch("/api/me/notifications", { cache: "no-store" }),
          fetch("/api/me/program-state", { cache: "no-store" }),
          fetch("/api/me/applications", { cache: "no-store" }),
        ]);
        const notificationsPayload = (await notificationsResponse.json()) as {
          data?: UserNotification[];
        };
        const programStatePayload = (await programStateResponse.json()) as {
          data?: ProgramStateMaps;
        };
        const applicationPayload = (await applicationsResponse.json()) as {
          data?: HostApplication[];
        };

        if (!active) return;

        setNotifications(notificationsPayload.data ?? []);
        setProgramState(programStatePayload.data ?? EMPTY_PROGRAM_STATE);
        setApplications(applicationPayload.data ?? []);
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

  const bookmarkedPrograms = useMemo(
    () => resolvePrograms(data.programState.bookmarks, data.publicPrograms),
    [data.programState.bookmarks, data.publicPrograms],
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
    bookmarkedPrograms,
    nickname,
    profileName,
    recentlyViewedPrograms,
    reviewCount: data.applications.filter((application) => application.reviewSubmitted)
      .length,
    unreadMessageCount: data.notifications.filter((item) => !item.readAt).length,
    visibleTrips,
  };
}

function resolvePrograms(state: StateMap, publicPrograms: Program[]): Program[] {
  return Object.keys(state)
    .filter((id) => state[id])
    .map((id) => {
      const program = publicPrograms.find(
        (item) => String(item.id) === id || item.slug === id,
      );
      if (program) return program;

      const numericId = Number(id);
      return Number.isInteger(numericId) ? getProgramById(numericId) : undefined;
    })
    .filter((program): program is Program => Boolean(program));
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
  return "중성";
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatProgramPeriod(program: Program) {
  return `${formatShortDate(program.activityStart)} - ${formatShortDate(
    program.activityEnd,
  )}`;
}
