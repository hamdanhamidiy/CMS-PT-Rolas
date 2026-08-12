-- ============================================
-- Storage Bucket for Media Files
-- ============================================

-- Create a public bucket for media (videos/images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  104857600, -- 100MB max file size
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage policies
CREATE POLICY "Media files are publicly accessible" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');

CREATE POLICY "Authenticated users can update media" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can delete media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'media');
