import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createVillageAsset,
  listVillageAssets,
} from "@/lib/village-assets-db";

export const runtime = "nodejs";

const bucketName = "village-assets";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const villageSlug = searchParams.get("villageSlug") ?? "boseong";
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

    const asset = await createVillageAsset({
      altText: asString(body.altText),
      fileName: asString(body.fileName) || filenameFromUrl(url),
      metadata: { source: "url" },
      url,
      usage: asString(body.usage) || "page",
      villageSlug: asString(body.villageSlug) || "boseong",
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

  const villageSlug = asString(formData.get("villageSlug")) || "boseong";
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
      fileSizeLimit: "10MB",
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
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
