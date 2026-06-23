import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  villagePageRevisions,
  villagePageSections,
} from "@/db/schema";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import type {
  PublishedVillagePageSection,
  VillagePageKey,
  VillagePageSectionDraft,
  VillagePageSectionStatus,
  VillagePageSectionType,
} from "@/lib/village-page-content";
export { getSectionContent } from "@/lib/village-page-content";
export type {
  PublishedVillagePageSection,
  VillagePageKey,
  VillagePageSectionDraft,
  VillagePageSectionStatus,
  VillagePageSectionType,
} from "@/lib/village-page-content";

type SectionRow = typeof villagePageSections.$inferSelect;
type SectionInsert = typeof villagePageSections.$inferInsert;

const defaultDate = "2026-05-09T00:00:00.000Z";

type VillagePageMutationOptions = {
  allowedVillageSlug?: string;
};

export class VillagePageAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this channel page section.");
    this.name = "VillagePageAccessError";
  }
}

export async function listPublicVillagePageSections(
  villageSlug: string,
  pageKey: VillagePageKey,
): Promise<PublishedVillagePageSection[]> {
  const slug = normalizeSlug(villageSlug);

  try {
    const rows = await getDb()
      .select()
      .from(villagePageSections)
      .where(
        and(
          eq(villagePageSections.villageSlug, slug),
          eq(villagePageSections.pageKey, pageKey),
          isNotNull(villagePageSections.publishedAt),
        ),
      )
      .orderBy(asc(villagePageSections.publishedOrderIndex), asc(villagePageSections.orderIndex));

    const publishedRows = rows
      .map(mapSectionRowToPublished)
      .filter((section): section is PublishedVillagePageSection => Boolean(section));

    return publishedRows.length > 0
      ? publishedRows
      : getPublicPageSectionFallback(slug, pageKey);
  } catch {
    return getPublicPageSectionFallback(slug, pageKey);
  }
}

export async function listHostVillagePageSections(
  villageSlug: string,
  pageKey: VillagePageKey,
): Promise<VillagePageSectionDraft[]> {
  const slug = normalizeSlug(villageSlug);

  try {
    const rows = await getDb()
      .select()
      .from(villagePageSections)
      .where(
        and(
          eq(villagePageSections.villageSlug, slug),
          eq(villagePageSections.pageKey, pageKey),
        ),
      )
      .orderBy(asc(villagePageSections.orderIndex), desc(villagePageSections.updatedAt));

    return rows.length > 0
      ? rows.map(mapSectionRowToDraft)
      : getHostPageSectionFallback(slug, pageKey);
  } catch {
    return getHostPageSectionFallback(slug, pageKey);
  }
}

export async function upsertHostVillagePageSection(
  draft: VillagePageSectionDraft,
  options: VillagePageMutationOptions = {},
): Promise<VillagePageSectionDraft> {
  const insertValue = mapDraftToInsert(draft);
  const now = new Date();
  const allowedVillageSlug = options.allowedVillageSlug
    ? normalizeSlug(options.allowedVillageSlug)
    : undefined;

  assertSectionVillageAccess(insertValue.villageSlug, allowedVillageSlug);

  if (isUuid(draft.id)) {
    const [existingRow] = await getDb()
      .select({
        id: villagePageSections.id,
        villageSlug: villagePageSections.villageSlug,
      })
      .from(villagePageSections)
      .where(eq(villagePageSections.id, draft.id))
      .limit(1);

    if (existingRow) {
      assertSectionVillageAccess(existingRow.villageSlug, allowedVillageSlug);
    }

    const [updatedRow] = await getDb()
      .update(villagePageSections)
      .set({ ...insertValue, updatedAt: now })
      .where(
        allowedVillageSlug
          ? and(
              eq(villagePageSections.id, draft.id),
              eq(villagePageSections.villageSlug, allowedVillageSlug),
            )
          : eq(villagePageSections.id, draft.id),
      )
      .returning();

    if (updatedRow) return mapSectionRowToDraft(updatedRow);
  }

  const [row] = await getDb()
    .insert(villagePageSections)
    .values(insertValue)
    .onConflictDoUpdate({
      target: [
        villagePageSections.villageSlug,
        villagePageSections.pageKey,
        villagePageSections.sectionKey,
      ],
      set: { ...insertValue, updatedAt: now },
    })
    .returning();

  return mapSectionRowToDraft(row);
}

