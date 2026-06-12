create table if not exists public.program_inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.program_inquiries(id) on delete cascade,
  sender_role text not null,
  sender_id uuid,
  sender_name text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists program_inquiry_messages_inquiry_id_idx
  on public.program_inquiry_messages(inquiry_id);

create index if not exists program_inquiry_messages_created_at_idx
  on public.program_inquiry_messages(created_at);

create index if not exists program_inquiry_messages_sender_role_idx
  on public.program_inquiry_messages(sender_role);

alter table public.program_inquiry_messages enable row level security;

drop policy if exists "Users can read own inquiry messages" on public.program_inquiry_messages;
create policy "Users can read own inquiry messages"
on public.program_inquiry_messages for select
to authenticated
using (
  exists (
    select 1
    from public.program_inquiries inquiry
    where inquiry.id = inquiry_id
      and (
        inquiry.submitted_by = (select auth.uid())
        or lower(inquiry.contact_email) = any(public.current_user_profile_emails())
      )
  )
);

drop policy if exists "Users can create own inquiry messages" on public.program_inquiry_messages;
create policy "Users can create own inquiry messages"
on public.program_inquiry_messages for insert
to authenticated
with check (
  sender_role = 'user'
  and exists (
    select 1
    from public.program_inquiries inquiry
    where inquiry.id = inquiry_id
      and (
        inquiry.submitted_by = (select auth.uid())
        or lower(inquiry.contact_email) = any(public.current_user_profile_emails())
      )
  )
);

drop policy if exists "Host members can manage own inquiry messages" on public.program_inquiry_messages;
create policy "Host members can manage own inquiry messages"
on public.program_inquiry_messages for all
to authenticated
using (
  exists (
    select 1
    from public.program_inquiries inquiry
    where inquiry.id = inquiry_id
      and (
        public.is_admin()
        or (
          inquiry.village_id is not null
          and public.current_user_can_edit_village(inquiry.village_id)
        )
        or (
          inquiry.program_id is not null
          and public.current_user_can_edit_program(inquiry.program_id)
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.program_inquiries inquiry
    where inquiry.id = inquiry_id
      and (
        public.is_admin()
        or (
          inquiry.village_id is not null
          and public.current_user_can_edit_village(inquiry.village_id)
        )
        or (
          inquiry.program_id is not null
          and public.current_user_can_edit_program(inquiry.program_id)
        )
      )
  )
);

revoke all on table public.program_inquiry_messages from anon, authenticated;
grant select, insert, update, delete on table public.program_inquiry_messages to authenticated;
