import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  apiError,
  applyPersistentRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { canManageHostVillage } from "@/lib/host-village-access";
import {
  sanitizeStorageFileName,
  sanitizeStoragePathSegment,
  serverUploadMaxFileBytes,
  serverUploadMaxRequestBytes,
  validateMediaUploadFile,
} from "@/lib/image-upload-security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createVillageAsset } from "@/lib/village-assets-db";

export const runtime = "nodejs";

const bucketName = "village-media-assets";
const maxImageUploadBytes = serverUploadMaxFileBytes;
const maxVideoUploadBytes = serverUploadMaxFileBytes;
const maxRequestBytes = serverUploadMaxRequestBytes;

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, maxRequestBytes);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = await applyPersistentRateLimit(request, {
    identity: auth.user.id,
    key: "host-media-asset:upload",
    limit: 40,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return apiError("Media asset upload requires multipart/form-data.", 415);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("Select a media file to upload.");
    }

    const villageSlug = asString(formData.get("villageSlug")) || "boseong";
    if (!(await canManageHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this channel.", 403);
    }

    const validated = await validateMediaUploadFile(file, {
      maxImageBytes: maxImageUploadBytes,
      maxVideoBytes: maxVideoUploadBytes,
    });
    const usage = sanitizeStoragePathSegment(
      asString(formData.get("usage")) || `gallery-${validated.kind}`,
      "media",
    );
    const safeName = sanitizeStorageFileName(
      file.name || `gallery-${validated.kind}`,
      validated.contentType,
      validated.kind,
    );
    const objectPath = [
      sanitizeStoragePathSegment(villageSlug, "village"),
      usage,
      `${randomUUID()}-${safeName}`,
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
          "video/mp4",
          "video/quicktime",
          "video/webm",
        ],
        fileSizeLimit: "50MB",
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
    const asset = await createVillageAsset({
      altText: asString(formData.get("altText")),
      fileName: safeName,
      metadata: {
        contentType: validated.contentType,
        kind: validated.kind,
        size: validated.size,
        source: "upload",
        storagePath: objectPath,
      },
      url: data.publicUrl,
      usage,
      villageSlug,
    });

    return NextResponse.json(
      {
        data: {
          asset,
          contentType: validated.contentType,
          fileName: safeName,
          kind: validated.kind,
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
          error instanceof Error
            ? error.message
            : "The media file could not be uploaded.",
      },
      { status: 400 },
    );
  }
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}
