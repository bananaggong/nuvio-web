-- Run the publish safety guard not only when status changes, but also when
-- content on an already-published review changes. Otherwise high-risk content
-- can be saved into a published review and only hidden afterward by a hold.
drop trigger if exists reviews_prevent_publish_with_active_hold on public.reviews;

create trigger reviews_prevent_publish_with_active_hold
before insert or update of status, title, excerpt, body, images
on public.reviews
for each row
execute function public.prevent_review_publish_with_active_hold();
