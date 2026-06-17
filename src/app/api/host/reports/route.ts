import { NextResponse } from "next/server";
import {
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import {
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
    const projects = await listReportProjectsFromDb();
    if (auth.profile.role === "admin") {
      return NextResponse.json({ data: projects });
    }

    const workspaces = await listManageableHostVillageWorkspaces(auth);
    const scopedProjects = projects.filter((project) =>
      findProjectWorkspace(project, workspaces),
    );

    return NextResponse.json({ data: scopedProjects });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "운영 폴더를 불러오지 못했습니다.",
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

  const payloadTooLarge = enforceContentLength(request, 256 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-report-project:save",
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const project = normalizeReportProject(body);
    const workspaces =
      auth.profile.role === "admin"
        ? []
        : await listManageableHostVillageWorkspaces(auth);
    const scopedProject =
      auth.profile.role === "admin"
        ? project
        : scopeProjectToHostWorkspace(project, workspaces);

    if (!scopedProject) {
      return NextResponse.json(
        { error: "이 계정에 연결된 로컬페이지 폴더만 저장할 수 있습니다." },
        { status: 403 },
      );
    }

    if (
      auth.profile.role !== "admin" &&
      !(await isProjectUpdateAllowed(scopedProject, workspaces))
    ) {
      return NextResponse.json(
        { error: "이 계정에 연결된 로컬페이지 폴더만 수정할 수 있습니다." },
        { status: 403 },
      );
    }

    const savedProject = await upsertReportProject(scopedProject, {
      ownerId: auth.user.id,
      restrictToOwner: false,
    });

    return NextResponse.json({ data: savedProject }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "운영 폴더를 저장하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

async function isProjectUpdateAllowed(
  project: ReportProject,
  workspaces: HostVillageWorkspace[],
): Promise<boolean> {
  const existingProject = (await listReportProjectsFromDb()).find(
    (item) => item.id === project.id,
  );
  if (!existingProject) return true;

  return Boolean(findProjectWorkspace(existingProject, workspaces));
}

function scopeProjectToHostWorkspace(
  project: ReportProject,
  workspaces: HostVillageWorkspace[],
): ReportProject | null {
  const matchedWorkspace = findProjectWorkspace(project, workspaces);
  if (matchedWorkspace) return attachWorkspace(project, matchedWorkspace);

  if (workspaces.length === 1 && isGenericProjectWorkspace(project)) {
    return attachWorkspace(project, workspaces[0]);
  }

  return null;
}

function attachWorkspace(
  project: ReportProject,
  workspace: HostVillageWorkspace,
): ReportProject {
  return {
    ...project,
    agencyName:
      isGenericText(project.agencyName, ["운영 조직명", "로컬페이지"])
        ? `${workspace.title} 운영팀`
        : project.agencyName,
    imageUrl: project.imageUrl || workspace.heroImage,
    villageId: workspace.villageId,
    villageName: workspace.title,
    villageSlug: workspace.slug,
  };
}

function findProjectWorkspace(
  project: ReportProject,
  workspaces: HostVillageWorkspace[],
): HostVillageWorkspace | undefined {
  const villageId = normalizeIdentifier(project.villageId);
  const villageSlug = normalizeIdentifier(project.villageSlug);
  const villageName = normalizeText(project.villageName);
  const agencyName = normalizeText(project.agencyName);

  return workspaces.find((workspace) => {
    const workspaceId = normalizeIdentifier(workspace.villageId);
    const workspaceSlug = normalizeIdentifier(workspace.slug);
    const workspaceTitle = normalizeText(workspace.title);

    return (
      Boolean(villageId && villageId === workspaceId) ||
      Boolean(villageSlug && villageSlug === workspaceSlug) ||
      Boolean(villageName && villageName === workspaceTitle) ||
      Boolean(agencyName && agencyName.includes(workspaceTitle))
    );
  });
}

function isGenericProjectWorkspace(project: ReportProject): boolean {
  return (
    !normalizeIdentifier(project.villageId) &&
    !normalizeIdentifier(project.villageSlug) &&
    isGenericText(project.villageName, ["", "로컬페이지", "운영 조직명"])
  );
}

function isGenericText(value: string | undefined, candidates: string[]): boolean {
  const normalizedValue = normalizeText(value);
  return candidates.some((candidate) => normalizedValue === normalizeText(candidate));
}

function normalizeIdentifier(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/gu, "").trim().toLowerCase();
}
