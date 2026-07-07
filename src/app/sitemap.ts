import type { MetadataRoute } from "next";
import { announcements } from "@/lib/data";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { programPath } from "@/lib/program-routing";
import { listPublicPrograms } from "@/lib/public-program-db";
import { absoluteUrl } from "@/lib/seo";
import {
  getVillagePrograms,
  getVillageReviews,
  listPublicVillages,
} from "@/lib/village-db";
import { listPublicVillageMedia } from "@/lib/village-media-db";
import {
  canonicalVillagePath,
  canonicalVillageProgramPath,
  supportsVillageReviewDetailPages,
  villagePath,
} from "@/lib/village-routing";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    route("/", "hourly", 1, now),
    route("/half-price-travel", "weekly", 0.8, now),
    route("/channels", "daily", 0.8, now),
    route("/announcements", "hourly", 0.7, now),
    ...(launchFeatureFlags.reviews
      ? [route("/reviews", "daily", 0.7, now)]
      : []),
    route("/partners/apply", "monthly", 0.5, now),
    route("/terms", "yearly", 0.2, now),
    route("/privacy", "yearly", 0.2, now),
    route("/privacy/third-party", "yearly", 0.2, now),
  ];

  const programs = await listPublicPrograms();
  const programRoutes = programs.map((program) =>
    route(programPath(program), "daily", 0.75, dateOrNow(program.recruitStart)),
  );

  const villages = await listPublicVillages();
  const villageRoutes = villages.flatMap((village) => [
    route(
      canonicalVillagePath(village.slug),
      "daily",
      0.8,
      dateOrNow(village.updatedAt),
    ),
    route(`${villagePath(village.slug)}/about`, "weekly", 0.55, village.updatedAt),
    route(`${villagePath(village.slug)}/programs`, "daily", 0.65, village.updatedAt),
    route(`${villagePath(village.slug)}/media`, "weekly", 0.55, village.updatedAt),
    route(`${villagePath(village.slug)}/notice`, "weekly", 0.45, village.updatedAt),
    ...(launchFeatureFlags.reviews
      ? [
          route(
            `${villagePath(village.slug)}/reviews`,
            "weekly",
            0.55,
            village.updatedAt,
          ),
        ]
      : []),
  ]);

  const villageProgramRouteGroups = await Promise.all(
    villages.map(async (village) => {
      const villagePrograms = await getVillagePrograms(village);
      return villagePrograms.map((program) =>
        route(
          canonicalVillageProgramPath(village.slug, program.slug || String(program.id)),
          "daily",
          0.7,
          dateOrNow(program.recruitStart),
        ),
      );
    }),
  );

  const villageMediaRouteGroups = await Promise.all(
    villages.map(async (village) => {
      const media = await listPublicVillageMedia(village.slug);
      return media.map((content) =>
        route(
          `${villagePath(village.slug)}/media/${content.id}`,
          "weekly",
          0.5,
          dateOrNow(content.updatedAt || content.date),
        ),
      );
    }),
  );

  const villageReviewRouteGroups = launchFeatureFlags.reviews
    ? await Promise.all(
        villages
          .filter((village) => supportsVillageReviewDetailPages(village.slug))
          .map(async (village) => {
            const villagePrograms = await getVillagePrograms(village);
            const villageReviews = await getVillageReviews(village, villagePrograms);
            return villageReviews.map((review) =>
              route(
                `${villagePath(village.slug)}/reviews/${review.id}`,
                "weekly",
                0.45,
                dateOrNow(review.date),
              ),
            );
          }),
      )
    : [];

  const announcementRoutes = announcements.map((announcement) =>
    route(`/announcements/${announcement.id}`, "weekly", 0.45, announcement.date),
  );

  return uniqueRoutes([
    ...staticRoutes,
    ...programRoutes,
    ...villageRoutes,
    ...villageProgramRouteGroups.flat(),
    ...villageMediaRouteGroups.flat(),
    ...villageReviewRouteGroups.flat(),
    ...announcementRoutes,
  ]);
}

function route(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
  lastModified: Date | string,
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  };
}

function uniqueRoutes(routes: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return routes.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function dateOrNow(value: string | Date | undefined): Date {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
