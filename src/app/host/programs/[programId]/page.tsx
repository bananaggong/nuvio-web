import { HostProgramHub } from "@/components/host-program-hub";
import { getHostConsoleOverview } from "@/lib/host-village-access";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StandaloneProgramPage({
  params,
  searchParams,
}: PageProps) {
  const { programId } = await params;
  const decodedProgramId = decodeURIComponent(programId);
  const nextPath = buildProgramNextPath(
    `/host/programs/${encodeURIComponent(decodedProgramId)}`,
    await searchParams,
  );
  const overview = await getHostConsoleOverview();

  if (!overview.signedIn) {
    redirect(`/login?intent=host&next=${encodeURIComponent(nextPath)}`);
  }

  if (overview.workspaces.length === 0) {
    redirect("/host");
  }

  return <HostProgramHub programId={decodedProgramId} />;
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
