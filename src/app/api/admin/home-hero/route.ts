import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireAdminRole,
} from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import {
  listAdminHomeHeroSlides,
  replaceHomeHeroSlides,
} from "@/lib/home-hero-db";

export const runtime = "nodejs";

const MAX_HOME_HERO_PAYLOAD_BYTES = 64 * 1024;

export async function GET(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "admin-home-hero:list",
    limit: 90,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const slides = await listAdminHomeHeroSlides();
    return NextResponse.json({ data: slides });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load home hero slides.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = applyRateLimit(request, {
    key: "admin-home-hero:replace",
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { body, response } = await readJsonWithLimit(
      request,
      MAX_HOME_HERO_PAYLOAD_BYTES,
    );
    if (response) return response;
    const payload = body as { slides?: unknown };
    const slides = await replaceHomeHeroSlides(payload.slides);

    await safeCreateAuditLog({
      action: "homepageHero.replace",
      actorId: auth.user.id,
      entityId: "homepage",
      entityType: "homepageHero",
      metadata: {
        slideCount: slides.length,
        publishedCount: slides.filter((slide) => slide.published).length,
      },
    });

    return NextResponse.json({ data: slides });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save home hero slides.",
      },
      { status: 400 },
    );
  }
}
