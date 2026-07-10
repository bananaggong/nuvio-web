import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireAdminRole,
} from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import {
  createMagazinePost,
  listAdminMagazinePosts,
} from "@/lib/magazine-db";
import { normalizeMagazinePostInput } from "@/lib/magazine-admin-input";

export const runtime = "nodejs";

const maxJsonBytes = 1024 * 1024;

export async function GET(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "admin-magazine-post:list",
    limit: 90,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const posts = await listAdminMagazinePosts(
      Number(searchParams.get("limit") ?? "100"),
    );
    return NextResponse.json({ data: posts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load magazine posts.",
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

  const lengthError = enforceContentLength(request, maxJsonBytes);
  if (lengthError) return lengthError;

  const limited = applyRateLimit(request, {
    key: "admin-magazine-post:create",
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { body, response } = await readJsonWithLimit(request, maxJsonBytes);
    if (response) return response;

    const input = normalizeMagazinePostInput(body);
    const post = await createMagazinePost(input, auth.user.id);

    await safeCreateAuditLog({
      action: "magazinePost.create",
      actorId: auth.user.id,
      entityId: post.id,
      entityType: "magazinePost",
      metadata: {
        slug: post.slug,
        status: post.status,
        title: post.title,
      },
    });

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Failed to create magazine post.",
      400,
    );
  }
}
