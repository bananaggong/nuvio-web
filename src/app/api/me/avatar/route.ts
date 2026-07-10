import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import { validateImageUploadFile } from "@/lib/image-upload-security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bucketName = "profile-avatars";
const maxUploadBytes = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 8 * 1024 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "me-avatar:upload",
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return apiError("Image file upload requires multipart/form-data.", 415);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("프로필 이미지를 선택해 주세요.");
    }

    const validatedFile = await validateImageUploadFile(file, {
      maxBytes: maxUploadBytes,
    });

    const safeName = sanitizeFileName(
      file.name || "profile-avatar",
      validatedFile.contentType,
    );
    const objectPath = [
      sanitizePathSegment(auth.user.id),
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
        contentType: validatedFile.contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = admin.storage.from(bucketName).getPublicUrl(objectPath);

    return NextResponse.json(
      {
        data: {
          contentType: validatedFile.contentType,
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
          error instanceof Error ? error.message : "프로필 이미지를 업로드하지 못했어요.",
      },
      { status: 400 },
    );
  }
}

function sanitizeFileName(value: string, contentType: string): string {
  const extension = safeExtension(value, contentType);
  const baseName =
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\.[^.]*$/u, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "profile-avatar";

  return `${baseName}.${extension}`;
}

function safeExtension(_value: string, contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  throw new Error("Unsupported upload content type.");
}

function sanitizePathSegment(value: string): string {
  return (
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96) || "user"
  );
}
