"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  FilePlus2,
  MessageSquareText,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  findHostProgramOverview,
  findHostProjectOverview,
  hostProgramPath,
  hostProjectPath,
} from "@/lib/host-projects";
import { useHostOperationsData } from "@/lib/use-host-operations-data";

export function HostProgramHub({
  programId,
  projectId,
}: {
  programId: string;
  projectId: string;
}) {
  const { applications, programs: hostPrograms, reportProjects } = useHostOperationsData();

  const project = useMemo(
    () => findHostProjectOverview(projectId, applications, reportProjects, hostPrograms),
    [applications, hostPrograms, projectId, reportProjects],
  );
  const program = useMemo(
    () =>
      findHostProgramOverview(projectId, programId, applications, reportProjects, hostPrograms),
    [applications, hostPrograms, programId, projectId, reportProjects],
  );
  const projectPath = hostProjectPath(projectId);
  const programPath = hostProgramPath(projectId, programId);

  if (!project || !program) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href={projectPath}
        >
          <ArrowLeft size={16} />
          프로젝트 허브
        </Link>
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-black text-slate-950">
            프로그램을 찾을 수 없습니다.
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href={projectPath}
        >
          <ArrowLeft size={16} />
          프로젝트 허브
        </Link>
      </div>

      <section className="grid overflow-hidden rounded-md border border-slate-200 bg-white lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="relative min-h-72 bg-slate-100">
          <Image
            alt={program.title}
            className="object-cover"
            fill
            sizes="(max-width: 1024px) 100vw, 420px"
            src={program.imageUrl}
          />
        </div>
        <div className="p-5 sm:p-6">
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <ClipboardList size={18} />
            Program Operations
          </p>
          <h1 className="mt-4 max-w-3xl text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            {program.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {project.title} 하위 프로그램입니다. 신청자, 신청서, 안내 메시지는
            이 프로그램 모집 흐름 안에서 관리합니다.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Metric label="신청자" value={`${program.applicationCount}명`} />
            <Metric label="검토 대기" value={`${program.pendingCount}명`} />
            <Metric label="준비율" value={`${program.readiness}%`} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <ProgramTool
          description="이 프로그램에 신청한 사람만 검토합니다."
          href={`${programPath}/applications`}
          icon={<Users size={20} />}
          title="신청자 CRM"
        />
        <ProgramTool
          description="이 프로그램 모집에 연결되는 질문 세트를 구성합니다."
          href={`${programPath}/forms`}
          icon={<FilePlus2 size={20} />}
          title="신청서"
        />
        <ProgramTool
          description="이 프로그램 신청자에게 보낼 안내 메시지를 준비합니다."
          href={`${programPath}/messages`}
          icon={<MessageSquareText size={20} />}
          title="안내 메시지"
        />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--surface-muted)] p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function ProgramTool({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      className="rounded-md border border-slate-200 bg-white p-5 hover:border-[var(--primary)] hover:bg-teal-50"
      href={href}
    >
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <span className="text-[var(--primary)]">{icon}</span>
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
        열기
        <ArrowRight size={15} />
      </span>
    </Link>
  );
}
