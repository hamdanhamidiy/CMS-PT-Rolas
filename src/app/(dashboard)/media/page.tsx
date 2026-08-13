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
  Play,
  HardDrive,
  Film,
  Sparkles,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import type { Media } from '@/lib/types';
import { formatFileSize, formatDuration, formatDateTime, getMediaTypeLabel, logActivity } from '@/lib/utils';
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

    await logActivity(
      supabase,
      'delete_media',
      'media',
      item.id,
      `Menghapus media: ${item.title}`
    );

    toast.success('Media berhasil dihapus');
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
  };

  const filtered = media.filter((m) => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || m.media_type === filter;
    return matchSearch && matchFilter;
  });

  const totalStorage = media.reduce((sum, m) => sum + (m.file_size || 0), 0);
  const videoCount = media.filter((m) => m.media_type === 'video').length;
  const imageCount = media.filter((m) => m.media_type === 'image').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="pb-10 space-y-6">
      
      {/* ═══════════════════════════════════════════
          HERO BANNER — Matching Dashboard Gradient
          ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 animate-fade-in shadow-md">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300 bg-white/[0.08] backdrop-blur-sm px-3 py-1 rounded-full border border-white/[0.06]">
                <Sparkles className="w-3 h-3 text-blue-400" />
                Media Repository
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Library Media & Aset Digital
            </h1>
            <p className="text-sm text-slate-400 font-normal mt-1 max-w-md">
              Kelola koleksi video dan gambar penyiaran untuk tampilan layar TV Digital Signage.
            </p>
          </div>

          <Link href="/media/upload">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-semibold hover:bg-blue-50 shadow-lg shadow-black/20 transition-all active:scale-[0.97] shrink-0">
              <Upload className="w-3.5 h-3.5" />
              Upload Media Baru
            </button>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          BENTO METRICS STRIP
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <div className="stat-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Berkas</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">{media.length} <span className="text-xs font-medium text-slate-400 ml-0.5">Item</span></p>
        </div>

        <div className="stat-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">Video</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Berkas Video</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">{videoCount} <span className="text-xs font-medium text-slate-400 ml-0.5">Video</span></p>
        </div>

        <div className="stat-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <FileImage className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Gambar</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Berkas Gambar</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">{imageCount} <span className="text-xs font-medium text-slate-400 ml-0.5">Gambar</span></p>
        </div>

        <div className="stat-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Storage</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kapasitas Digunakan</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">{formatFileSize(totalStorage)}</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          FILTER & SEARCH TOOLBAR
          ═══════════════════════════════════════════ */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama berkas media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9.5 text-xs bg-slate-50/70 border-slate-200/80 rounded-xl focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Type Filters */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl">
            {(['all', 'video', 'image'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f === 'all' ? 'Semua' : f === 'video' ? 'Video' : 'Gambar'}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* View Mode Switches */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setView('grid')}
              title="Tampilan Grid"
              className={`p-1.5 rounded-lg transition-all ${
                view === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              title="Tampilan Tabel"
              className={`p-1.5 rounded-lg transition-all ${
                view === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MEDIA GALLERY / TABLE
          ═══════════════════════════════════════════ */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            {search ? 'Tidak ada media yang cocok' : 'Belum Ada Media'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-normal max-w-sm mx-auto">
            {search ? 'Coba ubah kata kunci pencarian atau filter tipe berkas.' : 'Mulai unggah berkas gambar atau video pertama Anda untuk ditayangkan pada layar.'}
          </p>
          {!search && (
            <Link href="/media/upload">
              <button className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-sm transition-all active:scale-95">
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
              className="stat-card group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Preview Thumbnail Box */}
              <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                {item.media_type === 'image' && item.file_url ? (
                  <img
                    src={item.file_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                    <FileVideo className="w-8 h-8 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                )}

                {item.media_type === 'video' && item.duration && (
                  <span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
                    <Play className="w-2.5 h-2.5 fill-white" />
                    {formatDuration(item.duration)}
                  </span>
                )}

                {/* Hover Action Overlay */}
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPreviewMedia(item)}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-semibold shadow-lg hover:bg-slate-100 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    Preview
                  </button>
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-4 flex flex-col justify-between flex-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors" title={item.title}>
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-normal mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-300" />
                    {formatDateTime(item.created_at)}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/80 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                      item.media_type === 'video'
                        ? 'bg-purple-50 text-purple-700 border-purple-200/60'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                    }`}>
                      {getMediaTypeLabel(item.media_type)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {formatFileSize(item.file_size)}
                    </span>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Hapus Media">
                      <Trash2 className="w-3.5 h-3.5" />
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl border-slate-200">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-slate-900 font-bold">Hapus Berkas Media?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 text-xs">
                          Media &quot;{item.title}&quot; akan dihapus secara permanen dari server penyimpanan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl text-xs font-semibold">Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(item)}
                          className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">Nama Berkas</th>
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">Tipe</th>
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">Durasi</th>
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">Ukuran</th>
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">Tanggal Unggah</th>
                  <th className="text-right font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filtered.map((item, idx) => (
                  <tr key={item.id} className="group hover:bg-slate-50/60 transition-colors table-row-animate" style={{ animationDelay: `${idx * 30}ms` }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          {item.media_type === 'video' ? (
                            <FileVideo className="w-4 h-4" />
                          ) : (
                            <FileImage className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                        item.media_type === 'video'
                          ? 'bg-purple-50 text-purple-700 border-purple-200/60'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                      }`}>
                        {getMediaTypeLabel(item.media_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-normal">
                      {formatDuration(item.duration)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-normal">
                      {formatFileSize(item.file_size)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-normal">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewMedia(item)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Preview Media"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Hapus Media">
                            <Trash2 className="w-4 h-4" />
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl border-slate-200">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-slate-900 font-bold">Hapus Berkas Media?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-500 text-xs">
                                Media &quot;{item.title}&quot; akan dihapus secara permanen dari server.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl text-xs font-semibold">Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item)} className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold">
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
        <DialogContent className="max-w-3xl rounded-2xl border-slate-200 p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center justify-between pr-4">
              <span>{previewMedia?.title}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner my-2">
            {previewMedia?.media_type === 'video' ? (
              <video
                src={previewMedia.file_url}
                controls
                className="w-full h-full object-contain"
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

          <div className="flex items-center justify-between text-xs text-slate-500 font-normal pt-2 bg-slate-50 -mx-6 -mb-6 p-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                previewMedia?.media_type === 'video'
                  ? 'bg-purple-50 text-purple-700 border-purple-200/60'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
              }`}>
                {previewMedia && getMediaTypeLabel(previewMedia.media_type)}
              </span>
              <span>Ukuran: <strong className="text-slate-700">{previewMedia && formatFileSize(previewMedia.file_size)}</strong></span>
              {previewMedia?.duration && (
                <span>Durasi: <strong className="text-slate-700">{formatDuration(previewMedia.duration)}</strong></span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">{previewMedia && formatDateTime(previewMedia.created_at)}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
