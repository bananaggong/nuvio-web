create table if not exists public.program_auto_replies (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  village_id uuid references public.villages(id) on delete set null,
  enabled boolean not null default true,
  greeting text not null,
  items jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists program_auto_replies_program_id_idx
  on public.program_auto_replies(program_id);

create index if not exists program_auto_replies_village_id_idx
  on public.program_auto_replies(village_id);

alter table public.program_auto_replies enable row level security;

drop policy if exists "Anyone can read enabled program auto replies" on public.program_auto_replies;
create policy "Anyone can read enabled program auto replies"
on public.program_auto_replies for select
to anon, authenticated
using (enabled = true);

drop policy if exists "Host members can manage own program auto replies" on public.program_auto_replies;
create policy "Host members can manage own program auto replies"
on public.program_auto_replies for all
to authenticated
using (
  public.is_admin()
  or (
    village_id is not null
    and public.current_user_can_edit_village(village_id)
  )
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
)
with check (
  public.is_admin()
  or (
    village_id is not null
    and public.current_user_can_edit_village(village_id)
  )
  or (
    program_id is not null
    and public.current_user_can_edit_program(program_id)
  )
);

revoke all on table public.program_auto_replies from anon, authenticated;
grant select on table public.program_auto_replies to anon, authenticated;
grant insert, update, delete on table public.program_auto_replies to authenticated;
