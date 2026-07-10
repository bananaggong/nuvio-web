import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAdminRole,
} from "@/lib/api-security";
import {
  serverUploadMaxFileBytes,
  serverUploadMaxRequestBytes,
  validateImageUploadFile,
} from "@/lib/image-upload-security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bucketName = "magazine-assets";
const maxUploadBytes = serverUploadMaxFileBytes;
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

  const payloadTooLarge = enforceContentLength(request, serverUploadMaxRequestBytes);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = await applyPersistentRateLimit(request, {
    identity: auth.user.id,
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

    const validatedFile = await validateUploadFile(file);

    const safeName = sanitizeMagazineStorageFileName(
      file.name || "magazine-image",
      validatedFile.contentType,
      "magazine-image",
    );
    const objectPath = `${auth.user.id}/${randomUUID()}-${safeName}`;
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
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

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
    return apiError(
      error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
      400,
    );
  }
}

async function validateUploadFile(file: File) {
  const validatedFile = await validateImageUploadFile(file, {
    maxBytes: maxUploadBytes,
  });

  if (file.size > maxUploadBytes) {
    throw new Error("이미지 파일은 5MB 이하여야 합니다.");
  }

  if (!allowedUploadTypes.has(validatedFile.contentType)) {
    throw new Error("JPG, PNG, WebP, GIF 이미지만 업로드할 수 있습니다.");
  }
  return validatedFile;
}

function sanitizeMagazineStorageFileName(
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

function safeStorageExtension(_fileName: string, contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  throw new Error("Unsupported upload content type.");
}
