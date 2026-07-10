import { NextResponse } from "next/server";
import {
  applyPersistentRateLimit,
  applyRateLimit,
  enforceSameOrigin,
  isApiAuthError,
  readJsonWithLimit,
  requireHostRole,
} from "@/lib/api-security";
import {
  deleteReportProjectFromDb,
  getReportProjectFromDb,
  listReportProjectsFromDb,
  normalizeReportProject,
  upsertReportProject,
} from "@/lib/report-automation-db";
import {
  listManageableHostVillageWorkspaces,
  type HostVillageWorkspace,
} from "@/lib/host-village-access";
import type { ReportProject } from "@/lib/report-automation";

export const runtime = "nodejs";

const MAX_REPORT_PAYLOAD_BYTES = 256 * 1024;

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-report-project:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    if (auth.profile.role === "admin") {
      return NextResponse.json({ data: await listReportProjectsFromDb() });
    }

    const workspaces = await listManageableHostVillageWorkspaces(auth);
    const projects = await listReportProjectsFromDb({
      villageIds: workspaces.map((workspace) => workspace.villageId),
    });
    return NextResponse.json({ data: projects });
  } catch {
    return NextResponse.json(
      { error: "Failed to load report projects." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = await applyPersistentRateLimit(request, {
    identity: auth.user.id,
    key: "host-report-project:save",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { body, response } = await readJsonWithLimit(
      request,
      MAX_REPORT_PAYLOAD_BYTES,
    );
    if (response) return response;

    const project = normalizeReportProject(body);
    const isUpdate = isUuid(project.id);

    if (auth.profile.role === "admin") {
      const villageId = isUuid(project.villageId ?? "")
        ? project.villageId
        : undefined;
      if (!villageId) {
        return NextResponse.json(
          { error: "Report project requires a valid village workspace." },
          { status: 400 },
        );
      }
      const savedProject = await upsertReportProject(project, {
        ownerId: auth.user.id,
        villageId,
      });
      return NextResponse.json(
        { data: savedProject },
        { status: isUpdate ? 200 : 201 },
      );
    }

    const workspaces = await listManageableHostVillageWorkspaces(auth);
    const allowedVillageIds = workspaces.map((workspace) => workspace.villageId);
    const workspace = isUpdate
      ? await resolveExistingProjectWorkspace(
          project.id,
          workspaces,
          allowedVillageIds,
        )
      : resolveNewProjectWorkspace(project, workspaces);

    if (!workspace) {
      return NextResponse.json(
        { error: "Report project is outside the allowed workspace." },
        { status: isUpdate ? 404 : 403 },
      );
    }

    const scopedProject = attachWorkspace(project, workspace);
    const savedProject = await upsertReportProject(scopedProject, {
      allowedVillageIds,
      ownerId: auth.user.id,
      villageId: workspace.villageId,
    });

    return NextResponse.json(
      { data: savedProject },
      { status: isUpdate ? 200 : 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to save report project." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const limited = await applyPersistentRateLimit(request, {
    identity: auth.user.id,
    key: "host-report-project:delete",
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const { body, response } = await readJsonWithLimit(request, 16 * 1024);
    if (response) return response;

    const record = asRecord(body);
    const bodyId = typeof record.id === "string" ? record.id.trim() : "";
    const queryId = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    const projectId = bodyId || queryId;

    if (!projectId) {
      return NextResponse.json(
        { error: "Report project ID is required." },
        { status: 400 },
      );
    }

    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const deletedProject = await deleteReportProjectFromDb(projectId, {
      villageIds:
        auth.profile.role === "admin"
          ? undefined
          : workspaces.map((workspace) => workspace.villageId),
    });

    if (!deletedProject) {
      return NextResponse.json(
        { error: "Report project was not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: deletedProject });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete report project." },
      { status: 400 },
    );
  }
}

async function resolveExistingProjectWorkspace(
  projectId: string,
  workspaces: HostVillageWorkspace[],
  allowedVillageIds: string[],
): Promise<HostVillageWorkspace | undefined> {
  const existingProject = await getReportProjectFromDb(projectId, {
    villageIds: allowedVillageIds,
  });
  if (!existingProject?.villageId) return undefined;

  return workspaces.find(
    (workspace) => workspace.villageId === existingProject.villageId,
  );
}

function resolveNewProjectWorkspace(
  project: ReportProject,
  workspaces: HostVillageWorkspace[],
): HostVillageWorkspace | undefined {
  const villageId = normalizeIdentifier(project.villageId);
  const villageSlug = normalizeIdentifier(project.villageSlug);
  const exactMatch = workspaces.find(
    (workspace) =>
      (villageId && normalizeIdentifier(workspace.villageId) === villageId) ||
      (villageSlug && normalizeIdentifier(workspace.slug) === villageSlug),
  );
  if (exactMatch) return exactMatch;

  if (!villageId && !villageSlug && workspaces.length === 1) {
    return workspaces[0];
  }

  return undefined;
}

function attachWorkspace(
  project: ReportProject,
  workspace: HostVillageWorkspace,
): ReportProject {
  return {
    ...project,
    agencyName: project.agencyName.trim() || `${workspace.title} operations`,
    imageUrl: project.imageUrl || workspace.heroImage,
    villageId: workspace.villageId,
    villageName: workspace.title,
    villageSlug: workspace.slug,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeIdentifier(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
