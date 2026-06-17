import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAdminRole,
} from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import {
  archiveMagazinePost,
  getAdminMagazinePost,
  updateMagazinePost,
} from "@/lib/magazine-db";
import { normalizeMagazinePostInput } from "@/lib/magazine-admin-input";

export const runtime = "nodejs";

const maxJsonBytes = 1024 * 1024;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "admin-magazine-post:get",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const { id } = await params;
  const post = await getAdminMagazinePost(id);

  if (!post) {
    return apiError("소식지 글을 찾을 수 없습니다.", 404);
  }

  return NextResponse.json({ data: post });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const lengthError = enforceContentLength(request, maxJsonBytes);
  if (lengthError) return lengthError;

  const limited = applyRateLimit(request, {
    key: "admin-magazine-post:update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { id } = await params;
    const post = await updateMagazinePost(
      id,
      normalizeMagazinePostInput(await request.json()),
    );

    if (!post) {
      return apiError("소식지 글을 찾을 수 없습니다.", 404);
    }

    await safeCreateAuditLog({
      action: "magazinePost.update",
      actorId: auth.user.id,
      entityId: post.id,
      entityType: "magazinePost",
      metadata: {
        slug: post.slug,
        status: post.status,
        title: post.title,
      },
    });

    return NextResponse.json({ data: post });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Failed to update magazine post.",
      400,
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const lengthError = enforceContentLength(request, 1024);
  if (lengthError) return lengthError;

  const limited = applyRateLimit(request, {
    key: "admin-magazine-post:delete",
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const { id } = await params;
  const post = await archiveMagazinePost(id);

  if (!post) {
    return apiError("소식지 글을 찾을 수 없습니다.", 404);
  }

  await safeCreateAuditLog({
    action: "magazinePost.archive",
    actorId: auth.user.id,
    entityId: post.id,
    entityType: "magazinePost",
    metadata: {
      slug: post.slug,
      title: post.title,
    },
  });

  return NextResponse.json({ data: post });
}
