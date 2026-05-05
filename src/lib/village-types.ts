export type VillageLinkType = "instagram" | "kakao" | "website" | "map" | "notice";

export type VillageLink = {
  id: string;
  label: string;
  url: string;
  type: VillageLinkType;
};

export type VillageSectionType =
  | "story"
  | "programs"
  | "stay"
  | "community"
  | "notice"
  | "faq";

export type VillageSection = {
  id: string;
  type: VillageSectionType;
  title: string;
  body: string;
  items: string[];
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
  subdomain?: string;
  customDomain?: string;
};
