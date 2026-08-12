'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  ListMusic,
  Plus,
  Search,
  Trash2,
  Edit3,
  Music4,
  Loader2,
  Sparkles,
  ArrowRight,
  Layers,
  Repeat,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Playlist } from '@/lib/types';
import { formatDateTime, ensureUserProfile } from '@/lib/utils';
import { toast } from 'sonner';

export default function PlaylistPage() {
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<(Playlist & { items_count: number })[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('playlists')
      .select('*, playlist_items(count)')
      .order('created_at', { ascending: false });

    const mapped = (data || []).map((p: any) => ({
      ...p,
      items_count: p.playlist_items?.[0]?.count || 0,
    }));

    setPlaylists(mapped);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const createdBy = await ensureUserProfile(supabase, user);

    let { data, error } = await supabase
      .from('playlists')
      .insert({
        name: newName.trim(),
        description: newDesc.trim() || null,
        status: 'draft',
        created_by: createdBy,
      })
      .select()
      .single();

    // Fallback if foreign key constraint failed
    if (error && error.message.includes('foreign key constraint')) {
      const { data: retryData, error: retryErr } = await supabase
        .from('playlists')
        .insert({
          name: newName.trim(),
          description: newDesc.trim() || null,
          status: 'draft',
          created_by: null,
        })
        .select()
        .single();

      data = retryData;
      error = retryErr;
    }

    if (error || !data) {
      toast.error('Gagal membuat playlist', { description: error?.message });
      setCreating(false);
      return;
    }

    if (user && createdBy) {
      try {
        await supabase.from('activity_logs').insert({
          user_id: createdBy,
          action: 'create_playlist',
          entity_type: 'playlist',
          entity_id: data.id,
          details: `Membuat playlist: ${newName.trim()}`,
        });
      } catch {
        // Ignore activity log error
      }
    }

    toast.success('Playlist berhasil dibuat');
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    setCreating(false);
    loadPlaylists();
  };

  const handleDelete = async (playlist: Playlist) => {
    const supabase = createClient();
    const { error } = await supabase.from('playlists').delete().eq('id', playlist.id);
    if (error) {
      toast.error('Gagal menghapus playlist');
      return;
    }
    toast.success('Playlist berhasil dihapus');
    setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
  };

  const filtered = playlists.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = playlists.filter((p) => p.status === 'active').length;
  const draftCount = playlists.filter((p) => p.status === 'draft').length;
  const totalItems = playlists.reduce((sum, p) => sum + p.items_count, 0);

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: 'Draft Simpanan', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    active: { label: 'Aktif Tayang', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    archived: { label: 'Arsip', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="pb-10 space-y-5">
      
      {/* ── Integrated Corporate Header Bar (No Bulky Banners) ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Playlist & Antrean Tayang
            </h1>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {playlists.length} Total
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {activeCount} Aktif
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                {draftCount} Draft
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                {totalItems} Media
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Atur kelompok media, urutan slide, serta batas durasi penayangan untuk disiarkan ke TV.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-2xs transition-all active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          Buat Playlist Baru
        </button>
      </header>

      {/* ── Asymmetric 2-Column Board (8 cols + 4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ── Main Column (8 Cols): Playlist Directory ── */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Search Toolbar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari nama playlist atau keterangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9 text-xs bg-slate-50/60 border-slate-200/60 rounded-lg focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          {/* Directory Cards */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-12 text-center">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto mb-3">
                <ListMusic className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {search ? 'Tidak ada playlist yang cocok' : 'Belum Ada Playlist'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-normal max-w-sm mx-auto">
                {search ? 'Coba kata kunci pencarian yang berbeda.' : 'Buat playlist pertama Anda untuk mulai mengatur antrean gambar dan video.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((playlist) => (
                <div
                  key={playlist.id}
                  className="group bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                      <Music4 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-indigo-600 transition-colors">
                          {playlist.name}
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusConfig[playlist.status]?.className || ''}`}>
                          {statusConfig[playlist.status]?.label || playlist.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-normal truncate mt-1">
                        {playlist.description || 'Tidak ada deskripsi tambahan'}
                      </p>

                      <div className="flex items-center gap-3 mt-2.5 text-[10px] text-slate-400 font-medium">
                        <span className="text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {playlist.items_count} Berkas Media
                        </span>
                        <span>•</span>
                        <span>Dibuat {formatDateTime(playlist.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 sm:self-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 justify-between sm:justify-end">
                    <Link href={`/playlist/${playlist.id}`}>
                      <button className="px-3.5 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-900 hover:text-white transition-all flex items-center gap-1.5 shadow-2xs group/btn">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Kelola Urutan Media</span>
                        <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    </Link>

                    <AlertDialog>
                      <AlertDialogTrigger className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl border-slate-200">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-slate-900 font-bold">Hapus Playlist?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-500 text-xs">
                            Playlist &quot;{playlist.name}&quot; akan dihapus beserta urutan medianya. Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-lg text-xs font-semibold">Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(playlist)}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                          >
                            Hapus Permanen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* ── Side Column (4 Cols): Operational Guide Panel ── */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Rules Guide Panel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Mekanisme Penyiaran</h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Antrean Rotasi Otomatis</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    TV akan memutar media secara berurutan sesuai susunan slide di dalam playlist.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Perulangan Berkelanjutan</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Setelah item terakhir selesai, pemutar TV akan otomatis mengulang kembali dari item pertama.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Atur Durasi Per Slide</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Gambar dapat diatur durasi tampilnya (misal 10-30 detik), sedangkan video diputar sesuai durasinya.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold">Integritas Playlist</h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
              Pastikan playlist berada dalam status <span className="text-emerald-400 font-bold">Aktif Tayang</span> saat dihubungkan ke Jadwal Penyiaran agar dapat diterima TV secara real-time.
            </p>
          </div>

        </div>

      </div>

      {/* ── CREATE PLAYLIST DIALOG ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl border-slate-200 p-6 max-w-lg shadow-xl">
          <div className="flex items-start gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">Buat Playlist Baru</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-normal mt-0.5">
                Kelompokkan berkas video dan gambar dalam satu daftar tayang untuk disiarkan ke TV.
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="playlist-name" className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Nama Playlist <span className="text-red-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">Wajib diisi</span>
              </Label>
              <div className="relative">
                <Music4 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="playlist-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Playlist Lobby Utama / Promo Poli Klinik"
                  className="pl-10 h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                Gunakan nama yang mudah dikenali berdasarkan lokasi atau jenis penyiaran.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="playlist-desc" className="text-xs font-bold text-slate-800">
                Deskripsi <span className="text-slate-400 font-normal">(Opsional)</span>
              </Label>
              <Textarea
                id="playlist-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Tuliskan keterangan singkat mengenai konten playlist ini..."
                rows={3}
                className="text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none transition-all"
              />
            </div>

            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-900 leading-relaxed font-medium">
                Setelah playlist dibuat, Anda dapat menambahkan gambar/video dan menentukan urutan serta batas perulangannya.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Buat Playlist
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
