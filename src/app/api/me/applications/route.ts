import { NextResponse } from "next/server";
import {
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { listHostApplications } from "@/lib/host-application-db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const emails = [
      auth.profile.email,
      auth.profile.contactEmail ?? "",
      auth.user.email ?? "",
    ];
    const applications = await listHostApplications({ emails, limit: 100 });

    return NextResponse.json({ data: applications });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load my applications.",
      },
      { status: 500 },
    );
  }
}
