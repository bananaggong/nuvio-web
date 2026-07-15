import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramApplicationForm } from "@/components/program-application-form";
import { getApplicationFormTemplateForProgram } from "@/lib/application-form-db";
import { programs } from "@/lib/data";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { getPublicProgramByIdentifier } from "@/lib/public-program-db";
import { programPath } from "@/lib/program-routing";
import { createSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function generateStaticParams() {
  if (!isDemoModeEnabled()) return [];
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

  return createSeoMetadata({
    title: `${program.title} 신청`,
    description: `${program.title} 누비오 신청서`,
    noIndex: true,
    path: `${programPath(program)}/apply`,
  });
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
