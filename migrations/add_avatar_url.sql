-- migrations/add_avatar_url.sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_url TEXT;
