import type { MetadataRoute } from "next";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/editor",
        "/host/",
        "/login",
        "/me",
        "/mypage",
        "/programs/*/apply",
        ...(launchFeatureFlags.reviews ? [] : ["/reviews", "/reviews/"]),
        "/reviews/*",
        "/reviews/new",
        "/signup",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
