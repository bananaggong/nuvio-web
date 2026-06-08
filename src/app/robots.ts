import type { MetadataRoute } from "next";
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
        "/reviews",
        "/reviews/",
        "/reviews/new",
        "/signup",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
