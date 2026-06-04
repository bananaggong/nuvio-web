"use client";

import Link from "next/link";
import {
  HostFolderInsideHeader,
  HostMiniProgramCard,
  HostWorkspaceContent,
  HostWorkspaceLayout,
  type HostProgramListItem,
} from "@/components/host-workspace-ui";
import {
  buildHostProgramOverviews,
  findHostProjectOverview,
  hostProjectPath,
} from "@/lib/host-projects";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

export function HostProjectHub({ projectId }: { projectId: string }) {
  const { applications, programs: hostPrograms, reportProjects } =
    useHostOperationsData();

  const project = findHostProjectOverview(
    projectId,
    applications,
    reportProjects,
    hostPrograms,
  );
  const programs: HostProgramListItem[] = project
    ? buildHostProgramOverviews(project, applications).map((program) => ({
        ...program,
        projectId: project.id,
        projectTitle: project.title,
        villageName: project.villageName,
      }))
    : [];

  if (!project) {
    return (
      <HostWorkspaceLayout sidebarHeight="min-h-[366px]">
        <HostWorkspaceContent insideFolder>
          <div className="pt-[1.667vw]">
            <Link
              className="inline-flex h-8 items-center rounded-[4px] border border-[#F3E2D5] px-3 text-[13px] font-black text-[#5B3A29]"
              href="/host"
            >
              내 프로그램
            </Link>
            <div className="mt-5 rounded-[5px] border border-[#F3E2D5] bg-white p-5">
              <h1 className="text-[18px] font-black text-[#33241C]">
                폴더를 찾을 수 없습니다.
              </h1>
            </div>
          </div>
        </HostWorkspaceContent>
      </HostWorkspaceLayout>
    );
  }

  const projectPath = hostProjectPath(project.id);

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[366px]">
      <HostWorkspaceContent insideFolder>
        <div className="w-full max-w-[82.222vw] pt-[1.667vw] max-md:max-w-none max-md:pt-5">
          <HostFolderInsideHeader
            count={programs.length}
            createHref={`${projectPath}/programs/new`}
            title={project.title}
          />

          {programs.length > 0 ? (
            <div className="mt-[1.528vw] grid w-[70.833vw] max-w-[1360px] grid-cols-4 gap-x-[1.111vw] gap-y-[1.111vw] pl-[1.389vw] max-xl:w-full max-xl:grid-cols-3 max-md:grid-cols-1 max-md:pl-0">
              {programs.slice(0, 8).map((program) => (
                <HostMiniProgramCard
                  actionLabel="관리"
                  key={program.id}
                  program={program}
                />
              ))}
            </div>
          ) : (
            <div className="mt-[1.528vw] grid h-[300px] w-[70.833vw] max-w-[1360px] place-items-center rounded-[5px] border border-dashed border-[#F3C3A5] bg-white text-[13px] font-black text-[#FE701E] max-md:w-full">
              저장된 프로그램이 없습니다.
            </div>
          )}

          <Link
            className="mt-[1.111vw] inline-flex h-[32px] items-center rounded-[4px] bg-[#FE701E] px-4 text-[12px] font-black text-white"
            href={`${projectPath}/programs/new`}
            id="new-program"
          >
            프로그램 추가
          </Link>
        </div>
      </HostWorkspaceContent>
    </HostWorkspaceLayout>
  );
}
