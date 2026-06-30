create or replace function public.review_image_url_is_safe(image_url text)
returns boolean
language sql
immutable
as $$
  select image_url is not null
    and char_length(image_url) between 1 and 2048
    and image_url !~ '[[:space:][:cntrl:]]'
    and position('<' in image_url) = 0
    and position('>' in image_url) = 0
    and position('"' in image_url) = 0
    and position(chr(39) in image_url) = 0
    and position(chr(92) in image_url) = 0
    and position('@' in image_url) = 0
    and (
      image_url ~ '^https://[^/?#]+'
      or (left(image_url, 1) = '/' and left(image_url, 2) <> '//')
    );
$$;

create or replace function public.review_images_are_safe(image_values jsonb)
returns boolean
language sql
immutable
as $$
  select case
    when coalesce(jsonb_typeof(image_values), '') <> 'array' then false
    else jsonb_array_length(image_values) <= 6
      and not exists (
        select 1
        from jsonb_array_elements(image_values) image_item(value)
        where jsonb_typeof(image_item.value) <> 'string'
          or not public.review_image_url_is_safe(image_item.value #>> '{}')
      )
  end;
$$;

revoke all on function public.review_image_url_is_safe(text) from public;
revoke all on function public.review_images_are_safe(jsonb) from public;
grant execute on function public.review_image_url_is_safe(text) to authenticated;
grant execute on function public.review_images_are_safe(jsonb) to authenticated;

update public.reviews review
set images = coalesce(
  (
    select jsonb_agg(filtered.image_value order by filtered.first_position)
    from (
      select
        image_item.value as image_value,
        min(image_item.image_position) as first_position
      from jsonb_array_elements(
        case when jsonb_typeof(review.images) = 'array' then review.images else '[]'::jsonb end
      ) with ordinality as image_item(value, image_position)
      where jsonb_typeof(image_item.value) = 'string'
        and public.review_image_url_is_safe(image_item.value #>> '{}')
      group by image_item.value
      order by min(image_item.image_position)
      limit 6
    ) filtered
  ),
  '[]'::jsonb
)
where not public.review_images_are_safe(coalesce(review.images, '[]'::jsonb));

alter table public.reviews
  drop constraint if exists reviews_images_shape_chk;

alter table public.reviews
  add constraint reviews_images_shape_chk
  check (public.review_images_are_safe(images));