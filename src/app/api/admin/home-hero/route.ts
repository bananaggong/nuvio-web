import { NextResponse } from "next/server";
import {
  enforceContentLength,
  isApiAuthError,
  requireAdminRole,
} from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import {
  listAdminHomeHeroSlides,
  replaceHomeHeroSlides,
} from "@/lib/home-hero-db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

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

  const lengthError = enforceContentLength(request, 64 * 1024);
  if (lengthError) return lengthError;

  try {
    const payload = (await request.json()) as { slides?: unknown };
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
