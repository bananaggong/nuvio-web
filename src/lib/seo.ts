import type { Metadata } from "next";
import { programPath } from "@/lib/program-routing";
import type { Program, Review, VillageMediaContent } from "@/lib/types";
import type { Village } from "@/lib/village-types";

const defaultSiteUrl = "https://nuvio.kr";

export const siteConfig = {
  name: "누비오",
  alternateName: "누비오",
  title: "누비오 | 결이 맞는 사람과 함께 떠나는 로컬 여행",
  description:
    "결이 맞는 사람과 함께 떠나는 로컬 여행. 누비오에서 지역의 취향과 이야기가 담긴 프로그램을 찾고 신청해보세요.",
  url: normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      defaultSiteUrl,
  ),
  locale: "ko_KR",
  language: "ko-KR",
  ogImagePath: "/opengraph-image",
  logoPath: "/brand/nuvio-logo-combined.svg",
  keywords: [
    "누비오",
    "여행지원금",
    "국내 여행지원금",
    "워케이션",
    "한달살기",
    "반값여행",
    "로컬 체류",
    "청년마을",
    "로컬 프로그램",
    "로컬 여행",
    "로컬 커뮤니티",
    "지역 체험",
  ],
};

type SeoMetadataInput = {
  title?: string;
  absoluteTitle?: string;
  description?: string;
  image?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function createSeoMetadata({
  absoluteTitle,
  description = siteConfig.description,
  image = siteConfig.ogImagePath,
  keywords = [],
  noIndex = false,
  path,
  title,
}: SeoMetadataInput = {}): Metadata {
  const resolvedTitle = absoluteTitle ?? formatSocialTitle(title);
  const canonical = path ? normalizePath(path) : undefined;
  const imageUrl = absoluteUrl(image);

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    keywords: uniqueValues([...siteConfig.keywords, ...keywords]),
    alternates: canonical
      ? {
          canonical,
          languages: {
            [siteConfig.language]: canonical,
          },
        }
      : undefined,
    openGraph: {
      title: resolvedTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} - 결이 맞는 사람과 함께 떠나는 로컬 여행`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
      images: [imageUrl],
    },
    robots: noIndex ? noIndexRobots : indexRobots,
  };
}

export function absoluteUrl(pathOrUrl: string = "/"): string {
  if (/^https?:\/\//iu.test(pathOrUrl)) return pathOrUrl;
  return new URL(normalizePath(pathOrUrl), siteConfig.url).toString();
}

export function normalizePath(path: string): string {
  if (!path) return "/";
  if (/^https?:\/\//iu.test(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.url,
    logo: absoluteUrl(siteConfig.logoPath),
    description: siteConfig.description,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.url,
    inLanguage: siteConfig.language,
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function webApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${siteConfig.url}/#webapp`,
    name: siteConfig.name,
    url: siteConfig.url,
    applicationCategory: "TravelApplication",
    operatingSystem: "Web",
    inLanguage: siteConfig.language,
    description: siteConfig.description,
    featureList: [
      "여행지원금 프로그램 검색",
      "워케이션과 한달살기 모집 공고 탐색",
      "채널 기반 프로그램 안내와 공지 관리",
      "내 여행 프로그램 기록과 실시간 공지 확인",
    ],
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
  };
}

export function homePageJsonLd(programs: Program[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteConfig.url}/#home`,
    name: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    inLanguage: siteConfig.language,
    mainEntity: programItemListJsonLd(programs.slice(0, 12), "/")["mainEntity"],
  };
}

export function programItemListJsonLd(
  programs: Program[],
  path = "/",
  name = "누비오 여행지원금 프로그램 목록",
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${absoluteUrl(path)}#program-list`,
    name,
    url: absoluteUrl(path),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: programs.map((program, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Event",
          "@id": `${absoluteUrl(programPath(program))}#program`,
          name: program.title,
          description: program.summary,
          image: program.image,
          url: absoluteUrl(programPath(program)),
          startDate: program.activityStart,
          endDate: program.activityEnd,
          location: programLocationJsonLd(program),
        },
      })),
    },
  };
}

export function programJsonLd(program: Program, path = programPath(program)) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${absoluteUrl(path)}#program`,
    name: program.title,
    description: program.description || program.summary,
    image: uniqueValues([program.image, ...program.gallery]),
    url: absoluteUrl(path),
    startDate: program.activityStart,
    endDate: program.activityEnd,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: programLocationJsonLd(program),
    organizer: {
      "@type": "Organization",
      name: program.sourceName,
      url: program.sourceUrl,
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(path),
      price: program.fee === "무료" ? "0" : program.fee,
      priceCurrency: "KRW",
      availability:
        program.status === "open" || program.status === "upcoming"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      validFrom: program.recruitStart,
      validThrough: program.recruitEnd,
    },
    audience: {
      "@type": "Audience",
      audienceType: program.target,
    },
    keywords: uniqueValues([...program.hashtags, ...program.badges]).join(", "),
  };
}

export function villageJsonLd(village: Village, path = `/channels/${village.slug}`) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": `${absoluteUrl(path)}#place`,
    name: village.name,
    description: village.description || village.summary,
    image: village.heroImage,
    url: absoluteUrl(path),
    address: village.address || `${village.region} ${village.city}`,
    telephone: village.contactPhone,
    sameAs: uniqueValues([village.instagramUrl, village.kakaoUrl].filter(isString)),
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function articleJsonLd({
  body,
  dateModified,
  datePublished,
  description,
  image,
  path,
  title,
}: {
  body?: string;
  dateModified?: string;
  datePublished: string;
  description: string;
  image?: string;
  path: string;
  title: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${absoluteUrl(path)}#article`,
    headline: title,
    description,
    articleBody: body,
    image: image ? [image] : [absoluteUrl(siteConfig.ogImagePath)],
    datePublished,
    dateModified: dateModified || datePublished,
    mainEntityOfPage: absoluteUrl(path),
    inLanguage: siteConfig.language,
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
  };
}

export function reviewJsonLd(review: Review, path: string, itemName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "@id": `${absoluteUrl(path)}#review`,
    name: review.title,
    reviewBody: review.body,
    datePublished: review.date,
    image: review.images,
    author: {
      "@type": "Person",
      name: review.author,
    },
    itemReviewed: {
      "@type": "Thing",
      name: itemName,
    },
  };
}

export function mediaArticleJsonLd(
  content: VillageMediaContent,
  path: string,
  publisherName: string,
) {
  return {
    ...articleJsonLd({
    title: content.title,
    description: content.summary,
    body: content.body.join("\n\n"),
    image: content.thumbnail,
    datePublished: content.date,
    dateModified: content.updatedAt,
    path,
    }),
    author: {
      "@type": "Organization",
      name: publisherName,
    },
  };
}

function programLocationJsonLd(program: Program) {
  return {
    "@type": "Place",
    name: `${program.region} ${program.city}`,
    address: program.isGlobal ? program.region : `${program.region} ${program.city}`,
  };
}

function normalizeSiteUrl(value: string): string {
  const withProtocol = value.startsWith("http") ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/u, "");
}

function formatSocialTitle(title: string | undefined): string {
  if (!title) return siteConfig.title;
  return title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`;
}

function uniqueValues(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(isString)));
}

function isString(value: string | undefined): value is string {
  return Boolean(value);
}

const indexRobots: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

const noIndexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};
