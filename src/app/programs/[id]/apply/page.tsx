import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramApplicationForm } from "@/components/program-application-form";
import { getApplicationFormTemplateForProgram } from "@/lib/application-form-db";
import { programs } from "@/lib/data";
import { getPublicProgramByIdentifier } from "@/lib/public-program-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function generateStaticParams() {
  return programs.map((program) => ({ id: String(program.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const program = await getPublicProgramByIdentifier(id);
  if (!program) return {};

  return {
    title: `${program.title} 신청`,
    description: `${program.title} 누비오 신청서`,
  };
}

export default async function ProgramApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await getPublicProgramByIdentifier(id);

  if (!program) notFound();

  const formTemplate = await getApplicationFormTemplateForProgram(program);

  return <ProgramApplicationForm formTemplate={formTemplate} program={program} />;
}
