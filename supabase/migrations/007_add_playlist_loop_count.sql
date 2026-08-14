-- Migration 007: Add loop_count to playlists table
-- PT Rolas Nusantara Medika — Digital Signage CMS

ALTER TABLE playlists
  ADD COLUMN IF NOT EXISTS loop_count INTEGER DEFAULT 3;
