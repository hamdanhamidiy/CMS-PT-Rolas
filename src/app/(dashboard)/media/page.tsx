'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Image as ImageIcon,
  Search,
  Trash2,
  Upload,
  FileVideo,
  FileImage,
  Loader2,
  Grid3X3,
  List,
  Eye,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import type { Media } from '@/lib/types';
import { formatFileSize, formatDuration, formatDateTime, getMediaTypeLabel } from '@/lib/utils';
import { toast } from 'sonner';

export default function MediaPage() {
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<Media[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'video' | 'image'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [previewMedia, setPreviewMedia] = useState<Media | null>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false });
    setMedia(data || []);
    setLoading(false);
  };

  const handleDelete = async (item: Media) => {
    const supabase = createClient();

    if (item.file_url) {
      const path = item.file_url.split('/media/')[1];
      if (path) {
        await supabase.storage.from('media').remove([path]);
      }
    }

    const { error } = await supabase.from('media').delete().eq('id', item.id);
    if (error) {
      toast.error('Gagal menghapus media');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'delete_media',
        entity_type: 'media',
        entity_id: item.id,
        details: `Menghapus media: ${item.title}`,
      });
    }

    toast.success('Media berhasil dihapus');
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
  };

  const filtered = media.filter((m) => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || m.media_type === filter;
    return matchSearch && matchFilter;
  });

  const totalStorage = media.reduce((sum, m) => sum + (m.file_size || 0), 0);
  const videoCount = media.filter(m => m.media_type === 'video').length;
  const imageCount = media.filter(m => m.media_type === 'image').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="pb-10 space-y-5">
      
      {/* ── Integrated Corporate Header Bar (No Bulky Cards) ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Library Media
            </h1>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {media.length} Total
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
                {videoCount} Video
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {imageCount} Gambar
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                {formatFileSize(totalStorage)}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Kelola dan unggah berkas video serta gambar untuk tampilan layar digital signage Anda.
          </p>
        </div>

        <Link href="/media/upload">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-2xs transition-all active:scale-[0.98]">
            <Upload className="w-3.5 h-3.5" />
            Upload Media Baru
          </button>
        </Link>
      </header>

      {/* ── Toolbar Search & Filter Controls ── */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama berkas media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 text-xs bg-slate-50/60 border-slate-200/60 rounded-lg focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            {(['all', 'video', 'image'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  filter === f
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f === 'all' ? 'Semua' : f === 'video' ? 'Video' : 'Gambar'}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setView('grid')}
              className={`p-1 rounded-md transition-all ${
                view === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1 rounded-md transition-all ${
                view === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Media Grid / List Display ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            {search ? 'Tidak ada media yang cocok' : 'Belum Ada Media'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-normal max-w-sm mx-auto">
            {search ? 'Coba kata kunci pencarian yang berbeda.' : 'Mulai mengunggah gambar atau video pertama Anda untuk ditampilkan pada layar.'}
          </p>
          {!search && (
            <Link href="/media/upload">
              <button className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-2xs transition-all">
                <Plus className="w-3.5 h-3.5" />
                Upload Sekarang
              </button>
            </Link>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
            >
              {/* Thumbnail Container */}
              <div className="aspect-video bg-slate-900 relative overflow-hidden flex items-center justify-center">
                {item.media_type === 'image' && item.file_url ? (
                  <img
                    src={item.file_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <FileVideo className="w-8 h-8 text-blue-400" />
                  </div>
                )}

                {item.media_type === 'video' && item.duration && (
                  <span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/10">
                    {formatDuration(item.duration)}
                  </span>
                )}

                {/* Hover Preview Overlay */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <button
                    onClick={() => setPreviewMedia(item)}
                    className="px-3.5 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-semibold shadow-md hover:bg-slate-100 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    Preview
                  </button>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      item.media_type === 'video'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {getMediaTypeLabel(item.media_type)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {formatFileSize(item.file_size)}
                    </span>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl border-slate-200">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-slate-900 font-bold">Hapus Media?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 text-xs">
                          Media &quot;{item.title}&quot; akan dihapus secara permanen dari server.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-lg text-xs font-semibold">Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(item)}
                          className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                        >
                          Hapus Permanen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[11px]">Nama File</th>
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[11px]">Tipe</th>
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[11px]">Durasi</th>
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[11px]">Ukuran</th>
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[11px]">Tanggal Upload</th>
                  <th className="text-right font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[11px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          {item.media_type === 'video' ? (
                            <FileVideo className="w-4 h-4" />
                          ) : (
                            <FileImage className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        item.media_type === 'video'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {getMediaTypeLabel(item.media_type)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500 font-normal">
                      {formatDuration(item.duration)}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500 font-normal">
                      {formatFileSize(item.file_size)}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-400 font-normal">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewMedia(item)}
                          className="p-1 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl border-slate-200">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-slate-900 font-bold">Hapus Media?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-500 text-xs">
                                Media &quot;{item.title}&quot; akan dihapus secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-lg text-xs font-semibold">Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item)} className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold">
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
        <DialogContent className="max-w-2xl rounded-2xl border-slate-200 p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">{previewMedia?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
            {previewMedia?.media_type === 'video' ? (
              <video
                src={previewMedia.file_url}
                controls
                className="w-full h-full"
                autoPlay
              />
            ) : previewMedia?.file_url ? (
              <img
                src={previewMedia.file_url}
                alt={previewMedia.title}
                className="w-full h-full object-contain"
              />
            ) : null}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 font-normal">
            <span className="font-semibold text-slate-700">{previewMedia && getMediaTypeLabel(previewMedia.media_type)}</span>
            <span>•</span>
            <span>{previewMedia && formatFileSize(previewMedia.file_size)}</span>
            {previewMedia?.duration && (
              <>
                <span>•</span>
                <span>{formatDuration(previewMedia.duration)}</span>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