export async function publishHostVillagePageSection(
  draft: VillagePageSectionDraft,
  options: VillagePageMutationOptions = {},
): Promise<VillagePageSectionDraft> {
  const allowedVillageSlug = options.allowedVillageSlug
    ? normalizeSlug(options.allowedVillageSlug)
    : undefined;
  const savedDraft = await upsertHostVillagePageSection(draft, options);
  const now = new Date();

  const [publishedRow] = await getDb()
    .update(villagePageSections)
    .set({
      publishedContent: savedDraft.draftContent,
      publishedOrderIndex: savedDraft.orderIndex,
      publishedVisible: savedDraft.visible,
      status: "published",
      publishedAt: now,
      updatedAt: now,
    })
    .where(
      allowedVillageSlug
        ? and(
            eq(villagePageSections.id, savedDraft.id),
            eq(villagePageSections.villageSlug, allowedVillageSlug),
          )
        : eq(villagePageSections.id, savedDraft.id),
    )
    .returning();

  if (!publishedRow) {
    throw new VillagePageAccessError();
  }

  await getDb().insert(villagePageRevisions).values({
    sectionId: savedDraft.id,
    villageSlug: savedDraft.villageSlug,
    pageKey: savedDraft.pageKey,
    sectionKey: savedDraft.sectionKey,
    content: savedDraft.draftContent,
    orderIndex: savedDraft.orderIndex,
    visible: savedDraft.visible,
  });

  return mapSectionRowToDraft(publishedRow);
}

export function normalizeVillagePageSectionDraft(input: unknown): VillagePageSectionDraft {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Page section payload is required.");
  }

  const value = input as Record<string, unknown>;
  const villageSlug = normalizeSlug(asString(value.villageSlug) || "boseong");
  const pageKey = asPageKey(value.pageKey);
  const sectionKey = createSectionKey(asString(value.sectionKey) || asString(value.label));
  const sectionType = asSectionType(value.sectionType);

  return {
    id: asString(value.id) || `${villageSlug}-${pageKey}-${sectionKey}`,
    villageSlug,
    pageKey,
    sectionKey,
    sectionType,
    label: asString(value.label) || defaultLabel(sectionType),
    draftContent: asRecord(value.draftContent),
    publishedContent: asOptionalRecord(value.publishedContent),
    orderIndex: asInteger(value.orderIndex, 100),
    publishedOrderIndex:
      value.publishedOrderIndex === undefined
        ? undefined
        : asInteger(value.publishedOrderIndex, 100),
    visible: value.visible !== false,
    publishedVisible:
      value.publishedVisible === undefined ? undefined : value.publishedVisible !== false,
    status: asStatus(value.status),
    publishedAt: asOptionalString(value.publishedAt),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
  };
}

export function getDefaultHostVillagePageSections(
  villageSlug: string,
  pageKey: VillagePageKey,
): VillagePageSectionDraft[] {
  return getDefaultPublishedVillagePageSections(villageSlug, pageKey).map((section) => ({
    ...section,
    draftContent: section.content,
    orderIndex: section.orderIndex,
    publishedContent: section.content,
    publishedOrderIndex: section.orderIndex,
    publishedVisible: section.visible,
    status: "published",
    publishedAt: section.publishedAt,
    updatedAt: section.publishedAt ?? defaultDate,
  }));
}

function getPublicPageSectionFallback(
  villageSlug: string,
  pageKey: VillagePageKey,
): PublishedVillagePageSection[] {
  return isDemoModeEnabled()
    ? getDefaultPublishedVillagePageSections(villageSlug, pageKey)
    : [];
}

function getHostPageSectionFallback(
  villageSlug: string,
  pageKey: VillagePageKey,
): VillagePageSectionDraft[] {
  return isDemoModeEnabled()
    ? getDefaultHostVillagePageSections(villageSlug, pageKey)
    : [];
}

function assertSectionVillageAccess(
  villageSlug: string,
  allowedVillageSlug: string | undefined,
) {
  if (!allowedVillageSlug) return;
  if (normalizeSlug(villageSlug) !== allowedVillageSlug) {
    throw new VillagePageAccessError();
  }
}

