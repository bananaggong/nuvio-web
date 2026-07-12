drop table if exists public.program_lead_decisions;
drop table if exists public.program_leads;
drop table if exists public.external_announcements;
drop table if exists public.external_announcement_sources;

alter table if exists public.announcements
  drop column if exists source_id,
  drop column if exists source_name,
  drop column if exists source_url,
  drop column if exists is_external,
  drop column if exists relevance,
  drop column if exists fetched_at;

drop type if exists public.lead_decision;
drop type if exists public.lead_status;
drop type if exists public.lead_confidence;
drop type if exists public.external_source_type;
