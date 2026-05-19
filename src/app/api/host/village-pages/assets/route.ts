import { NextResponse } from "next/server";
import {
  apiError,
  enforceContentLength,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { canManageHostVillage } from "@/lib/host-village-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createVillageAsset,
  listVillageAssets,
} from "@/lib/village-assets-db";

export const runtime = "nodejs";

const bucketName = "village-assets";
const maxUploadBytes = 5 * 1024 * 1024;
const allowedUploadTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function GET(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const villageSlug = searchParams.get("villageSlug") ?? "boseong";
    if (!(await canManageHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this village.", 403);
    }

    const assets = await listVillageAssets(villageSlug);

    return NextResponse.json({ data: assets });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load village assets.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const payloadTooLarge = enforceContentLength(request, 8 * 1024 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      return await handleFileUpload(request);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const url = asString(body.url);

    if (!url) {
      throw new Error("Asset URL is required.");
    }

    const safeUrl = validateAssetUrl(url);
    const villageSlug = asString(body.villageSlug) || "boseong";
    if (!(await canManageHostVillage(auth, villageSlug))) {
      return apiError("You do not have permission to manage this village.", 403);
    }

    const asset = await createVillageAsset({
      altText: asString(body.altText),
      fileName: asString(body.fileName) || filenameFromUrl(safeUrl),
      metadata: { source: "url" },
      url: safeUrl,
      usage: asString(body.usage) || "page",
      villageSlug,
    });

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save village asset.",
      },
      { status: 400 },
    );
  }
}

async function handleFileUpload(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("File is required.");
  }

  validateUploadFile(file);

  const villageSlug = asString(formData.get("villageSlug")) || "boseong";
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;
  if (!(await canManageHostVillage(auth, villageSlug))) {
    return apiError("You do not have permission to manage this village.", 403);
  }

  const usage = asString(formData.get("usage")) || "page";
  const altText = asString(formData.get("altText"));
  const safeName = sanitizeFileName(file.name || "asset");
  const objectPath = `${villageSlug}/${Date.now()}-${safeName}`;
  const admin = createSupabaseAdminClient();

  const { data: buckets } = await admin.storage.listBuckets();
  const bucketExists = buckets?.some((bucket) => bucket.name === bucketName);

  if (!bucketExists) {
    await admin.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: "5MB",
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
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
  const asset = await createVillageAsset({
    altText,
    fileName: safeName,
    metadata: {
      contentType: file.type,
      size: file.size,
      source: "upload",
      storagePath: objectPath,
    },
    url: data.publicUrl,
    usage,
    villageSlug,
  });

  return NextResponse.json({ data: asset }, { status: 201 });
}

function sanitizeFileName(value: string): string {
  return (
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣._-]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 120) || "asset"
  );
}

function validateUploadFile(file: File) {
  if (file.size > maxUploadBytes) {
    throw new Error("File size must be 5MB or less.");
  }

  if (!allowedUploadTypes.has(file.type)) {
    throw new Error("Only JPG, PNG, WebP, and GIF images can be uploaded.");
  }
}

function validateAssetUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Only HTTP(S) asset URLs are allowed.");
    }
    return url.toString();
  } catch {
    throw new Error("A valid asset URL is required.");
  }
}

function filenameFromUrl(value: string): string {
  try {
    const url = new URL(value);
    return sanitizeFileName(url.pathname.split("/").filter(Boolean).pop() ?? "asset");
  } catch {
    return "asset";
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
