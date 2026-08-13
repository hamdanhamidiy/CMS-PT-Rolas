'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  FileVideo,
  FileImage,
  ArrowUp,
  ArrowDown,
  Music4,
  Layers,
  Sparkles,
  Clock,
  Repeat,
  Info,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import type { Playlist, PlaylistItem, Media } from '@/lib/types';
import { formatDuration, formatFileSize, getMediaTypeLabel, logActivity } from '@/lib/utils';
import { toast } from 'sonner';

export default function PlaylistEditorPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<(PlaylistItem & { media: Media })[]>([]);
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');

  useEffect(() => {
    loadPlaylist();
  }, [playlistId]);

  const loadPlaylist = async () => {
    const supabase = createClient();

    const [playlistRes, itemsRes, mediaRes] = await Promise.all([
      supabase.from('playlists').select('*').eq('id', playlistId).single(),
      supabase
        .from('playlist_items')
        .select('*, media(*)')
        .eq('playlist_id', playlistId)
        .order('sort_order', { ascending: true }),
      supabase.from('media').select('*').order('created_at', { ascending: false }),
    ]);

    setPlaylist(playlistRes.data);
    setItems((itemsRes.data || []) as any);
    setAllMedia(mediaRes.data || []);
    setLoading(false);
  };

  const addMedia = async (mediaItem: Media) => {
    const supabase = createClient();
    const newOrder = items.length;

    const { data, error } = await supabase
      .from('playlist_items')
      .insert({
        playlist_id: playlistId,
        media_id: mediaItem.id,
        sort_order: newOrder,
        play_limit: 1,
      })
      .select('*, media(*)')
      .single();

    if (error) {
      toast.error('Gagal menambahkan media');
      return;
    }

    setItems((prev) => [...prev, data as any]);
    toast.success(`"${mediaItem.title}" ditambahkan`);
  };

  const removeItem = async (itemId: string) => {
    const supabase = createClient();
    await supabase.from('playlist_items').delete().eq('id', itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    toast.success('Item dihapus dari playlist');
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    newItems.forEach((item, i) => (item.sort_order = i));
    setItems(newItems);
  };

  const updatePlayLimit = (itemId: string, limit: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, play_limit: Math.max(1, limit) } : i))
    );
  };

  const updateMediaDuration = (itemId: string, durationSec: number) => {
    const safeDur = Math.max(1, durationSec);
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId && i.media) {
          return {
            ...i,
            media: {
              ...i.media,
              duration: safeDur,
            },
          };
        }
        return i;
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    // 1. Update playlist_items (sort_order & play_limit)
    const itemUpdates = items.map((item) =>
      supabase
        .from('playlist_items')
        .update({ sort_order: item.sort_order, play_limit: item.play_limit })
        .eq('id', item.id)
    );

    // 2. Update media custom duration
    const mediaUpdates = items.map((item) => {
      if (item.media) {
        return supabase
          .from('media')
          .update({ duration: item.media.duration || 10 })
          .eq('id', item.media.id);
      }
      return Promise.resolve();
    });

    await Promise.all([...itemUpdates, ...mediaUpdates]);

    await logActivity(
      supabase,
      'update_playlist',
      'playlist',
      playlistId,
      `Update urutan & durasi item playlist: ${playlist?.name || playlistId}`
    );

    toast.success('Urutan & Durasi Playlist Berhasil Disimpan');
    setSaving(false);
  };

  const handleStatusChange = async (status: string) => {
    const supabase = createClient();
    await supabase.from('playlists').update({ status }).eq('id', playlistId);
    setPlaylist((prev) => (prev ? { ...prev, status: status as any } : null));

    await logActivity(
      supabase,
      'update_playlist',
      'playlist',
      playlistId,
      `Ubah status playlist '${playlist?.name || playlistId}' menjadi ${status}`
    );

    toast.success(`Status diubah ke ${status.toUpperCase()}`);
  };

  // Calculations for playlist loop duration
  const totalLoopDuration = items.reduce((sum, item) => {
    const dur = item.media?.duration || 10;
    const limit = item.play_limit || 1;
    return sum + dur * limit;
  }, 0);

  const filteredMedia = allMedia.filter(
    (m) =>
      m.title.toLowerCase().includes(mediaSearch.toLowerCase()) &&
      !items.some((i) => i.media_id === m.id)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="text-center py-24">
        <p className="text-sm font-semibold text-slate-700">Playlist tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="pb-10 max-w-4xl mx-auto space-y-6">
      
      {/* Back Link */}
      <Link href="/playlist" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Daftar Playlist
      </Link>

      {/* ── Editor Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate">{playlist.name}</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Rotasi 1 Loop: {formatDuration(totalLoopDuration)}
            </span>
          </div>
          {playlist.description && (
            <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">{playlist.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="relative">
            <select
              value={playlist.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-9 px-3 pr-7 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none appearance-none transition-all cursor-pointer shadow-2xs"
            >
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="archived">Arsip</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-2xs transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan Urutan & Durasi
          </button>
        </div>
      </div>



      {/* ── Items Container ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Urutan & Durasi Media Playlist
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {items.length} media tayang — atur detik tayang foto/video & perulangan per slide.
            </p>
          </div>
          <button
            onClick={() => setShowMediaPicker(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 text-xs font-semibold hover:bg-blue-600 hover:text-white transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Media
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
              <Music4 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900">Belum ada media di playlist ini</p>
            <p className="text-xs text-slate-500 mt-1 font-normal max-w-sm mx-auto">
              Klik tombol &quot;Tambah Media&quot; di atas untuk memilih gambar atau video dari Media Library.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const currentDur = item.media?.duration || 10;
              const subtotalDur = currentDur * item.play_limit;

              return (
                <div
                  key={item.id}
                  className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  {/* Left: Reorder & Media Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs font-mono font-bold text-slate-400 w-5 text-center flex-shrink-0">
                      #{index + 1}
                    </span>

                    <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-lg flex-shrink-0">
                      <button
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded-md hover:bg-white disabled:opacity-30 transition-all text-slate-600"
                        title="Naikkan Urutan"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === items.length - 1}
                        className="p-1 rounded-md hover:bg-white disabled:opacity-30 transition-all text-slate-600"
                        title="Turunkan Urutan"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 flex-shrink-0">
                      {item.media?.media_type === 'video' ? (
                        <FileVideo className="w-4 h-4 text-purple-600" />
                      ) : (
                        <FileImage className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.media?.title}</p>
                      <p className="text-[11px] text-slate-400 font-normal">
                        {item.media && getMediaTypeLabel(item.media.media_type)} • {formatFileSize(item.media?.file_size || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Duration & Play Limit Controls */}
                  <div className="flex items-center gap-3 flex-wrap md:flex-nowrap flex-shrink-0">
                    
                    {/* Duration Input / Badge */}
                    {item.media?.media_type === 'video' ? (
                      <div className="flex items-center gap-1.5 bg-purple-50/80 px-3 py-1.5 rounded-lg border border-purple-100" title="Video diputar penuh 100% sampai selesai tanpa terpotong">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-[11px] font-bold text-purple-900">Durasi Video:</span>
                        <span className="text-xs font-extrabold text-purple-700">{formatDuration(currentDur)}</span>
                        <span className="text-[10px] font-semibold text-purple-600 bg-white px-1.5 py-0.5 rounded border border-purple-200">Otomatis Selesai</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[11px] font-bold text-slate-600">Durasi Foto:</span>
                        <Input
                          type="number"
                          min={1}
                          max={3600}
                          value={currentDur}
                          onChange={(e) => updateMediaDuration(item.id, parseInt(e.target.value) || 10)}
                          className="w-14 h-6 text-xs text-center border border-slate-200 font-bold text-slate-900 bg-white rounded-md p-0 focus-visible:ring-1 focus-visible:ring-blue-500"
                        />
                        <span className="text-[11px] font-semibold text-slate-500">Detik</span>
                      </div>
                    )}

                    {/* Play Limit Input */}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      <Repeat className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] font-bold text-slate-600">Putar:</span>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={item.play_limit}
                        onChange={(e) => updatePlayLimit(item.id, parseInt(e.target.value) || 1)}
                        className="w-10 h-6 text-xs text-center border border-slate-200 font-bold text-slate-900 bg-white rounded-md p-0 focus-visible:ring-1 focus-visible:ring-blue-500"
                      />
                      <span className="text-[11px] font-semibold text-slate-500">x</span>
                    </div>

                    {/* Subtotal Duration Badge */}
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 min-w-[75px] text-center">
                      Subtotal: {formatDuration(subtotalDur)}
                    </span>

                    {/* Remove Item Button */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Hapus dari Playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Media Picker Dialog ── */}
      <Dialog open={showMediaPicker} onOpenChange={setShowMediaPicker}>
        <DialogContent className="max-w-lg rounded-2xl border-slate-200 p-6 bg-white shadow-xl space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-slate-900">Pilih Media tayang</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Pilih berkas gambar atau video dari Media Library untuk ditambahkan ke playlist ini.
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Cari nama media..."
            value={mediaSearch}
            onChange={(e) => setMediaSearch(e.target.value)}
            className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
          />

          <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
            {filteredMedia.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-8 font-normal">
                Tidak ada media tersedia untuk ditambahkan
              </p>
            ) : (
              filteredMedia.map((m) => (
                <button
                  key={m.id}
                  onClick={() => addMedia(m)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left group border border-slate-100 hover:border-slate-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors flex-shrink-0">
                    {m.media_type === 'video' ? (
                      <FileVideo className="w-4 h-4 text-purple-600" />
                    ) : (
                      <FileImage className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{m.title}</p>
                    <p className="text-[10px] text-slate-400 font-normal">
                      {getMediaTypeLabel(m.media_type)} • {formatFileSize(m.file_size)} {m.duration ? `• ${formatDuration(m.duration)}` : ''}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-all">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
