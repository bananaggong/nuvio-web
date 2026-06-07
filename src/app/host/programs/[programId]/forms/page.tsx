import type { Metadata } from "next";
import { HostProgramFormAttachment } from "@/components/host-program-form-attachment";
import { requireHostConsoleAccess } from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "프로그램 신청 폼 | 누비오",
  description: "선택한 프로그램의 신청 폼 질문을 구성하는 화면입니다.",
};

export default async function StandaloneProgramFormsPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const decodedProgramId = decodeURIComponent(programId);
  await requireHostConsoleAccess(
    `/host/programs/${encodeURIComponent(decodedProgramId)}/forms`,
  );

  return <HostProgramFormAttachment programId={decodedProgramId} />;
}
