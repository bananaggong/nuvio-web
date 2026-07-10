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
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import {
  listHostVillagePageSections,
  normalizeVillagePageSectionDraft,
  upsertHostVillagePageSection,
  VillagePageAccessError,
  type VillagePageKey,
} from "@/lib/village-page-cms";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-village-section:list",
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

    const requestedPageKey = searchParams.get("pageKey");
    if (requestedPageKey === "reviews" && !launchFeatureFlags.reviews) {
      return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
    }

    const pageKey = normalizePageKey(requestedPageKey);
    const sections = await listHostVillagePageSections(villageSlug, pageKey);

    return NextResponse.json({ data: sections });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load channel page sections.",
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

  const limited = applyRateLimit(request, {
    key: "host-village-section:save",
    limit: 80,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { body, response } = await readJsonWithLimit(request, 256 * 1024);
    if (response) return response;
    const draft = normalizeVillagePageSectionDraft(body);
    if (draft.pageKey === "reviews" && !launchFeatureFlags.reviews) {
      return NextResponse.json({ error: "Reviews are disabled." }, { status: 404 });
    }

    if (!(await canManageHostVillage(auth, draft.villageSlug))) {
      return apiError("You do not have permission to manage this channel.", 403);
    }

    const savedDraft = await upsertHostVillagePageSection(draft, {
      allowedVillageSlug: draft.villageSlug,
    });

    return NextResponse.json({ data: savedDraft }, { status: 201 });
  } catch (error) {
    if (error instanceof VillagePageAccessError) {
      return apiError(error.message, 403);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save channel page section.",
      },
      { status: 400 },
    );
  }
}

function normalizePageKey(value: string | null): VillagePageKey {
  if (
    value === "about" ||
    value === "media" ||
    value === "programs" ||
    (launchFeatureFlags.reviews && value === "reviews") ||
    value === "notice"
  ) {
    return value;
  }
  return "home";
}
