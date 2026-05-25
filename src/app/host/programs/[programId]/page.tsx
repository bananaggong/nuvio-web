import { HostProgramHub } from "@/components/host-program-hub";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function StandaloneProgramPage({ params }: PageProps) {
  const { programId } = await params;

  return <HostProgramHub programId={decodeURIComponent(programId)} />;
}
