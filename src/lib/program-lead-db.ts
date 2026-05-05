import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  externalAnnouncements,
  programLeadDecisions,
  programLeads,
} from "@/db/schema";
import {
  upsertHostProgramDraft,
} from "@/lib/host-program-db";
import type { HostProgramDraft } from "@/lib/host-program-studio";
import type { ProgramLead, ProgramStatus, ThemeKey } from "@/lib/types";

type LeadDecision = "approved" | "rejected";

export async function createDraftFromProgramLead(
  lead: ProgramLead,
): Promise<HostProgramDraft> {
  const draft = buildHostDraftFromLead(lead);
  const savedDraft = await upsertHostProgramDraft(draft);
  await saveProgramLeadDecision(lead, "approved", savedDraft.id);
  return savedDraft;
}

export async function rejectProgramLead(lead: ProgramLead): Promise<void> {
  await saveProgramLeadDecision(lead, "rejected");
}

export function normalizeProgramLeadPayload(input: unknown): ProgramLead {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Program lead payload is required.");
  }

  const value = input as Record<string, unknown>;

  return {
    id: asString(value.id) || `lead-${Date.now()}`,
    title: asString(value.title) || "Untitled lead",
    summary: asString(value.summary),
    sourceAnnouncementId: asString(value.sourceAnnouncementId),
    sourceName: asString(value.sourceName) || "External source",
    sourceUrl: asString(value.sourceUrl) || undefined,
    publishedAt: asIsoDate(value.publishedAt),
    confidence: asConfidence(value.confidence),
    score: asNumber(value.score),
    suggestedRegion: asString(value.suggestedRegion) || undefined,
    suggestedThemes: asThemeArray(value.suggestedThemes),
    suggestedStatus: asProgramStatus(value.suggestedStatus),
    reasons: asStringArray(value.reasons),
  };
}

async function saveProgramLeadDecision(
  lead: ProgramLead,
  decision: LeadDecision,
  draftId?: string,
) {
  const sourceAnnouncementId = await resolveSourceAnnouncementId(
    lead.sourceAnnouncementId,
  );
  const now = new Date();
  const [row] = await getDb()
    .insert(programLeads)
    .values({
      sourceAnnouncementId,
      title: lead.title,
      summary: lead.summary || lead.title,
      sourceName: lead.sourceName,
      sourceUrl: lead.sourceUrl ?? null,
      publishedAt: new Date(lead.publishedAt),
      confidence: lead.confidence,
      score: lead.score,
      suggestedRegion: lead.suggestedRegion ?? null,
      suggestedThemes: lead.suggestedThemes,
      suggestedStatus: lead.suggestedStatus,
      reasons: lead.reasons,
      status: decision === "approved" ? "draftCreated" : "rejected",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: programLeads.sourceAnnouncementId,
      set: {
        title: lead.title,
        summary: lead.summary || lead.title,
        sourceName: lead.sourceName,
        sourceUrl: lead.sourceUrl ?? null,
        publishedAt: new Date(lead.publishedAt),
        confidence: lead.confidence,
        score: lead.score,
        suggestedRegion: lead.suggestedRegion ?? null,
        suggestedThemes: lead.suggestedThemes,
        suggestedStatus: lead.suggestedStatus,
        reasons: lead.reasons,
        status: decision === "approved" ? "draftCreated" : "rejected",
        updatedAt: now,
      },
    })
    .returning({ id: programLeads.id });

  await getDb()
    .insert(programLeadDecisions)
    .values({
      leadId: row.id,
      decision,
      note: draftId ? `Draft created: ${draftId}` : "Decision from admin queue",
    })
    .onConflictDoUpdate({
      target: programLeadDecisions.leadId,
      set: {
        decision,
        note: draftId ? `Draft created: ${draftId}` : "Decision from admin queue",
      },
    });
}

async function resolveSourceAnnouncementId(
  sourceAnnouncementId: string,
): Promise<string | null> {
  if (!sourceAnnouncementId) return null;

  const [row] = await getDb()
    .select({ id: externalAnnouncements.id })
    .from(externalAnnouncements)
    .where(eq(externalAnnouncements.id, sourceAnnouncementId))
    .limit(1);

  return row?.id ?? null;
}

function buildHostDraftFromLead(lead: ProgramLead): HostProgramDraft {
  const today = toDateString(new Date());
  const theme = lead.suggestedThemes[0] ?? "event";
  const status = lead.suggestedStatus === "closed" ? "upcoming" : lead.suggestedStatus;

  return {
    id: `lead-draft-${stableSuffix(lead.id || lead.sourceAnnouncementId)}`,
    title: lead.title,
    region: lead.suggestedRegion ?? "검토 필요",
    city: lead.suggestedRegion ?? "검토 필요",
    summary: lead.summary || lead.title,
    description: `${lead.summary || lead.title}\n\n원문 공고를 확인해 모집 기간, 지원 조건, 신청 링크를 보강하세요.`,
    theme,
    periodKey: "week",
    recruitStart: today,
    recruitEnd: addDays(today, 14),
    activityStart: addDays(today, 30),
    activityEnd: addDays(today, 36),
    target: "지원 대상 확인 필요",
    capacity: "TBD",
    subsidyLabel: lead.suggestedThemes.includes("benefit")
      ? "지원 조건 확인 필요"
      : "혜택 확인 필요",
    subsidyAmount: 0,
    fee: "TBD",
    status,
    sourceName: lead.sourceName,
    sourceUrl: lead.sourceUrl ?? "",
    applyUrl: lead.sourceUrl ?? "",
    phone: "000-0000-0000",
    hashtags: ["NUVIO후보", ...lead.suggestedThemes].slice(0, 8),
    image:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    published: false,
    updatedAt: new Date().toISOString(),
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function asThemeArray(value: unknown): ThemeKey[] {
  const themes = asStringArray(value).filter((item): item is ThemeKey =>
    themeValues.includes(item as ThemeKey),
  );

  return themes.length > 0 ? themes : ["event"];
}

function asProgramStatus(value: unknown): ProgramStatus {
  const text = asString(value);
  return statusValues.includes(text as ProgramStatus)
    ? (text as ProgramStatus)
    : "upcoming";
}

function asConfidence(value: unknown): ProgramLead["confidence"] {
  const text = asString(value);
  return text === "high" || text === "medium" || text === "low" ? text : "low";
}

function asIsoDate(value: unknown): string {
  const parsed = new Date(asString(value));
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function stableSuffix(value: string): string {
  const normalized = value.replace(/[^a-z0-9]/giu, "").slice(-24);
  return normalized || Date.now().toString(36);
}

const themeValues: ThemeKey[] = [
  "short",
  "month",
  "workation",
  "local",
  "returnFarm",
  "event",
  "pet",
  "half",
  "daily",
  "family",
  "easy",
  "benefit",
  "exclusive",
];

const statusValues: ProgramStatus[] = [
  "open",
  "upcoming",
  "closed",
  "earlyClosed",
];
