-- Fix RLS Policies for Profiles and Activity Logs

-- 1. Enable INSERT on profiles for authenticated users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Profiles insertable by authenticated'
  ) THEN
    CREATE POLICY "Profiles insertable by authenticated" ON profiles
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- 2. Enable INSERT on activity_logs for anon (system fallbacks) if not existing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Activity logs insertable by anon'
  ) THEN
    CREATE POLICY "Activity logs insertable by anon" ON activity_logs
      FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;
