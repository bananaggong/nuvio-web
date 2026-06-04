"use client";

import Image from "next/image";
import Link from "next/link";
import {
  HostFolderInsideHeader,
  HostWorkspaceContent,
  HostWorkspaceLayout,
  type HostProgramListItem,
} from "@/components/host-workspace-ui";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import {
  buildHostProgramOverviews,
  findHostProjectOverview,
  hostProjectPath,
} from "@/lib/host-projects";
import type { ProgramStatus } from "@/lib/types";
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
            <div className="mt-[1.528vw] inline-grid grid-cols-[repeat(4,fit-content(100%))] gap-[1.111vw] pl-[1.389vw] pr-[0.833vw] max-xl:grid-cols-[repeat(3,fit-content(100%))] max-lg:grid-cols-[repeat(2,fit-content(100%))] max-md:grid-cols-1 max-md:pl-0">
              {programs.slice(0, 8).map((program) => {
                const draft = project.programDrafts.find(
                  (item) =>
                    item.id === program.id ||
                    item.slug === program.slug ||
                    item.title === program.title,
                );

                return (
                  <InsideFolderProgramCard
                    draft={draft}
                    key={program.id}
                    program={program}
                    projectPath={projectPath}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-[1.528vw] grid h-[300px] w-[70.833vw] max-w-[1360px] place-items-center rounded-[5px] border border-dashed border-[#F3C3A5] bg-white text-[13px] font-semibold text-[#FE701E] max-md:w-full">
              저장된 프로그램이 없습니다.
            </div>
          )}
        </div>
      </HostWorkspaceContent>
    </HostWorkspaceLayout>
  );
}

function InsideFolderProgramCard({
  draft,
  program,
  projectPath,
}: {
  draft?: HostProgramDraft;
  program: HostProgramListItem;
  projectPath: string;
}) {
  const status = program.status ?? "open";
  const statusMeta = getInsideFolderStatusMeta(status);
  const href = `${projectPath}/programs/${encodeURIComponent(program.id)}`;
  const isMetricPending = status === "upcoming" && program.applicationCount === 0;
  const programNumber = program.id
    .replace(/^draft-/u, "")
    .replace(/^program-/u, "")
    .slice(0, 9);
  const periodLabel =
    draft?.activityStart && draft.activityEnd
      ? `${formatCompactDate(draft.activityStart)}-${formatCompactDate(draft.activityEnd)}`
      : "프로그램 기간";
  const dateLabel =
    status === "closed" || status === "earlyClosed"
      ? `마감일 :${draft?.recruitEnd ? ` ${formatCompactDate(draft.recruitEnd)}` : ""}`
      : `오픈일 :${draft?.recruitStart ? ` ${formatCompactDate(draft.recruitStart)}` : ""}`;

  return (
    <Link
      className="block w-[16.319vw] min-w-[235px] rounded-[8px] border border-[#D9D9D9] bg-white p-[0.833vw] text-[#0D0D0C] transition hover:border-[#FE701E] max-md:w-full"
      href={href}
    >
      <div className="flex items-center gap-[0.694vw]">
        <div className="relative h-[5.694vw] min-h-[82px] w-[4.792vw] min-w-[69px] shrink-0 overflow-hidden rounded-[6px] bg-[#D9D9D9]">
          {program.imageUrl ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="92px"
              src={program.imageUrl}
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-[12px] font-normal leading-[1.253]">
            프로그램 넘버{" "}
            <span className="text-[#FE701E]">{programNumber || "000000000"}</span>
          </p>
          <p className="line-clamp-2 text-[14px] font-medium leading-[1.253]">
            {program.title}
          </p>
          <div className="flex flex-col gap-1 text-[12px] font-normal leading-[1.253]">
            <p className="truncate">{periodLabel}</p>
            <p className="truncate">{dateLabel}</p>
          </div>
        </div>
      </div>
      <div className="mt-[0.486vw] flex items-center gap-[0.417vw] text-[12px] font-normal leading-[1.253]">
        <p className="whitespace-nowrap">
          <span className="text-[#6D7A8A]">신청</span>{" "}
          {isMetricPending ? "--/--" : `${formatTwoDigits(program.applicationCount)}/00`}
        </p>
        <p className="whitespace-nowrap">
          <span className="text-[#6D7A8A]">조회</span>{" "}
          {isMetricPending ? "--" : formatTwoDigits(program.readiness)}
        </p>
        <p className="whitespace-nowrap">
          <span className="text-[#6D7A8A]">저장</span> {isMetricPending ? "--" : "00"}
        </p>
        <span
          className={`ml-auto inline-flex shrink-0 items-center rounded-[6px] px-[0.417vw] py-[0.208vw] text-[12px] font-semibold leading-[1.253] ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </div>
    </Link>
  );
}

function getInsideFolderStatusMeta(status: ProgramStatus): {
  className: string;
  label: string;
} {
  if (status === "closed" || status === "earlyClosed") {
    return { className: "bg-[#C75C36] text-[#FCFCFC]", label: "마감" };
  }

  if (status === "upcoming") {
    return { className: "bg-[#6D7A8A] text-[#F3F3F3]", label: "예정" };
  }

  return { className: "bg-[#F7B267] text-[#FCFCFC]", label: "오픈" };
}

function formatCompactDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

function formatTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}
