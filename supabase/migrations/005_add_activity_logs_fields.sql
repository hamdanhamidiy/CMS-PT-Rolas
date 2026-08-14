-- Migration 005: Add extra fields to activity_logs table for location, IP address, target device, user agent, status, and metadata
-- PT Rolas Nusantara Medika — Digital Signage CMS

ALTER TABLE activity_logs 
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS target_device TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for faster location and IP filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_ip ON activity_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON activity_logs(status);
