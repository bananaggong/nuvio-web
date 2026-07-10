import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireHostRole,
} from "@/lib/api-security";
import { canManageHostVillage } from "@/lib/host-village-access";
import {
  normalizeVillagePageSectionDraft,
  publishHostVillagePageSection,
  VillagePageAccessError,
} from "@/lib/village-page-cms";

export const runtime = "nodejs";

const MAX_SECTION_PUBLISH_PAYLOAD_BYTES = 256 * 1024;

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const rateLimitError = applyRateLimit(request, {
      key: "host-village-section-publish",
      limit: 60,
      windowMs: 15 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const { body, response } = await readJsonWithLimit(
      request,
      MAX_SECTION_PUBLISH_PAYLOAD_BYTES,
    );
    if (response) return response;
    const draft = normalizeVillagePageSectionDraft(body);
    if (!(await canManageHostVillage(auth, draft.villageSlug))) {
      return apiError("You do not have permission to manage this channel.", 403);
    }

    const publishedDraft = await publishHostVillagePageSection(draft, {
      allowedVillageSlug: draft.villageSlug,
    });

    return NextResponse.json({ data: publishedDraft }, { status: 201 });
  } catch (error) {
    if (error instanceof VillagePageAccessError) {
      return apiError(error.message, 403);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to publish channel page section.",
      },
      { status: 400 },
    );
  }
}
