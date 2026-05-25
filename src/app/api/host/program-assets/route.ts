import { NextResponse } from "next/server";
import {
  apiError,
  enforceContentLength,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bucketName = "program-assets";
const maxUploadBytes = 5 * 1024 * 1024;
const allowedUploadTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const payloadTooLarge = enforceContentLength(request, 8 * 1024 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return apiError("Image file upload requires multipart/form-data.", 415);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("이미지 파일을 선택해주세요.");
    }

    validateUploadFile(file);

    const programId = sanitizePathSegment(asString(formData.get("programId")) || "draft");
    const usage = sanitizePathSegment(asString(formData.get("usage")) || "image");
    const safeName = sanitizeFileName(file.name || "program-image");
    const objectPath = [
      sanitizePathSegment(auth.user.id),
      programId,
      usage,
      `${Date.now()}-${safeName}`,
    ].join("/");
    const admin = createSupabaseAdminClient();

    const { data: buckets } = await admin.storage.listBuckets();
    const bucketExists = buckets?.some((bucket) => bucket.name === bucketName);

    if (!bucketExists) {
      await admin.storage.createBucket(bucketName, {
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        fileSizeLimit: "5MB",
        public: true,
      });
    }

    const { error: uploadError } = await admin.storage
      .from(bucketName)
      .upload(objectPath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = admin.storage.from(bucketName).getPublicUrl(objectPath);

    return NextResponse.json(
      {
        data: {
          contentType: file.type,
          fileName: safeName,
          size: file.size,
          storagePath: objectPath,
          url: data.publicUrl,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지를 업로드하지 못했어요.",
      },
      { status: 400 },
    );
  }
}

function sanitizeFileName(value: string): string {
  return (
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣._-]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 120) || "program-image"
  );
}

function sanitizePathSegment(value: string): string {
  return (
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣._-]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 96) || "draft"
  );
}

function validateUploadFile(file: File) {
  if (file.size > maxUploadBytes) {
    throw new Error("이미지는 5MB 이하만 업로드할 수 있어요.");
  }

  if (!allowedUploadTypes.has(file.type)) {
    throw new Error("JPG, PNG, WebP, GIF 이미지만 업로드할 수 있어요.");
  }
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}
