import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { canManageHostVillage } from "@/lib/host-village-access";
import {
  getHostSocialConnection,
  markHostSocialConnectionSynced,
} from "@/lib/host-social-connections-db";
import {
  fetchInstagramMedia,
  getFacebookOAuthConfig,
  normalizeInstagramMediaToDraft,
} from "@/lib/meta-graph";
import { revealSecret } from "@/lib/secret-box";
import { upsertHostVillageMediaDraft } from "@/lib/village-media-db";

export const runtime = "nodejs";

const MAX_INSTAGRAM_IMPORT_PAYLOAD_BYTES = 4 * 1024;
const MAX_INSTAGRAM_IMPORT_LIMIT = 50;

export async function POST(request: Request) {
  let connectionId: string | undefined;
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const contentLengthError = enforceContentLength(
      request,
      MAX_INSTAGRAM_IMPORT_PAYLOAD_BYTES,
    );
    if (contentLengthError) return contentLengthError;

    const rateLimitError = applyRateLimit(request, {
      key: "host-instagram-import",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const body = (await request.json().catch(() => ({}))) as {
      villageSlug?: unknown;
      limit?: unknown;
    };
    const villageSlug =
      typeof body.villageSlug === "string" ? body.villageSlug : "boseong";
    if (!(await canManageHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this village.", 403);
    }

    const limit = normalizeImportLimit(body.limit);
    const connection = await getHostSocialConnection(villageSlug, "facebook");
    connectionId = connection?.id;

    if (!connection || !connection.instagramUserId) {
      return NextResponse.json(
        { error: "Facebook/Instagram connection is required first." },
        { status: 404 },
      );
    }

    const config = getFacebookOAuthConfig(new URL(request.url));
    const accessToken = revealSecret(connection.accessToken);
    const pageAccessToken = revealSecret(connection.pageAccessToken);
    const media = await fetchMediaWithFallback(
      config.graphVersion,
      connection.instagramUserId,
      accessToken,
      pageAccessToken,
      limit,
    );
    const drafts = media.map((item) =>
      normalizeInstagramMediaToDraft(item, villageSlug),
    );
    const saved = [];

    for (const draft of drafts) {
      saved.push(await upsertHostVillageMediaDraft(draft));
    }

    await markHostSocialConnectionSynced(connection.id);

    return NextResponse.json({
      data: {
        imported: saved.length,
        items: saved,
      },
    });
  } catch (error) {
    if (connectionId) {
      await markHostSocialConnectionSynced(connectionId, {
        error:
          error instanceof Error ? error.message : "Instagram import failed.",
      }).catch(() => undefined);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Instagram import failed.",
      },
      { status: 400 },
    );
  }
}

function normalizeImportLimit(value: unknown): number {
  const numericValue =
    typeof value === "number" || typeof value === "string" ? Number(value) : 24;
  if (!Number.isFinite(numericValue)) return 24;

  return Math.max(
    1,
    Math.min(MAX_INSTAGRAM_IMPORT_LIMIT, Math.floor(numericValue)),
  );
}

async function fetchMediaWithFallback(
  graphVersion: string,
  instagramUserId: string,
  accessToken: string,
  pageAccessToken: string,
  limit: number,
) {
  try {
    return await fetchInstagramMedia(graphVersion, instagramUserId, accessToken, {
      limit,
    });
  } catch (error) {
    if (!pageAccessToken || pageAccessToken === accessToken) throw error;

    return fetchInstagramMedia(graphVersion, instagramUserId, pageAccessToken, {
      limit,
    });
  }
}
