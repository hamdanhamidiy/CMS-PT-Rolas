-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update own
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Screens: authenticated users can CRUD
CREATE POLICY "Screens viewable by authenticated" ON screens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Screens insertable by authenticated" ON screens
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Screens updatable by authenticated" ON screens
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Screens deletable by authenticated" ON screens
  FOR DELETE TO authenticated USING (true);

-- Screens: anonymous can read (for player activation)
CREATE POLICY "Screens viewable by anon for player" ON screens
  FOR SELECT TO anon USING (true);

-- Screen Activations: authenticated CRUD, anon can read (for player)
CREATE POLICY "Activations viewable by authenticated" ON screen_activations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Activations insertable by authenticated" ON screen_activations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Activations viewable by anon" ON screen_activations
  FOR SELECT TO anon USING (true);

CREATE POLICY "Activations updatable by anon" ON screen_activations
  FOR UPDATE TO anon USING (true);

-- Media: authenticated CRUD
CREATE POLICY "Media viewable by authenticated" ON media
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Media insertable by authenticated" ON media
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Media updatable by authenticated" ON media
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Media deletable by authenticated" ON media
  FOR DELETE TO authenticated USING (true);

-- Media: anon can read (for player)
CREATE POLICY "Media viewable by anon" ON media
  FOR SELECT TO anon USING (true);

-- Playlists: authenticated CRUD
CREATE POLICY "Playlists viewable by authenticated" ON playlists
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Playlists insertable by authenticated" ON playlists
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Playlists updatable by authenticated" ON playlists
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Playlists deletable by authenticated" ON playlists
  FOR DELETE TO authenticated USING (true);

-- Playlists: anon can read (for player)
CREATE POLICY "Playlists viewable by anon" ON playlists
  FOR SELECT TO anon USING (true);

-- Playlist Items: authenticated CRUD, anon read
CREATE POLICY "Playlist items viewable by authenticated" ON playlist_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Playlist items insertable by authenticated" ON playlist_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Playlist items updatable by authenticated" ON playlist_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Playlist items deletable by authenticated" ON playlist_items
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Playlist items viewable by anon" ON playlist_items
  FOR SELECT TO anon USING (true);

-- Schedules: authenticated CRUD, anon read
CREATE POLICY "Schedules viewable by authenticated" ON schedules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Schedules insertable by authenticated" ON schedules
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Schedules updatable by authenticated" ON schedules
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Schedules deletable by authenticated" ON schedules
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Schedules viewable by anon" ON schedules
  FOR SELECT TO anon USING (true);

-- Schedule Screens: authenticated CRUD, anon read
CREATE POLICY "Schedule screens viewable by authenticated" ON schedule_screens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Schedule screens insertable by authenticated" ON schedule_screens
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Schedule screens deletable by authenticated" ON schedule_screens
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Schedule screens viewable by anon" ON schedule_screens
  FOR SELECT TO anon USING (true);

-- Heartbeats: authenticated read, anon can insert/read (player sends heartbeats)
CREATE POLICY "Heartbeats viewable by authenticated" ON screen_heartbeats
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Heartbeats insertable by anon" ON screen_heartbeats
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Heartbeats viewable by anon" ON screen_heartbeats
  FOR SELECT TO anon USING (true);

-- Activity Logs: authenticated read/insert
CREATE POLICY "Activity logs viewable by authenticated" ON activity_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Activity logs insertable by authenticated" ON activity_logs
  FOR INSERT TO authenticated WITH CHECK (true);
