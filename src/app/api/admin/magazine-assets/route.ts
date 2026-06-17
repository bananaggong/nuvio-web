import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAdminRole,
} from "@/lib/api-security";
import { validateImageUploadFile } from "@/lib/image-upload-security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bucketName = "magazine-assets";
const maxUploadBytes = 5 * 1024 * 1024;
const allowedUploadTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  const auth = await requireAdminRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 8 * 1024 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "admin-magazine-asset:upload",
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("파일이 필요합니다.", 400);
    }

    await validateUploadFile(file);

    const safeName = sanitizeStorageFileName(
      file.name || "magazine-image",
      file.type,
      "magazine-image",
    );
    const objectPath = `${auth.user.id}/${Date.now()}-${safeName}`;
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

    if (uploadError) {
      throw uploadError;
    }

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
    return apiError(
      error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
      400,
    );
  }
}

async function validateUploadFile(file: File) {
  await validateImageUploadFile(file, { maxBytes: maxUploadBytes });

  if (file.size > maxUploadBytes) {
    throw new Error("이미지 파일은 5MB 이하여야 합니다.");
  }

  if (!allowedUploadTypes.has(file.type)) {
    throw new Error("JPG, PNG, WebP, GIF 이미지만 업로드할 수 있습니다.");
  }
}

function sanitizeStorageFileName(
  value: string,
  contentType: string,
  fallback: string,
): string {
  const extension = safeStorageExtension(value, contentType);
  const baseName =
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\.[^.]*$/u, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || fallback;

  return `${baseName}.${extension}`;
}

function safeStorageExtension(fileName: string, contentType: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["gif", "jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  if (contentType === "image/gif") return "gif";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}
