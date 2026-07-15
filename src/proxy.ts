import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { hasSupabasePublicConfig } from "./lib/supabase/config";

const RELEASE_RESET_RETRY_AFTER_SECONDS = 300;
const RELEASE_RESET_STATIC_ASSET_PATHS = new Set([
  "/apple-icon.png",
  "/brand/nuvio-wordmark.svg",
  "/icon.svg",
  "/icons/nuvio/header-action-frame.svg",
  "/icons/nuvio/user.svg",
  "/images/open/open-hero-banner.webp",
  "/images/open/open-landing-01.webp",
  "/images/open/open-landing-02.webp",
  "/images/open/open-landing-03.webp",
  "/images/open/open-landing-04.webp",
  "/images/open/open-landing-05.webp",
  "/images/open/open-landing-06.webp",
]);

export function isReleaseResetAllowedPath(pathname: string): boolean {
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;

  return (
    normalizedPathname === "/" ||
    normalizedPathname === "/open" ||
    normalizedPathname === "/magazine" ||
    normalizedPathname.startsWith("/magazine/") ||
    RELEASE_RESET_STATIC_ASSET_PATHS.has(normalizedPathname)
  );
}

function isReleaseResetModeEnabled(): boolean {
  return process.env.NUVIO_RELEASE_RESET_MODE === "1";
}

function createReleaseResetResponse(): NextResponse {
  return NextResponse.json(
    { error: "release_reset_in_progress" },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(RELEASE_RESET_RETRY_AFTER_SECONDS),
      },
    },
  );
}

export async function proxy(request: NextRequest) {
  if (isReleaseResetModeEnabled()) {
    if (!isReleaseResetAllowedPath(request.nextUrl.pathname)) {
      return createReleaseResetResponse();
    }

    return NextResponse.next({ request });
  }

  if (!hasSupabasePublicConfig()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|opengraph-image|twitter-image).*)",
  ],
};
