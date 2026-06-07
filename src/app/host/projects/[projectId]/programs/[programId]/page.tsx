import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HostProgramHub } from "@/components/host-program-hub";
import { getHostConsoleOverview } from "@/lib/host-village-access";

export const metadata: Metadata = {
  title: "프로그램 운영 허브 | 누비오",
  description:
    "폴더 안의 특정 프로그램을 선택해 신청자, 신청서, 안내 메시지를 관리하는 화면입니다.",
};

export default async function HostProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string; projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { programId, projectId } = await params;
  const decodedProgramId = decodeURIComponent(programId);
  const decodedProjectId = decodeURIComponent(projectId);
  const nextPath = buildProgramNextPath(
    `/host/projects/${encodeURIComponent(decodedProjectId)}/programs/${encodeURIComponent(decodedProgramId)}`,
    await searchParams,
  );
  const overview = await getHostConsoleOverview();

  if (!overview.signedIn) {
    redirect(`/login?intent=host&next=${encodeURIComponent(nextPath)}`);
  }

  if (overview.workspaces.length === 0) {
    redirect("/host");
  }

  return (
    <>
      <HostProgramHub
        programId={decodedProgramId}
        projectId={decodedProjectId}
      />
    </>
  );
}

function buildProgramNextPath(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
