import "server-only";
import { siteConfig } from "@/lib/seo";
import { resolveTrustedRequestOrigin } from "@/lib/trusted-request-origin-policy";

export function getTrustedRequestOrigin(requestUrl: URL): string {
  return resolveTrustedRequestOrigin(
    requestUrl,
    new URL(siteConfig.url).origin,
    process.env,
  );
}
