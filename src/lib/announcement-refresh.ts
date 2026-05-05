import {
  fetchExternalAnnouncementResults,
  getAnnouncementRefreshSeconds,
  getRuntimeExternalAnnouncementSources,
} from "@/lib/live-announcements";
import { persistAnnouncementFetchResults } from "@/lib/external-announcement-db";
import { buildProgramLeadsFromAnnouncements } from "@/lib/program-leads";
import { persistProgramLeads } from "@/lib/program-lead-db";

export type AnnouncementRefreshResult = {
  refreshedAt: string;
  refreshSeconds: number;
  sourceCount: number;
  fetchedAnnouncementCount: number;
  persistedAnnouncementCount: number;
  candidateLeadCount: number;
  persistedLeadCount: number;
  errors: Array<{ sourceId: string; message: string }>;
};

export async function refreshExternalAnnouncementPipeline(): Promise<AnnouncementRefreshResult> {
  const sources = await getRuntimeExternalAnnouncementSources();
  const sourceResults = await fetchExternalAnnouncementResults(sources);
  const externalAnnouncements = sourceResults.flatMap((result) => result.items);
  const persistenceResult = await persistAnnouncementFetchResults(sourceResults);
  const leads = buildProgramLeadsFromAnnouncements(externalAnnouncements, {
    limit: 80,
  });
  const leadPersistenceResult = await persistProgramLeads(leads);

  return {
    refreshedAt: new Date().toISOString(),
    refreshSeconds: getAnnouncementRefreshSeconds(),
    sourceCount: sourceResults.length,
    fetchedAnnouncementCount: externalAnnouncements.length,
    persistedAnnouncementCount: persistenceResult.insertedAnnouncementCount,
    candidateLeadCount: leads.length,
    persistedLeadCount: leadPersistenceResult.upsertedLeadCount,
    errors: persistenceResult.errors,
  };
}
