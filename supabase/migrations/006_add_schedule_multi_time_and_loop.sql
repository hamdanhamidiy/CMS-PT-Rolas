-- Migration 006: Add loop_count and start_times to schedules table
-- PT Rolas Nusantara Medika — Digital Signage CMS

ALTER TABLE schedules 
  ADD COLUMN IF NOT EXISTS loop_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS start_times JSONB DEFAULT '["08:00"]'::jsonb;

-- Index for faster querying
CREATE INDEX IF NOT EXISTS idx_schedules_start_times ON schedules USING gin(start_times);
