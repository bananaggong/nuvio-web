import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireAdminRole,
} from "@/lib/api-security";
import {
  createDraftFromProgramLead,
  normalizeProgramLeadPayload,
  rejectProgramLead,
} from "@/lib/program-lead-db";
import { getProgramLeadFeed } from "@/lib/program-leads";

export const runtime = "nodejs";

const MAX_PROGRAM_LEAD_PAYLOAD_BYTES = 128 * 1024;

export async function GET(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "admin-program-leads:list",
    limit: 90,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const feed = await getProgramLeadFeed();

  return NextResponse.json(
    { data: feed.items, meta: feed.meta },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const crossOrigin = enforceSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const limited = applyRateLimit(request, {
      key: "admin-program-leads:update",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });
    if (limited) return limited;

    const { body: rawBody, response } = await readJsonWithLimit(
      request,
      MAX_PROGRAM_LEAD_PAYLOAD_BYTES,
    );
    if (response) return response;
    const body = rawBody as Record<string, unknown>;
    const lead = normalizeProgramLeadPayload(body.lead);
    const action = String(body.action ?? "");

    if (action === "createDraft") {
      const draft = await createDraftFromProgramLead(lead);
      return NextResponse.json(
        { data: { decision: "approved", draft } },
        { status: 201 },
      );
    }

    if (action === "reject") {
      await rejectProgramLead(lead);
      return NextResponse.json({ data: { decision: "rejected" } });
    }

    return NextResponse.json(
      { error: "Unsupported program lead action." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update program lead.",
      },
      { status: 400 },
    );
  }
}
