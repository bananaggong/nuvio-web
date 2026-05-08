import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { villageAssets } from "@/db/schema";

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
      altText: input.altText?.trim() || null,
      fileName: input.fileName.trim() || "asset",
      metadata: input.metadata ?? {},
      url: input.url.trim(),
      usage: input.usage?.trim() || "page",
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
      .replace(/[^a-z0-9가-힣]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 72) || "boseong"
  );
}
