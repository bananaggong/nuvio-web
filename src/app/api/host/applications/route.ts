import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
import { listHostApplications } from "@/lib/host-application-db";
import { listHostVillageWorkspaces } from "@/lib/host-village-access";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const applications =
      auth.profile.role === "admin"
        ? await listHostApplications()
        : await listHostApplications({
            villageIds: (await listHostVillageWorkspaces(auth)).map(
              (workspace) => workspace.villageId,
            ),
          });

    return NextResponse.json({ data: applications });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load host applications.",
      },
      { status: 500 },
    );
  }
}
