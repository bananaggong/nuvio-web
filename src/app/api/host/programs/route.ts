import { NextResponse } from "next/server";
import {
  type ApiAuthContext,
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireHostRole,
} from "@/lib/api-security";
import { safeCreateAuditLog } from "@/lib/audit-log-db";
import { listApplicationFormTemplatesFromDb } from "@/lib/application-form-db";
import {
  HostProgramAccessError,
  listHostProgramDraftsFromDb,
  normalizeHostProgramDraft,
  upsertHostProgramDraft,
} from "@/lib/host-program-db";
import { getProgramPublishBlockers } from "@/lib/host-program-publish-readiness";
import {
  decodeHostVillageSlugParam,
  listManageableHostVillageWorkspaces,
  type HostVillageWorkspace,
} from "@/lib/host-village-access";
import type { HostProgramDraft } from "@/lib/host-program-studio";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-program:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const villageScope = await resolveProgramVillageScope(auth, request);
    const drafts = await listHostProgramDraftsFromDb(
      villageScope ? { villageIds: villageScope } : {},
    );
    return NextResponse.json({ data: drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load host programs.",
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
    key: "host-program:save",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { body, response } = await readJsonWithLimit(request, 512 * 1024);
    if (response) return response;
    const draft = normalizeHostProgramDraft(body);
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const scopedDraft =
      auth.profile.role === "admin"
        ? draft
        : scopeProgramDraftToHostWorkspace(draft, workspaces);

    if (!scopedDraft) {
      return NextResponse.json(
        {
          error:
            "이 계정에 연결된 채널 프로그램만 저장할 수 있습니다.",
        },
        { status: 403 },
      );
    }

    if (scopedDraft.published) {
      const applicationForms = await listApplicationFormTemplatesFromDb(
        auth.profile.role === "admin"
          ? { formKind: "application" }
          : {
              formKind: "application",
              hostScope: {
                ownerId: auth.user.id,
                villageIds: workspaces.map((workspace) => workspace.villageId),
              },
            },
      );
      const linkedApplicationForm = applicationForms.find((form) =>
        isLinkedProgramForm(form, scopedDraft),
      );
      const blockers = getProgramPublishBlockers(scopedDraft, {
        applicationForm: linkedApplicationForm,
      });

      if (blockers.length > 0) {
        return NextResponse.json(
          {
            error: `공개하기 전에 ${blockers.map((item) => item.label).join(", ")}을(를) 완료해 주세요.`,
            blockers,
          },
          { status: 400 },
        );
      }
    }

    const savedDraft = await upsertHostProgramDraft(
      scopedDraft,
      auth.profile.role === "admin"
        ? {}
        : { allowedVillageIds: workspaces.map((workspace) => workspace.villageId) },
    );

    void safeCreateAuditLog({
      action: "program.upsert",
      actorId: auth.user.id,
      entityId: savedDraft.id,
      entityType: "program",
      metadata: {
        published: savedDraft.published,
        status: savedDraft.status,
        title: savedDraft.title,
      },
    });

    return NextResponse.json({ data: savedDraft }, { status: 201 });
  } catch (error) {
    if (error instanceof HostProgramAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save host program.",
      },
      { status: 400 },
    );
  }
}

async function resolveProgramVillageScope(
  auth: ApiAuthContext,
  request: Request,
): Promise<string[] | undefined> {
  const { searchParams } = new URL(request.url);
  const requestedVillageId = normalizeIdentifier(
    searchParams.get("channelId") ?? searchParams.get("villageId"),
  );
  const requestedVillageSlug = normalizeIdentifier(
    decodeHostVillageSlugParam(
      searchParams.get("channelSlug") ?? searchParams.get("villageSlug") ?? "",
    ),
  );
  const hasRequestedVillage = Boolean(requestedVillageId || requestedVillageSlug);

  if (auth.profile.role === "admin" && !hasRequestedVillage) return undefined;

  const workspaces = await listManageableHostVillageWorkspaces(auth);

  if (!hasRequestedVillage) {
    return workspaces.map((workspace) => workspace.villageId);
  }

  const matchedWorkspace = workspaces.find((workspace) => {
    const workspaceId = normalizeIdentifier(workspace.villageId);
    const workspaceSlug = normalizeIdentifier(workspace.slug);

    return (
      Boolean(requestedVillageId && requestedVillageId === workspaceId) ||
      Boolean(requestedVillageSlug && requestedVillageSlug === workspaceSlug)
    );
  });

  if (matchedWorkspace) return [matchedWorkspace.villageId];
  if (auth.profile.role === "admin" && isUuid(requestedVillageId)) {
    return [requestedVillageId];
  }

  return [];
}

function scopeProgramDraftToHostWorkspace(
  draft: HostProgramDraft,
  workspaces: HostVillageWorkspace[],
): HostProgramDraft | null {
  const matchedWorkspace = findProgramWorkspace(draft, workspaces);
  if (matchedWorkspace) return attachWorkspaceToProgramDraft(draft, matchedWorkspace);

  if (workspaces.length === 1 && isNewGenericProgramDraft(draft)) {
    return attachWorkspaceToProgramDraft(draft, workspaces[0]);
  }

  return null;
}

function attachWorkspaceToProgramDraft(
  draft: HostProgramDraft,
  workspace: HostVillageWorkspace,
): HostProgramDraft {
  return {
    ...draft,
    city: draft.city.trim() || workspace.city,
    image: draft.image.trim() || workspace.heroImage,
    region: draft.region.trim() || workspace.region,
    sourceName: draft.sourceName.trim() || `${workspace.title} 운영팀`,
    sourceUrl: draft.sourceUrl.trim() || `https://nuvio.kr/${workspace.slug}`,
    villageId: workspace.villageId,
  };
}

function findProgramWorkspace(
  draft: HostProgramDraft,
  workspaces: HostVillageWorkspace[],
): HostVillageWorkspace | undefined {
  const villageId = normalizeIdentifier(draft.villageId);
  const sourceUrl = normalizeIdentifier(draft.sourceUrl);

  return workspaces.find((workspace) => {
    const workspaceId = normalizeIdentifier(workspace.villageId);
    const workspaceSlug = normalizeIdentifier(workspace.slug);
    return (
      Boolean(villageId && villageId === workspaceId) ||
      Boolean(sourceUrl && sourceUrl.includes(`/${workspaceSlug}`))
    );
  });
}

function isNewGenericProgramDraft(draft: HostProgramDraft): boolean {
  return !isUuid(draft.id) && !normalizeIdentifier(draft.villageId);
}

function isLinkedProgramForm(
  form: { programId?: string; programTitle: string },
  draft: HostProgramDraft,
): boolean {
  return (
    Boolean(form.programId && form.programId === draft.id) ||
    normalizeIdentifier(form.programTitle) === normalizeIdentifier(draft.title)
  );
}

function normalizeIdentifier(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
