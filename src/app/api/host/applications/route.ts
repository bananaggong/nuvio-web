import { NextResponse } from "next/server";
import {
  applyRateLimit,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { listHostApplications } from "@/lib/host-application-db";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "host-applications:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const applications =
      auth.profile.role === "admin"
        ? await listHostApplications()
        : await listHostApplications({
            villageIds: (await listManageableHostVillageWorkspaces(auth)).map(
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
