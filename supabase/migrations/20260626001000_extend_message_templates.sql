alter table public.message_templates
  add column if not exists template_key text,
  add column if not exists description text,
  add column if not exists is_default boolean not null default false,
  add column if not exists sort_order integer not null default 0;

create index if not exists message_templates_created_by_idx
  on public.message_templates (created_by);

create index if not exists message_templates_template_key_idx
  on public.message_templates (template_key);
