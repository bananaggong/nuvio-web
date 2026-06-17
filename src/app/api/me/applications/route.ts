import { NextResponse } from "next/server";
import {
  applyRateLimit,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { listHostApplications } from "@/lib/host-application-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const limited = applyRateLimit(request, {
    key: "me-applications:list",
    limit: 120,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const emails = getVerifiedAccountEmails(auth);
    const applications = await listHostApplications({
      emails,
      limit: 100,
      submittedByUserId: auth.user.id,
    });

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

function getVerifiedAccountEmails(auth: Awaited<ReturnType<typeof requireAuthenticatedUser>>) {
  if (isApiAuthError(auth)) return [];

  return Array.from(
    new Set(
      [auth.user.email, auth.profile.email]
        .map((email) => String(email ?? "").trim().toLowerCase())
        .filter(isValidEmail),
    ),
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}
