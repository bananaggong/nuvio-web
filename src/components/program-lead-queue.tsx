"use client";

import Link from "next/link";
import { Check, ExternalLink, Plus, Radar, RotateCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { themeOptions } from "@/lib/data";
import type { ProgramLead } from "@/lib/types";

type ProgramLeadResponse = {
  data?: ProgramLead[];
  meta?: {
    sourceAnnouncementCount?: number;
    candidateCount?: number;
  };
};

type ProgramLeadQueueProps = {
  onCreateDraft: (lead: ProgramLead) => void;
};

type LeadDecision = "approved" | "rejected";
type LeadDecisionMap = Record<string, LeadDecision>;

const confidenceTone: Record<ProgramLead["confidence"], string> = {
  high: "bg-teal-50 text-teal-700 ring-teal-200",
  medium: "bg-amber-50 text-amber-800 ring-amber-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

const confidenceLabel: Record<ProgramLead["confidence"], string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const themeLabelByKey = new Map(themeOptions.map((theme) => [theme.key, theme.label]));
const LEAD_DECISION_STORAGE_KEY = "nuvio:program-lead-decisions";

export function ProgramLeadQueue({ onCreateDraft }: ProgramLeadQueueProps) {
  const [leads, setLeads] = useState<ProgramLead[]>([]);
  const [meta, setMeta] = useState<ProgramLeadResponse["meta"]>();
  const [loading, setLoading] = useState(true);
  const [leadDecisions, setLeadDecisions] = useState<LeadDecisionMap>(
    readStoredLeadDecisions,
  );

  useEffect(() => {
    let active = true;

    async function loadLeads() {
      try {
        const response = await fetch("/api/program-leads", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json()) as ProgramLeadResponse;

        if (active) {
          setLeads(payload.data ?? []);
          setMeta(payload.meta);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLeads();

    return () => {
      active = false;
    };
  }, []);

  function saveDraft(lead: ProgramLead) {
    onCreateDraft(lead);
    saveDecision(lead.id, "approved");
  }

  function rejectLead(lead: ProgramLead) {
    saveDecision(lead.id, "rejected");
  }

function saveDecision(leadId: string, decision: LeadDecision) {
    const next = { ...leadDecisions, [leadId]: decision };
    setLeadDecisions(next);
    window.localStorage.setItem(LEAD_DECISION_STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <Radar className="text-[var(--primary)]" size={20} />
            외부 공고 후보 큐
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            RSS 공지에서 모집/지원사업 가능성이 있는 항목을 자동으로 추려냅니다.
          </p>
        </div>
        <span className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-xs font-black text-slate-600">
          {meta?.candidateCount ?? leads.length} / {meta?.sourceAnnouncementCount ?? 0}건
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {loading ? (
          <p className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-300 p-3 text-sm font-bold text-slate-500">
            <RotateCw className="animate-spin" size={16} />
            후보를 분석하는 중입니다.
          </p>
        ) : leads.length > 0 ? (
          leads.map((lead) => (
            <LeadCard
              decision={leadDecisions[lead.id]}
              key={lead.id}
              lead={lead}
              onReject={rejectLead}
              onSaveDraft={saveDraft}
            />
          ))
        ) : (
          <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            현재 기준으로 프로그램 후보가 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

function readStoredLeadDecisions(): LeadDecisionMap {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(
      window.localStorage.getItem(LEAD_DECISION_STORAGE_KEY) ?? "{}",
    ) as LeadDecisionMap;
  } catch {
    return {};
  }
}

function LeadCard({
  lead,
  decision,
  onSaveDraft,
  onReject,
}: {
  lead: ProgramLead;
  decision?: LeadDecision;
  onSaveDraft: (lead: ProgramLead) => void;
  onReject: (lead: ProgramLead) => void;
}) {
  const approved = decision === "approved";
  const rejected = decision === "rejected";

  return (
    <article
      className={`rounded-md border p-4 ${
        rejected
          ? "border-slate-200 bg-slate-50 opacity-75"
          : "border-slate-200 bg-[var(--surface-muted)]"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-1 text-xs font-black ring-1 ${confidenceTone[lead.confidence]}`}
            >
              신뢰도 {confidenceLabel[lead.confidence]}
            </span>
            <span className="text-xs font-bold text-slate-500">
              점수 {lead.score}
            </span>
            {approved ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-700 ring-1 ring-teal-200">
                <Check size={12} />
                승인
              </span>
            ) : null}
            {rejected ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-200">
                <X size={12} />
                반려
              </span>
            ) : null}
            {lead.suggestedRegion ? (
              <span className="text-xs font-bold text-slate-500">
                {lead.suggestedRegion}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-black text-slate-950">
            {lead.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
            {lead.summary}
          </p>
        </div>
        <div className="flex min-w-fit flex-wrap gap-2">
          <button
            className="inline-flex items-center justify-center gap-1 rounded-md bg-[var(--primary)] px-3 py-2 text-xs font-black text-white disabled:bg-slate-300"
            disabled={approved || rejected}
            onClick={() => onSaveDraft(lead)}
            type="button"
          >
            {approved ? <Check size={13} /> : <Plus size={13} />}
            {approved ? "저장됨" : "초안 저장"}
          </button>
          <button
            className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-rose-200 hover:text-rose-700 disabled:text-slate-400"
            disabled={approved || rejected}
            onClick={() => onReject(lead)}
            type="button"
          >
            <X size={13} />
            반려
          </button>
          {lead.sourceUrl ? (
            <Link
              className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              href={lead.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              원문
              <ExternalLink size={13} />
            </Link>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {lead.suggestedThemes.map((theme) => (
          <span
            className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-500"
            key={theme}
          >
            {themeLabelByKey.get(theme) ?? theme}
          </span>
        ))}
        {lead.reasons.slice(0, 3).map((reason) => (
          <span
            className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-500"
            key={reason}
          >
            {reason}
          </span>
        ))}
      </div>
    </article>
  );
}
