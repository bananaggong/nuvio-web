import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { villageAssets } from "@/db/schema";
import { sanitizeJsonRecord } from "@/lib/safe-json";

export type VillageAsset = {
  id: string;
  villageSlug: string;
  fileName: string;
  url: string;
  altText?: string;
  usage: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type AssetRow = typeof villageAssets.$inferSelect;

export async function listVillageAssets(
  villageSlug = "boseong",
): Promise<VillageAsset[]> {
  const rows = await getDb()
    .select()
    .from(villageAssets)
    .where(eq(villageAssets.villageSlug, normalizeSlug(villageSlug)))
    .orderBy(desc(villageAssets.createdAt))
    .limit(200);

  return rows.map(mapAssetRow);
}

export async function createVillageAsset(input: {
  altText?: string;
  fileName: string;
  metadata?: Record<string, unknown>;
  url: string;
  usage?: string;
  villageSlug?: string;
}): Promise<VillageAsset> {
  const [row] = await getDb()
    .insert(villageAssets)
    .values({
      altText: cleanText(input.altText, 300) || null,
      fileName: cleanText(input.fileName, 180) || "asset",
      metadata: sanitizeJsonRecord(input.metadata ?? {}, {
        maxArrayLength: 40,
        maxDepth: 4,
        maxObjectKeys: 40,
        maxStringLength: 1000,
      }),
      url: cleanText(input.url, 2000),
      usage: cleanText(input.usage, 80) || "page",
      villageSlug: normalizeSlug(input.villageSlug ?? "boseong"),
    })
    .returning();

  return mapAssetRow(row);
}

function mapAssetRow(row: AssetRow): VillageAsset {
  return {
    id: row.id,
    villageSlug: row.villageSlug,
    fileName: row.fileName,
    url: row.url,
    altText: row.altText ?? undefined,
    usage: row.usage,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

function normalizeSlug(value: string): string {
  return (
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}_-]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 72) || "boseong"
  );
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}