export function getDefaultPublishedVillagePageSections(
  villageSlug: string,
  pageKey: VillagePageKey,
): PublishedVillagePageSection[] {
  if (normalizeSlug(villageSlug) !== "boseong") {
    return [];
  }

  if (pageKey === "about") {
    return [
      {
        id: "boseong-about-header",
        villageSlug: "boseong",
        pageKey: "about",
        sectionKey: "about_header",
        sectionType: "hero",
        label: "소개 상단",
        content: {
          kicker: "녹차밭 옆에서 살아보는",
          title: "진짜 보성",
          brand: "전체차 LAB",
        },
        orderIndex: 10,
        visible: true,
        publishedAt: defaultDate,
      },
      {
        id: "boseong-about-grid",
        villageSlug: "boseong",
        pageKey: "about",
        sectionKey: "about_grid",
        sectionType: "about_grid",
        label: "소개 본문",
        content: {
          introTitle: "보성 청년마을, 전체차LAB",
          introBody: "전체차(全體茶)는 차(茶)로 모든 것을 담는다는 뜻입니다.",
          rows: [
            {
              title: "보성의 차 문화를 \n실험하는 청년마을 ",
              body:
                "전체차LAB은 \n전남 보성군 회천면 양동·영천마을에 \n뿌리를 두고 있습니다. \n보성의 차 문화를 매개로 청년들이 지역에 \n머물며 콘텐츠, 제품, 경험을 즐겁게 실험하며 \n지역에서 새로운 청년의 삶을 만들고 있습니다.",
              iconSrc: "/boseong/about-icon-0.png",
            },
            {
              title: "연고도 없던\n보성에 반하다",
              body:
                "도심에서 각자의 삶을 살던 2030 청년들이\n연고도 경험도 없던 보성의 매력에 반해\n귀촌을 선택했습니다.\n비슷한 성향의 사람들과 오순도순 모여\n살고 싶다는 바람으로 차를 매개로\n청년의 삶과 지역의 미래를 연결하는\n마을을 그리기 시작했어요.",
              iconSrc: "/boseong/about-icon-1.png",
            },
            {
              title: "그린티모시레",
              body:
                "그린티는 녹차,\n모시레는 전남 방언으로 마을을 뜻합니다. \n보성의 녹차마을에 뿌리를 내리고\n활동을 이어가겠다는 다짐을 담아 만든 청년단체로,\n2025년부터 전체차LAB을 운영하고 있습니다.",
              iconSrc: "/boseong/about-icon-2.png",
            },
            {
              title: "보성 회천면 곳곳에서",
              body:
                "마을 빈집과 창고를 리모델링해 \n우리만의 공간을 만들었습니다.\n숙소 공간 초록, 게스트만을 위한 작은 찻집\n머문 공간, 그리고 재료와 영감을 제공하는\n57ha 녹차밭까지\n보성 회천면 곳곳이 전체차LAB의 현장입니다.",
              iconSrc: "/boseong/about-icon-3.png",
            },
            {
              title: "차를 더 새롭게,\n보성을 더 색다르게",
              body:
                "지역에서 살아가는 청년들의 이야기를 \n영상 콘텐츠로 기록하고, 청년 로컬 크리에이터가 머물고 \n활동할 수 있는 프로그램을 운영합니다. \n차를 더 새롭게, \n보성을 더 색다르게 즐기는 방법을 지금도 실험 중입니다.",
              iconSrc: "/boseong/about-icon-4.png",
            },
          ],
        },
        orderIndex: 20,
        visible: true,
        publishedAt: defaultDate,
      },
    ];
  }

  if (pageKey === "media") {
    return [
      {
        id: "boseong-media-index",
        villageSlug: "boseong",
        pageKey: "media",
        sectionKey: "media_index",
        sectionType: "media_preview",
        label: "전체차LAB 이야기",
        content: {
          title: "전체차LAB 이야기",
          subtitle:
            "보성을 경험하는 새로운 방식, 전체차LAB의 이야기를 만나보세요.",
          href: "/boseong/media",
          limit: 9,
        },
        orderIndex: 10,
        visible: true,
        publishedAt: defaultDate,
      },
    ];
  }

  if (pageKey === "programs") {
    return [
      {
        id: "boseong-programs-index",
        villageSlug: "boseong",
        pageKey: "programs",
        sectionKey: "programs_index",
        sectionType: "media_preview",
        label: "전체차LAB 오리지널",
        content: {
          title: "전체차LAB 오리지널",
          subtitle: "오직 전체차LAB에서만 피어나는 경험을 만나보세요.",
          limit: 12,
        },
        orderIndex: 10,
        visible: true,
        publishedAt: defaultDate,
      },
    ];
  }

  if (pageKey === "reviews") {
    return [
      {
        id: "boseong-reviews-index",
        villageSlug: "boseong",
        pageKey: "reviews",
        sectionKey: "reviews_index",
        sectionType: "reviews_preview",
        label: "전체차LAB 후기",
        content: {
          title: "전체차LAB 후기",
          subtitle: "보성에서 시간을 머문 마음을 이야기합니다.",
          limit: 20,
        },
        orderIndex: 10,
        visible: true,
        publishedAt: defaultDate,
      },
    ];
  }

  if (pageKey === "notice") {
    return [
      {
        id: "boseong-notice-index",
        villageSlug: "boseong",
        pageKey: "notice",
        sectionKey: "notice_index",
        sectionType: "media_preview",
        label: "전체차LAB 소식",
        content: {
          title: "전체차LAB 소식",
          subtitle: "신청, 일정, 운영 안내를 한곳에서 확인하세요.",
          limit: 20,
        },
        orderIndex: 10,
        visible: true,
        publishedAt: defaultDate,
      },
    ];
  }

  return [
    {
      id: "boseong-home-hero",
      villageSlug: "boseong",
      pageKey: "home",
      sectionKey: "home_hero",
      sectionType: "hero",
      label: "홈 히어로",
      content: {
        imageUrl: "/boseong/hero-illustration.png",
        alt: "녹차밭 옆에서 살아보는 진짜 보성",
      },
      orderIndex: 10,
      visible: true,
      publishedAt: defaultDate,
    },
    {
      id: "boseong-home-tea-time",
      villageSlug: "boseong",
      pageKey: "home",
      sectionKey: "home_tea_time",
      sectionType: "image_story",
      label: "녹차밭에서 피어나는 시간",
      content: {
        title: "녹차밭에서 피어나는 시간",
        linkLabel: "녹차밭 옆 이야기들",
        linkHref: "/boseong/media",
        imageUrl: "/boseong/home-tea-time.png",
        alt: "차 한 잔으로 나를 살펴보는 시간",
      },
      orderIndex: 20,
      visible: true,
      publishedAt: defaultDate,
    },
    {
      id: "boseong-home-original-carousel",
      villageSlug: "boseong",
      pageKey: "home",
      sectionKey: "original_carousel",
      sectionType: "original_carousel",
      label: "전체차 오리지널 자동전환",
      content: {
        heading: "JEONCHECHA ORIGINAL",
        slides: [
          {
            title: "숙박비는\n재능으로 받습니다.",
            body:
              "보성에 머무는 시간 동안 나의 재능을 지역과 나누고,\n숙소와 마을을 자연스럽게 오가는 체류 프로그램입니다.",
            hashtags: "#재능교환 #보성살이 #숙박비는재능으로",
            programSlug: "talent-for-stay",
            href: "/boseong/talent-for-stay",
          },
          {
            title: "로컬살롱",
            body:
              "차를 좋아한다는 것만으로 이렇게 가까워질 수 있어요.\n낯선 사람과 차 한 잔을 나누다 보면 어느새 보성의 밤이 깊어집니다.",
            hashtags: "#차담 #보성여행 #차한잔의인연",
            programSlug: "local-salon",
            href: "/boseong/local-salon",
          },
          {
            title: "나를 담는\n차실험",
            body:
              "내가 좋아하는 향, 내가 좋아하는 맛,\n내가 고른 찻잎으로 나만의 차 한 잔을 만듭니다.\n차 한 잔에 나를 담아보세요.",
            hashtags: "#나만의차 #차블렌딩 #차실험실",
            programSlug: "tea-lab",
            href: "/boseong/tea-lab",
          },
        ],
      },
      orderIndex: 30,
      visible: true,
      publishedAt: defaultDate,
    },
    {
      id: "boseong-home-media",
      villageSlug: "boseong",
      pageKey: "home",
      sectionKey: "media_preview",
      sectionType: "media_preview",
      label: "전체차LAB 이야기",
      content: {
        title: "전체차LAB 이야기",
        href: "/boseong/media",
        limit: 3,
      },
      orderIndex: 40,
      visible: true,
      publishedAt: defaultDate,
    },
    {
      id: "boseong-home-reviews",
      villageSlug: "boseong",
      pageKey: "home",
      sectionKey: "reviews_preview",
      sectionType: "reviews_preview",
      label: "전체차LAB 후기",
      content: {
        title: "전체차LAB 후기",
        href: "/boseong/reviews",
        limit: 8,
      },
      orderIndex: 50,
      visible: true,
      publishedAt: defaultDate,
    },
  ];
}

