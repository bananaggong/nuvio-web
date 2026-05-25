import { redirect } from "next/navigation";

export default async function HostProjectMessagesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  redirect(`/host/projects/${encodeURIComponent(decodeURIComponent(projectId))}`);
}
