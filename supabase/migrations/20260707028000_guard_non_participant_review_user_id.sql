-- Host, admin, and imported reviews are editorial records, not participant-owned
-- user reviews. Keep user ownership attached only to participant reviews so
-- account-level "my reviews" and privacy checks cannot misclassify them.
update public.reviews
set
  user_id = null,
  updated_at = now()
where source <> 'participant'
  and user_id is not null;

alter table public.reviews
  drop constraint if exists reviews_non_participant_user_id_chk;

alter table public.reviews
  add constraint reviews_non_participant_user_id_chk
  check (
    source = 'participant'
    or user_id is null
  );