function mapDraftToInsert(draft: VillagePageSectionDraft): SectionInsert {
  return {
    villageSlug: normalizeSlug(draft.villageSlug),
    pageKey: draft.pageKey,
    sectionKey: createSectionKey(draft.sectionKey),
    sectionType: draft.sectionType,
    label: draft.label.trim() || defaultLabel(draft.sectionType),
    draftContent: draft.draftContent,
    orderIndex: draft.orderIndex,
    visible: draft.visible,
    status: draft.status,
  };
}

function mapSectionRowToDraft(row: SectionRow): VillagePageSectionDraft {
  return {
    id: row.id,
    villageSlug: row.villageSlug,
    pageKey: asPageKey(row.pageKey),
    sectionKey: row.sectionKey,
    sectionType: asSectionType(row.sectionType),
    label: row.label,
    draftContent: row.draftContent,
    publishedContent: row.publishedContent ?? undefined,
    orderIndex: row.orderIndex,
    publishedOrderIndex: row.publishedOrderIndex ?? undefined,
    visible: row.visible,
    publishedVisible: row.publishedVisible ?? undefined,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSectionRowToPublished(
  row: SectionRow,
): PublishedVillagePageSection | undefined {
  if (!row.publishedContent || row.publishedVisible === false) {
    return undefined;
  }

  return {
    id: row.id,
    villageSlug: row.villageSlug,
    pageKey: asPageKey(row.pageKey),
    sectionKey: row.sectionKey,
    sectionType: asSectionType(row.sectionType),
    label: row.label,
    content: row.publishedContent,
    orderIndex: row.publishedOrderIndex ?? row.orderIndex,
    visible: row.publishedVisible ?? row.visible,
    publishedAt: row.publishedAt?.toISOString(),
  };
}

function asPageKey(value: unknown): VillagePageKey {
  const text = asString(value);
  if (
    text === "about" ||
    text === "media" ||
    text === "programs" ||
    text === "reviews" ||
    text === "notice"
  ) {
    return text;
  }
  return "home";
}

function asSectionType(value: unknown): VillagePageSectionType {
  const text = asString(value);
  return sectionTypes.includes(text as VillagePageSectionType)
    ? (text as VillagePageSectionType)
    : "image_story";
}

function asStatus(value: unknown): VillagePageSectionStatus {
  const text = asString(value);
  return statuses.includes(text as VillagePageSectionStatus)
    ? (text as VillagePageSectionStatus)
    : "draft";
}

function defaultLabel(type: VillagePageSectionType): string {
  return {
    about_grid: "소개",
    footer: "푸터",
    hero: "히어로",
    image_story: "이미지 스토리",
    media_preview: "미디어",
    original_carousel: "오리지널",
    reviews_preview: "후기",
  }[type];
}

function createSectionKey(value: string): string {
  return (
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/gu, "_")
      .replace(/^_+|_+$/gu, "")
      .slice(0, 72) || `section_${Date.now().toString(36)}`
  );
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  const record = asRecord(value);
  return Object.keys(record).length > 0 ? record : undefined;
}

function asInteger(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : fallback;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown): string | undefined {
  const text = asString(value);
  return text || undefined;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

const sectionTypes: VillagePageSectionType[] = [
  "about_grid",
  "footer",
  "hero",
  "image_story",
  "media_preview",
  "original_carousel",
  "reviews_preview",
];

const statuses: VillagePageSectionStatus[] = ["draft", "published", "archived"];
