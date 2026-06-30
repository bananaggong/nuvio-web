import { NextResponse } from "next/server";
import {
  apiError,
  applyRateLimit,
  enforceContentLength,
  enforceSameOrigin,
  type ApiAuthContext,
  isApiAuthError,
  requireHostRole,
} from "@/lib/api-security";
import { listManageableHostVillageWorkspaces } from "@/lib/host-village-access";
import { validateImageUploadFile } from "@/lib/image-upload-security";
import { getProgramRecordByIdentifier } from "@/lib/program-db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bucketName = "program-assets";
const maxUploadBytes = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireHostRole();
  if (isApiAuthError(auth)) return auth.response;

  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const payloadTooLarge = enforceContentLength(request, 8 * 1024 * 1024);
  if (payloadTooLarge) return payloadTooLarge;

  const limited = applyRateLimit(request, {
    key: "host-program-asset:upload",
    limit: 30,
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
      throw new Error("Please choose an image file.");
    }

    await validateUploadFile(file);

    const requestedProgramId = asString(formData.get("programId"));
    const programAccessError = await validateProgramAssetAccess(
      requestedProgramId,
      auth,
    );
    if (programAccessError) return programAccessError;

    const programId = sanitizePathSegment(requestedProgramId || "draft");
    const usage = sanitizePathSegment(asString(formData.get("usage")) || "image");
    const safeName = sanitizeFileName(file.name || "program-image", file.type, "program-image");
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
          error instanceof Error ? error.message : "Failed to upload the image.",
      },
      { status: 400 },
    );
  }
}

function sanitizeFileName(value: string, contentType: string, fallback: string): string {
  const extension = safeExtension(value, contentType);
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
      .slice(0, 96) || "draft"
  );
}

function safeExtension(fileName: string, contentType: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["gif", "jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  if (contentType === "image/gif") return "gif";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

async function validateUploadFile(file: File) {
  await validateImageUploadFile(file, { maxBytes: maxUploadBytes });
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

async function validateProgramAssetAccess(
  programId: string,
  auth: ApiAuthContext,
): Promise<NextResponse | null> {
  if (!isUuid(programId) || auth.profile.role === "admin") return null;

  const program = await getProgramRecordByIdentifier(programId);
  if (!program) return null;

  const allowedVillageIds = (await listManageableHostVillageWorkspaces(auth)).map(
    (workspace) => workspace.villageId,
  );

  if (!program.villageId || !allowedVillageIds.includes(program.villageId)) {
    return apiError("You do not have permission to upload assets for this program.", 403);
  }

  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
