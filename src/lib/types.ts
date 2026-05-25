export type ProgramStatus = "open" | "upcoming" | "closed" | "earlyClosed";

export type ProgramSort = "recent" | "deadline" | "subsidy";

export type ThemeKey =
  | "short"
  | "month"
  | "workation"
  | "local"
  | "returnFarm"
  | "event"
  | "pet"
  | "half"
  | "daily"
  | "family"
  | "easy"
  | "benefit"
  | "exclusive";

export type PeriodKey = "under4" | "week" | "twoWeeks" | "threeWeeks" | "month";

export type ProgramItineraryDay = {
  id: string;
  title: string;
  summary: string;
  timetable: string;
  image: string;
  images: string[];
};

export type ProgramPlaceInfo = {
  meetingAddress: string;
  meetingAddressDetail: string;
  meetingMemo: string;
  parkingGuide: string;
  transportGuide: string;
  accommodationEnabled: boolean;
  accommodationName: string;
  accommodationMemo: string;
};

export type Program = {
  id: number | string;
  title: string;
  slug: string;
  region: string;
  city: string;
  isGlobal?: boolean;
  summary: string;
  description: string;
  theme: ThemeKey;
  categories: ThemeKey[];
  hashtags: string[];
  periodKey: PeriodKey;
  activityStart: string;
  activityEnd: string;
  recruitStart: string;
  recruitEnd: string;
  target: string;
  capacity: string;
  announcement: string;
  subsidyLabel: string;
  subsidyAmount: number;
  fee: string;
  applicants: number;
  status: ProgramStatus;
  sourceName: string;
  sourceUrl: string;
  applyUrl: string;
  phone: string;
  image: string;
  gallery: string[];
  badges: string[];
  body: string[];
  itineraryDays?: ProgramItineraryDay[];
  placeInfo?: ProgramPlaceInfo;
  dataSource?: "database" | "external" | "seed";
  sourcePublishedAt?: string;
  sourceFetchedAt?: string;
};

export type ReviewCategory =
  | "programTip"
  | "selected"
  | "rejected"
  | "trip"
  | "free"
  | "question";

export type Review = {
  id: number | string;
  title: string;
  category: ReviewCategory;
  programId?: number;
  villageSlug?: string;
  author: string;
  date: string;
  excerpt: string;
  body: string;
  images: string[];
  likes: number;
  comments: number;
  badge?: string;
};

export type AnnouncementType = "close" | "change" | "notice" | "open";

export type Announcement = {
  id: number;
  title: string;
  type: AnnouncementType;
  date: string;
  programId?: number;
  body: string;
};

export type LiveAnnouncement = Omit<Announcement, "id"> & {
  id: string;
  internalId?: number;
  sourceId?: string;
  sourceName: string;
  sourceUrl?: string;
  isExternal: boolean;
  relevance: number;
  fetchedAt?: string;
};

export type ProgramLead = {
  id: string;
  title: string;
  summary: string;
  sourceAnnouncementId: string;
  sourceName: string;
  sourceUrl?: string;
  publishedAt: string;
  confidence: "high" | "medium" | "low";
  score: number;
  suggestedRegion?: string;
  suggestedThemes: ThemeKey[];
  suggestedStatus: ProgramStatus;
  reasons: string[];
  status?: "new" | "approved" | "rejected" | "draftCreated";
};

export type VillageMediaCategory = "original" | "broadcast" | "archive";
export type VillageMediaProvider = "youtube" | "instagram" | "naver" | "imweb" | "link";

export type VillageMediaContent = {
  id: string;
  villageSlug: string;
  title: string;
  category: VillageMediaCategory;
  provider?: VillageMediaProvider;
  summary: string;
  body: string[];
  thumbnail: string;
  embedUrl?: string;
  sourceName: string;
  sourceUrl: string;
  date: string;
  featured?: boolean;
  published: boolean;
  updatedAt: string;
};
