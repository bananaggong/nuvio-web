ALTER TABLE village_media_contents
  ADD COLUMN IF NOT EXISTS image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE village_media_contents
SET image_urls = jsonb_build_array(thumbnail_url)
WHERE image_urls = '[]'::jsonb
  AND thumbnail_url <> '';
