import { HostProgramCreateWizard } from "@/components/host-program-create-wizard";
import { requireHostConsoleAccess } from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewStandaloneProgramPage() {
  await requireHostConsoleAccess("/host/programs/new");

  return <HostProgramCreateWizard />;
}
