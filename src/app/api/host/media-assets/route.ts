import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { canManageHostVillage } from "@/lib/host-village-access";
import { validateImageUploadFile } from "@/lib/image-upload-security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createVillageAsset } from "@/lib/village-assets-db";

export const runtime = "nodejs";

const bucketName = "village-media-assets";
const maxImageUploadBytes = 8 * 1024 * 1024;
const maxVideoUploadBytes = 50 * 1024 * 1024;
const maxRequestBytes = 64 * 1024 * 1024;

const allowedVideoTypes = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, maxRequestBytes);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
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
      throw new Error("업로드할 파일을 선택해 주세요.");
    }

    const villageSlug = asString(formData.get("villageSlug")) || "boseong";
    if (!(await canManageHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this channel.", 403);
    }

    const kind = await validateMediaFile(file);
    const uploadContentType = normalizeMediaContentType(file.type);
    const usage = sanitizePathSegment(asString(formData.get("usage")) || `gallery-${kind}`);
    const safeName = sanitizeStorageFileName(
      file.name || `gallery-${kind}`,
      uploadContentType,
      kind,
    );
    const objectPath = [
      sanitizePathSegment(villageSlug),
      usage,
      `${Date.now()}-${safeName}`,
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
        contentType: uploadContentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = admin.storage.from(bucketName).getPublicUrl(objectPath);
    const asset = await createVillageAsset({
      altText: asString(formData.get("altText")),
      fileName: safeName,
      metadata: {
        contentType: uploadContentType,
        kind,
        size: file.size,
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
          contentType: uploadContentType,
          fileName: safeName,
          kind,
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
          error instanceof Error ? error.message : "미디어 파일을 업로드하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

async function validateMediaFile(file: File): Promise<"image" | "video"> {
  const contentType = normalizeMediaContentType(file.type);

  if (contentType.startsWith("image/")) {
    await validateImageUploadFile(file, { maxBytes: maxImageUploadBytes });
    return "image";
  }

  if (!allowedVideoTypes.has(contentType)) {
    throw new Error("MP4, MOV, WebM 영상만 업로드할 수 있습니다.");
  }

  if (file.size > maxVideoUploadBytes) {
    throw new Error("영상 파일은 50MB 이하만 업로드할 수 있습니다.");
  }

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const isWebm =
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3;
  const isMp4Like =
    header.length >= 12 &&
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70;

  if (!isWebm && !isMp4Like) {
    throw new Error("영상 파일 형식을 확인할 수 없습니다.");
  }

  return "video";
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

function sanitizePathSegment(value: string): string {
  return (
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96) || "media"
  );
}

function safeStorageExtension(_fileName: string, contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "video/webm") return "webm";
  if (contentType === "video/quicktime") return "mov";
  if (contentType === "video/mp4") return "mp4";
  throw new Error("Unsupported upload content type.");
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMediaContentType(value: string): string {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}
