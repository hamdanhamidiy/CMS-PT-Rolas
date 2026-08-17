-- Migration 008: Add loop_mode to playlist_items table
-- PT Rolas Nusantara Medika — Digital Signage CMS

ALTER TABLE playlist_items
  ADD COLUMN IF NOT EXISTS loop_mode TEXT DEFAULT 'kontinu' CHECK (loop_mode IN ('kontinu', 'sinkronisasi'));
