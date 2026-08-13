'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileVideo,
  FileImage,
  X,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatFileSize } from '@/lib/utils';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Supabase Free Plan limit)
const ACCEPTED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export default function UploadMediaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error('Format file tidak didukung', {
        description: 'Gunakan MP4, WebM, OGG, JPEG, PNG, WebP, atau GIF.',
      });
      return;
    }

    if (f.size > MAX_FILE_SIZE) {
      toast.error('File melebihi batas Supabase Free Plan (50 MB)', {
        description: `Ukuran file Anda ${formatFileSize(f.size)}. Silakan kompres video menjadi di bawah 50 MB.`,
      });
      return;
    }

    setFile(f);
    setTitle(f.name.replace(/\.[^/.]+$/, ''));

    // Generate preview
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else if (f.type.startsWith('video/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const uploadWithRealProgress = (
    supabase: ReturnType<typeof createClient>,
    fileName: string,
    fileToUpload: File,
    onProgress: (pct: number) => void
  ) => {
    return new Promise<{ path: string }>((resolve, reject) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      supabase.auth.getSession().then(({ data: sessionData }) => {
        const token = sessionData.session?.access_token || anonKey;
        const xhr = new XMLHttpRequest();
        const url = `${supabaseUrl}/storage/v1/object/media/${fileName}`;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && e.total > 0) {
            const percent = Math.round((e.loaded / e.total) * 90);
            onProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ path: fileName });
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.message || err.error || `Upload gagal (HTTP ${xhr.status})`));
            } catch {
              reject(new Error(`Upload gagal dengan status HTTP ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Koneksi terputus saat mengunggah (ERR_CONNECTION_RESET). Periksa jaringan internet Anda atau kompres file.'));
        });

        xhr.addEventListener('timeout', () => {
          reject(new Error('Waktu pengunggahan habis (Timeout). Koneksi jaringan lambat.'));
        });

        xhr.open('POST', url);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('apikey', anonKey || '');
        xhr.setRequestHeader('cache-control', '3600');
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.send(fileToUpload);
      }).catch(reject);
    });
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error('Lengkapi form', { description: 'Judul dan file wajib diisi.' });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const supabase = createClient();

      // 1. Upload file to Supabase Storage with REAL progress tracking
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      try {
        await uploadWithRealProgress(supabase, fileName, file, (pct) => {
          setProgress(pct);
        });
      } catch (uploadErr: any) {
        // Fallback to standard Supabase upload if XHR fails
        const { error: fallbackErr } = await supabase.storage
          .from('media')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (fallbackErr) {
          throw new Error(uploadErr?.message || fallbackErr.message);
        }
      }

      setProgress(95);

      // 2. Get public URL
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);

      // 3. Get video duration if applicable
      let duration: number | null = null;
      if (file.type.startsWith('video/')) {
        duration = await getVideoDuration(file);
      }

      // 4. Insert into database with profile safety fallback
      let createdBy: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

          if (!existingProfile) {
            await supabase.from('profiles').upsert({
              id: user.id,
              email: user.email || 'admin@rolasmedika.co.id',
              full_name: user.user_metadata?.full_name || 'Admin User',
              role: 'admin',
            });
          }
          createdBy = user.id;
        }
      } catch {
        createdBy = null;
      }

      let { error: dbError } = await supabase.from('media').insert({
        title: title.trim(),
        description: description.trim() || null,
        file_url: urlData.publicUrl,
        file_name: file.name,
        media_type: file.type.startsWith('video/') ? 'video' : 'image',
        duration,
        file_size: file.size,
        created_by: createdBy,
      });

      // Retry with created_by = null if foreign key constraint failed
      if (dbError) {
        const { error: retryError } = await supabase.from('media').insert({
          title: title.trim(),
          description: description.trim() || null,
          file_url: urlData.publicUrl,
          file_name: file.name,
          media_type: file.type.startsWith('video/') ? 'video' : 'image',
          duration,
          file_size: file.size,
          created_by: null,
        });
        dbError = retryError;
      }

      if (dbError) {
        toast.error('Gagal menyimpan metadata', { description: dbError.message });
        setUploading(false);
        return;
      }

      // 5. Log activity
      if (createdBy) {
        try {
          await supabase.from('activity_logs').insert({
            user_id: createdBy,
            action: 'upload_media',
            entity_type: 'media',
            details: `Upload media: ${title.trim()}`,
          });
        } catch {
          // Ignore activity log failure
        }
      }

      setProgress(100);
      toast.success('Media berhasil diunggah');

      setTimeout(() => {
        router.push('/media');
      }, 500);
    } catch (err: any) {
      toast.error('Gagal mengunggah file', {
        description: err.message || 'Terjadi kesalahan saat mengunggah.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Link href="/media" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Media Library
      </Link>

      <Card className="border border-[var(--color-border)] shadow-none bg-white">
        <CardContent className="p-6 space-y-6">
          {/* Drop zone */}
          {!file ? (
            <div
              className={`drop-zone p-10 text-center cursor-pointer ${dragActive ? 'active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto text-[var(--color-text-tertiary)] mb-3" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Seret & letakkan file di sini
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                atau klik untuk memilih file
              </p>
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2">
                MP4, WebM, JPEG, PNG, WebP, GIF — Maks. {formatFileSize(MAX_FILE_SIZE)}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative aspect-video bg-[var(--color-bg-tertiary)] rounded-lg overflow-hidden">
                {file.type.startsWith('image/') && preview ? (
                  <img src={preview} alt="" className="w-full h-full object-contain" />
                ) : file.type.startsWith('video/') && preview ? (
                  <video src={preview} className="w-full h-full" controls />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileVideo className="w-12 h-12 text-[var(--color-text-tertiary)]" />
                  </div>
                )}
                {!uploading && (
                  <button
                    onClick={() => { setFile(null); setPreview(null); setTitle(''); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                {file.type.startsWith('video/') ? (
                  <FileVideo className="w-4 h-4" />
                ) : (
                  <FileImage className="w-4 h-4" />
                )}
                <span>{file.name}</span>
                <span>•</span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Judul <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul media"
                disabled={uploading}
                className="h-10"
              />
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                Judul yang jelas akan memudahkan pencarian media
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi <span className="text-slate-400 text-[11px] font-normal">(Opsional)</span></Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan isi atau tujuan media ini..."
                disabled={uploading}
                rows={3}
              />
            </div>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">Mengunggah...</span>
                <span className="font-medium text-[var(--color-primary)]">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Link href="/media">
              <Button variant="outline" disabled={uploading}>
                Batal
              </Button>
            </Link>
            <Button
              onClick={handleUpload}
              disabled={!file || !title.trim() || uploading}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white btn-press"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengunggah...
                </>
              ) : progress === 100 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Selesai
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };
    video.onerror = () => resolve(null);
    video.src = URL.createObjectURL(file);
  });
}
