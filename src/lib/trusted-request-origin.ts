import "server-only";
import { siteConfig } from "@/lib/seo";

export function getTrustedRequestOrigin(requestUrl: URL): string {
  if (process.env.NODE_ENV !== "production" && isLoopbackHost(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  return new URL(siteConfig.url).origin;
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}
