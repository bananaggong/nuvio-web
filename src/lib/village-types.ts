export type VillageLinkType = "instagram" | "kakao" | "website" | "map" | "notice";

export type VillageLink = {
  id: string;
  label: string;
  url: string;
  type: VillageLinkType;
};

export type VillageSectionType =
  | "board"
  | "free"
  | "gallery"
  | "magazine"
  | "review"
  | "story"
  | "programs"
  | "stay"
  | "community"
  | "notice"
  | "faq";

export type VillageSection = {
  blockBackgroundColor?: string;
  blockImageUrl?: string;
  blockMode?: string;
  blockText?: string;
  blockTextAlign?: string;
  blockTextColor?: string;
  blockTextPreset?: string;
  blockTextWeight?: string;
  blockVerticalAlign?: string;
  description?: string;
  id: string;
  locked?: boolean;
  menuKind?: string;
  order?: number;
  type: VillageSectionType;
  title: string;
  body: string;
  items: string[];
  visible?: boolean;
};

export type Village = {
  id: string;
  slug: string;
  name: string;
  region: string;
  city: string;
  tagline: string;
  summary: string;
  description: string;
  heroImage: string;
  profileImage?: string;
  logoText?: string;
  brandColor: string;
  accentColor: string;
  instagramUrl?: string;
  kakaoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  programIds: Array<number | string>;
  links: VillageLink[];
  sections: VillageSection[];
  published: boolean;
  updatedAt: string;
};
