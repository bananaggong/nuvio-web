import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import {
  listHostChannelBoardPosts,
  normalizeChannelBoardPosts,
  saveHostChannelBoardPosts,
} from "@/lib/channel-board-posts";
import { canManageHostVillage } from "@/lib/host-village-access";
import { VillagePageAccessError } from "@/lib/village-page-cms";

export const runtime = "nodejs";

const MAX_BOARD_PAYLOAD_BYTES = 128 * 1024;

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-channel-board:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const villageSlug = searchParams.get("villageSlug") ?? "boseong";
    if (!(await canManageHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this channel.", 403);
    }

    const posts = await listHostChannelBoardPosts(villageSlug);

    return NextResponse.json({ data: posts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load channel board posts.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, MAX_BOARD_PAYLOAD_BYTES);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-channel-board:save",
    limit: 80,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const villageSlug = typeof body.villageSlug === "string" ? body.villageSlug : "boseong";
    if (!(await canManageHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this channel.", 403);
    }

    const posts = normalizeChannelBoardPosts(body.posts);
    const savedPosts = await saveHostChannelBoardPosts({
      posts,
      villageSlug,
    });

    return NextResponse.json({ data: savedPosts }, { status: 201 });
  } catch (error) {
    if (error instanceof VillagePageAccessError) {
      return apiError(error.message, 403);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save channel board posts.",
      },
      { status: 400 },
    );
  }
}
