import { NextResponse } from "next/server";
import {
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { listUserProgramInquiriesFromDb } from "@/lib/host-inquiry-db";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const inquiries = await listUserProgramInquiriesFromDb(auth.user.id);
    return NextResponse.json({ data: inquiries });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load my inquiries.",
      },
      { status: 500 },
    );
  }
}
