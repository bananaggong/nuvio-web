ALTER TABLE village_media_contents
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'link';

ALTER TABLE village_media_contents
  ADD COLUMN IF NOT EXISTS embed_url text;
