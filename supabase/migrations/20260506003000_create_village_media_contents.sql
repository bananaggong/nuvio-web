DO $$ BEGIN
  CREATE TYPE village_media_category AS ENUM ('original', 'broadcast', 'archive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS village_media_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  village_slug text NOT NULL,
  title text NOT NULL,
  category village_media_category NOT NULL,
  summary text NOT NULL,
  body jsonb NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url text NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS village_media_contents_legacy_id_idx
  ON village_media_contents (legacy_id);

CREATE INDEX IF NOT EXISTS village_media_contents_village_slug_idx
  ON village_media_contents (village_slug);

CREATE INDEX IF NOT EXISTS village_media_contents_published_at_idx
  ON village_media_contents (published_at);
