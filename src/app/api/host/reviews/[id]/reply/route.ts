import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireHostRole,
} from "@/lib/api-security";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  ReviewReplyAccessError,
  ReviewReplyError,
  updateHostReviewReplyStatus,
  upsertHostReviewReply,
} from "@/lib/review-reply-db";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!launchFeatureFlags.reviewReplies) {
    return NextResponse.json(
      { error: "Review replies are disabled." },
      { status: 404 },
    );
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const contentLengthError = enforceContentLength(request, 16 * 1024);
    if (contentLengthError) return contentLengthError;

    const limited = await applyPersistentRateLimit(request, {
      key: "host-review-reply:upsert",
      limit: 60,
      windowMs: 15 * 60 * 1000,
      identity: auth.user.id,
    });
    if (limited) return limited;

    const { id } = await params;
    const parsedBody = await readJsonWithLimit(request, 16 * 1024);
    if (parsedBody.response) return parsedBody.response;
    const body = parsedBody.body;
    const options = await buildAccessOptions(auth);
    const reply = await upsertHostReviewReply(id, body, auth, options);
    return NextResponse.json({ data: reply });
  } catch (error) {
    if (error instanceof ReviewReplyAccessError) {
      return apiError(error.message, 403);
    }
    if (error instanceof ReviewReplyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save review reply.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!launchFeatureFlags.reviewReplies) {
    return NextResponse.json(
      { error: "Review replies are disabled." },
      { status: 404 },
    );
  }

  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const contentLengthError = enforceContentLength(request, 4 * 1024);
    if (contentLengthError) return contentLengthError;

    const limited = await applyPersistentRateLimit(request, {
      key: "host-review-reply:status",
      limit: 120,
      windowMs: 15 * 60 * 1000,
      identity: auth.user.id,
    });
    if (limited) return limited;

    const { id } = await params;
    const parsedBody = await readJsonWithLimit(request, 16 * 1024);
    if (parsedBody.response) return parsedBody.response;
    const body = parsedBody.body;
    const status =
      body &&
      typeof body === "object" &&
      (body as { status?: unknown }).status === "hidden"
        ? "hidden"
        : "published";
    const options = await buildAccessOptions(auth);
    const reply = await updateHostReviewReplyStatus(id, status, auth, options);
    return NextResponse.json({ data: reply });
  } catch (error) {
    if (error instanceof ReviewReplyAccessError) {
      return apiError(error.message, 403);
    }
    if (error instanceof ReviewReplyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update review reply.",
      },
      { status: 400 },
    );
  }
}

async function buildAccessOptions(
  auth: Exclude<Awaited<ReturnType<typeof requireHostRole>>, { response: NextResponse }>,
): Promise<{ allowedVillageIds?: string[]; allowedVillageSlugs?: string[] }> {
  if (auth.profile.role === "admin") return {};

  const workspaces = await listManageableHostVillageWorkspaces(auth);
  return {
    allowedVillageIds: workspaces.map((workspace) => workspace.villageId),
    allowedVillageSlugs: workspaces.map((workspace) => workspace.slug),
  };
}
