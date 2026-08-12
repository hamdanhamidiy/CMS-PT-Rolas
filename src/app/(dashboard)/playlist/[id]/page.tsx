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
} from 'lucide-react';
import Link from 'next/link';
import type { Playlist, PlaylistItem, Media } from '@/lib/types';
import { formatDuration, formatFileSize, getMediaTypeLabel } from '@/lib/utils';
import { toast } from 'sonner';

export default function PlaylistEditorPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
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
    setItems(itemsRes.data || []);
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

    setItems((prev) => [...prev, data]);
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
      prev.map((i) => (i.id === itemId ? { ...i, play_limit: limit } : i))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    const updates = items.map((item) =>
      supabase
        .from('playlist_items')
        .update({ sort_order: item.sort_order, play_limit: item.play_limit })
        .eq('id', item.id)
    );

    await Promise.all(updates);

    toast.success('Playlist berhasil disimpan');
    setSaving(false);
  };

  const handleStatusChange = async (status: string) => {
    const supabase = createClient();
    await supabase.from('playlists').update({ status }).eq('id', playlistId);
    setPlaylist((prev) => prev ? { ...prev, status: status as any } : null);
    toast.success(`Status diubah ke ${status}`);
  };

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
    <div className="relative pt-1 pb-8 overflow-hidden max-w-4xl mx-auto space-y-6">
      
      {/* ── Background Mesh Gradient ── */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-indigo-100/30 via-slate-100/20 to-transparent rounded-[100%] blur-3xl -z-10 opacity-70 pointer-events-none" />

      {/* Back Link */}
      <Link href="/playlist" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Daftar Playlist
      </Link>

      {/* ── Editor Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">{playlist.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Select value={playlist.status} onValueChange={(v) => v && handleStatusChange(v)}>
            <SelectTrigger className="h-9 w-28 text-xs rounded-full bg-white border-slate-200 shadow-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="archived">Arsip</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={handleSave}
            disabled={saving}
            className="group inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold tracking-wide shadow-sm hover:shadow-lg hover:bg-slate-800 hover:scale-[1.03] active:scale-95 transition-all duration-300 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan Urutan
          </button>
        </div>
      </div>

      {/* ── Items Container ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out fill-mode-both delay-150">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Urutan Media Playlist
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {items.length} media tayang — sesuaikan batas perulangan & urutan slide.
            </p>
          </div>
          <button
            onClick={() => setShowMediaPicker(true)}
            className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/80 text-xs font-semibold hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Media
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <Music4 className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-slate-900">Belum ada item di playlist ini</p>
            <p className="text-xs text-slate-500 mt-1 font-normal max-w-sm mx-auto">
              Klik tombol &quot;Tambah Media&quot; di atas untuk memilih gambar atau video dari library.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <span className="text-xs font-mono font-bold text-slate-400 w-6 text-center">
                  {index + 1}
                </span>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full">
                  <button
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded-full hover:bg-white disabled:opacity-30 transition-all text-slate-600"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === items.length - 1}
                    className="p-1 rounded-full hover:bg-white disabled:opacity-30 transition-all text-slate-600"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-500 flex-shrink-0">
                    {item.media?.media_type === 'video' ? (
                      <FileVideo className="w-4 h-4 text-purple-600" />
                    ) : (
                      <FileImage className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.media?.title}</p>
                    <p className="text-[10px] text-slate-400 font-normal">
                      {item.media && getMediaTypeLabel(item.media.media_type)}
                      {item.media?.duration ? ` • ${formatDuration(item.media.duration)}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/80">
                    <Label className="text-[10px] font-semibold text-slate-400">Putar:</Label>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={item.play_limit}
                      onChange={(e) => updatePlayLimit(item.id, parseInt(e.target.value) || 1)}
                      className="w-10 h-5 text-xs text-center border-0 p-0 font-bold text-slate-900 bg-transparent focus-visible:ring-0"
                    />
                    <span className="text-[10px] font-semibold text-slate-400">x</span>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Media Picker Dialog ── */}
      <Dialog open={showMediaPicker} onOpenChange={setShowMediaPicker}>
        <DialogContent className="max-w-lg rounded-3xl border-slate-200 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Pilih Media</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Pilih berkas media dari library untuk ditambahkan ke playlist ini.
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Cari media..."
            value={mediaSearch}
            onChange={(e) => setMediaSearch(e.target.value)}
            className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
          />

          <div className="max-h-[320px] overflow-y-auto space-y-1 pr-1">
            {filteredMedia.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-8 font-normal">
                Tidak ada media tersedia untuk ditambahkan
              </p>
            ) : (
              filteredMedia.map((m) => (
                <button
                  key={m.id}
                  onClick={() => addMedia(m)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-50 transition-colors text-left group border border-transparent hover:border-slate-200/80"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors flex-shrink-0">
                    {m.media_type === 'video' ? (
                      <FileVideo className="w-4 h-4 text-purple-600" />
                    ) : (
                      <FileImage className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{m.title}</p>
                    <p className="text-[10px] text-slate-400 font-normal">
                      {getMediaTypeLabel(m.media_type)} • {formatFileSize(m.file_size)}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
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
