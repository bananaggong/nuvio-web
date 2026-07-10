import type { MagazinePostInput } from "@/lib/magazine-db";
import {
  excerptFromHtml,
  hasMagazineContent,
  normalizeMagazineSlug,
  sanitizeMagazineHtml,
} from "@/lib/magazine-content";
import {
  isMagazineCategory,
  isMagazinePostStatus,
  type MagazinePostStatus,
} from "@/lib/magazine-types";
import { sanitizeJsonRecord } from "@/lib/safe-json";
import { sanitizePublicImageUrl } from "@/lib/url-security";

export function normalizeMagazinePostInput(body: unknown): MagazinePostInput {
  const value =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const title = readString(value.title);
  const subtitle = readString(value.subtitle).slice(0, 160);
  const requestedStatus = readString(value.status);
  const status: MagazinePostStatus = isMagazinePostStatus(requestedStatus)
    ? requestedStatus
    : "draft";
  const category = readString(value.category);
  const contentHtml = sanitizeMagazineHtml(readString(value.contentHtml));
  const excerpt =
    readString(value.excerpt).slice(0, 240) || excerptFromHtml(contentHtml, 140);
  const coverImageUrl = validateOptionalUrl(readString(value.coverImageUrl));

  if (!title || title.length > 120) {
    throw new Error("제목을 120자 이내로 입력해 주세요.");
  }

  if (status === "archived") {
    throw new Error("보관 처리는 삭제 버튼을 통해서만 할 수 있습니다.");
  }

  if (!hasMagazineContent(contentHtml)) {
    throw new Error("본문 내용을 입력해 주세요.");
  }

  return {
    category: isMagazineCategory(category) ? category : "local",
    contentHtml,
    contentJson: readRecord(value.contentJson),
    coverImageAlt: readString(value.coverImageAlt).slice(0, 120),
    coverImageUrl,
    excerpt,
    slug: normalizeMagazineSlug(readString(value.slug) || title),
    status,
    subtitle,
    title,
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readRecord(value: unknown): Record<string, unknown> {
  return sanitizeJsonRecord(value, {
    maxArrayLength: 300,
    maxDepth: 12,
    maxObjectKeys: 1200,
    maxStringLength: 5000,
  });
}

function validateOptionalUrl(value: string): string {
  if (!value) return "";

  try {
    return sanitizePublicImageUrl(value, { allowRelative: true });
  } catch {
    throw new Error("대표 이미지는 올바른 URL이어야 합니다.");
  }
}
