import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  let connectionId: string | undefined;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      villageSlug?: unknown;
      limit?: unknown;
    };
    const villageSlug =
      typeof body.villageSlug === "string" ? body.villageSlug : "boseong";
    const limit = typeof body.limit === "number" ? body.limit : 24;
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
