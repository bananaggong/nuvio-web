import { redirect } from "next/navigation";

export default async function HostProjectApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string; projectId: string }>;
}) {
  const { projectId } = await params;

  redirect(`/host/projects/${encodeURIComponent(decodeURIComponent(projectId))}`);
}
