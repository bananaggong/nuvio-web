import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireAuthenticatedUser,
} from "@/lib/api-security";
import {
  sanitizeStorageFileName,
  sanitizeStoragePathSegment,
  serverUploadMaxFileBytes,
  serverUploadMaxRequestBytes,
  validateImageUploadFile,
} from "@/lib/image-upload-security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bucketName = "review-images";
const maxImageUploadBytes = serverUploadMaxFileBytes;
const maxRequestBytes = serverUploadMaxRequestBytes;

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, maxRequestBytes);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = await applyPersistentRateLimit(request, {
    identity: auth.user.id,
    key: "me-review-image:upload",
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return apiError("Review image upload requires multipart/form-data.", 415);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("업로드할 사진을 선택해 주세요.");
    }

    const validated = await validateImageUploadFile(file, {
      maxBytes: maxImageUploadBytes,
    });
    const applicationId = asString(formData.get("applicationId"));
    const safeFileName = sanitizeStorageFileName(
      file.name || "review-image",
      validated.contentType,
      "review-image",
    );
    const objectPath = [
      sanitizeStoragePathSegment(auth.user.id, "user"),
      sanitizeStoragePathSegment(applicationId || "general", "review"),
      `${randomUUID()}-${safeFileName}`,
    ].join("/");
    const admin = createSupabaseAdminClient();

    const { data: buckets } = await admin.storage.listBuckets();
    const bucketExists = buckets?.some((bucket) => bucket.name === bucketName);
    if (!bucketExists) {
      await admin.storage.createBucket(bucketName, {
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ],
        fileSizeLimit: "8MB",
        public: true,
      });
    }

    const { error: uploadError } = await admin.storage
      .from(bucketName)
      .upload(objectPath, file, {
        contentType: validated.contentType,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data } = admin.storage.from(bucketName).getPublicUrl(objectPath);

    return NextResponse.json(
      {
        data: {
          contentType: validated.contentType,
          fileName: safeFileName,
          size: validated.size,
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
          error instanceof Error ? error.message : "사진을 업로드하지 못했어요.",
      },
      { status: 400 },
    );
  }
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}
