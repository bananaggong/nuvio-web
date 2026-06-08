import { NextResponse } from "next/server";
import { isApiAuthError, requireHostRole } from "@/lib/api-security";
import { deleteApplicationFormTemplate } from "@/lib/application-form-db";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const { id } = await params;
    const deleted = await deleteApplicationFormTemplate(decodeURIComponent(id), {
      ownerId: auth.user.id,
      restrictToOwner: auth.profile.role !== "admin",
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "신청서 양식을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: { id } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "신청서 양식을 삭제하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
