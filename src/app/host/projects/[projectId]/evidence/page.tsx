import { redirect } from "next/navigation";

export default async function HostProjectEvidencePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  redirect(`/host/projects/${encodeURIComponent(decodeURIComponent(projectId))}`);
}
