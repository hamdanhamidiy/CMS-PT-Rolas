'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/alert-dialog';
import {
  CalendarClock,
  Plus,
  Search,
  Loader2,
  Play,
  Pause,
  XCircle,
  Megaphone,
  Tv,
  Clock,
  Calendar,
  MonitorPlay,
  Sparkles,
  CheckCircle2,
  Edit3,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import type { Schedule, Playlist, Screen } from '@/lib/types';
import { formatDate, formatTime, ensureUserProfile, logActivity } from '@/lib/utils';
import { toast } from 'sonner';

export default function SchedulePage() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'cancelled'>('all');

  // Edit Modal State
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editName, setEditName] = useState('');
  const [editPlaylistId, setEditPlaylistId] = useState('');
  const [editMode, setEditMode] = useState<'normal' | 'promosi'>('normal');
  const [editPriority, setEditPriority] = useState(1);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('08:00');
  const [editEndTime, setEditEndTime] = useState('17:00');
  const [editStatus, setEditStatus] = useState<'draft' | 'active' | 'cancelled'>('draft');
  const [editSelectedScreens, setEditSelectedScreens] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Dialog State
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const [schedRes, playRes, screenRes] = await Promise.all([
      supabase
        .from('schedules')
        .select('*, playlist:playlists(name), schedule_screens(screen_id)')
        .order('created_at', { ascending: false }),
      supabase.from('playlists').select('*').order('name'),
      supabase.from('screens').select('*').order('name'),
    ]);

    setSchedules(schedRes.data || []);
    setPlaylists(playRes.data || []);
    setScreens(screenRes.data || []);
    setLoading(false);
  };

  // ── UPDATE: Quick Status Toggle ──
  const handleStatusChange = async (schedule: Schedule, newStatus: 'active' | 'draft' | 'cancelled') => {
    const supabase = createClient();
    const { error } = await supabase
      .from('schedules')
      .update({ status: newStatus })
      .eq('id', schedule.id);

    if (error) {
      toast.error('Gagal mengubah status', { description: error.message });
      return;
    }

    await logActivity(
      supabase,
      `${newStatus}_schedule`,
      'schedule',
      schedule.id,
      `Ubah status jadwal '${schedule.name}' menjadi ${newStatus}`
    );

    toast.success(`Jadwal diubah menjadi ${newStatus.toUpperCase()}`);
    loadData();
  };

  // ── UPDATE: Open Edit Modal ──
  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setEditName(schedule.name);
    setEditPlaylistId(schedule.playlist_id);
    setEditMode(schedule.mode);
    setEditPriority(schedule.priority || 1);
    setEditStartDate(schedule.start_date);
    setEditEndDate(schedule.end_date);
    setEditStartTime(schedule.start_time);
    setEditEndTime(schedule.end_time);
    setEditStatus(schedule.status as any);

    // Initialize selected screens
    const assignedScreenIds = (schedule as any).schedule_screens?.map((ss: any) => ss.screen_id) || [];
    setEditSelectedScreens(assignedScreenIds);
  };

  // ── UPDATE: Save Edit ──
  const handleSaveEdit = async () => {
    if (!editingSchedule || !editName.trim() || !editPlaylistId) {
      toast.error('Lengkapi formulir edit');
      return;
    }

    if (editSelectedScreens.length === 0) {
      toast.error('Pilih minimal 1 layar TV penyiaran');
      return;
    }

    setSavingEdit(true);
    const supabase = createClient();

    // 1. Update Schedule Row
    const { error } = await supabase
      .from('schedules')
      .update({
        name: editName.trim(),
        playlist_id: editPlaylistId,
        mode: editMode,
        priority: editPriority,
        start_date: editStartDate,
        end_date: editEndDate,
        start_time: editStartTime,
        end_time: editEndTime,
        status: editStatus,
      })
      .eq('id', editingSchedule.id);

    if (error) {
      toast.error('Gagal memperbarui jadwal', { description: error.message });
      setSavingEdit(false);
      return;
    }

    // 2. Update Target Screens (Junction Table)
    await supabase
      .from('schedule_screens')
      .delete()
      .eq('schedule_id', editingSchedule.id);

    if (editSelectedScreens.length > 0) {
      const newAssignments = editSelectedScreens.map((screenId) => ({
        schedule_id: editingSchedule.id,
        screen_id: screenId,
      }));
      await supabase.from('schedule_screens').insert(newAssignments);
    }

    // 3. Activity Log
    await logActivity(
      supabase,
      'update_schedule',
      'schedule',
      editingSchedule.id,
      `Edit jadwal & penugasan layar: ${editName.trim()} (${editSelectedScreens.length} Layar)`
    );

    toast.success('Jadwal & Penugasan Layar Berhasil Diperbarui');
    setEditingSchedule(null);
    setSavingEdit(false);
    loadData();
  };

  // ── DELETE: Delete Schedule ──
  const handleDelete = async () => {
    if (!deletingSchedule) return;
    setDeleting(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', deletingSchedule.id);

    if (error) {
      toast.error('Gagal menghapus jadwal', { description: error.message });
      setDeleting(false);
      return;
    }

    await logActivity(
      supabase,
      'delete_schedule',
      'schedule',
      deletingSchedule.id,
      `Hapus jadwal: ${deletingSchedule.name}`
    );

    toast.success('Jadwal berhasil dihapus');
    setDeletingSchedule(null);
    setDeleting(false);
    loadData();
  };

  const filtered = schedules.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || s.status === filter;
    return matchSearch && matchFilter;
  });

  const activeSchedules = schedules.filter((s) => s.status === 'active').length;
  const promoSchedules = schedules.filter((s) => s.mode === 'promosi').length;
  const draftSchedules = schedules.filter((s) => s.status === 'draft').length;

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: 'Draft Agenda', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    active: { label: 'Aktif Tayang', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    completed: { label: 'Selesai', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    cancelled: { label: 'Dibatalkan', className: 'bg-red-50 text-red-600 border-red-200' },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="pb-10 space-y-6">
      
      {/* ── Corporate Clean Top Header Bar ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Jadwal & Agenda Penyiaran
            </h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {schedules.length} Agenda
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Atur tanggal mulai/selesai, jam tayang harian, serta kelola penugasan layar TV penyiaran.
          </p>
        </div>

        <Link href="/schedule/create">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-2xs transition-all">
            <Plus className="w-3.5 h-3.5" />
            Buat Jadwal Baru
          </button>
        </Link>
      </header>

      {/* ── Asymmetric 2-Column Schedule Board (8 Cols + 4 Cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN (8 Columns): Filters & Agenda Feed List ── */}
        <div className="lg:col-span-8 space-y-4">

          {/* Search & Filter Pills Toolbar */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari nama agenda penyiaran..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9 text-xs bg-slate-50/60 border-slate-200/60 rounded-lg focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(['all', 'active', 'draft', 'cancelled'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    filter === f
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f === 'all' ? 'Semua' : statusConfig[f]?.label || f}
                </button>
              ))}
            </div>
          </div>

          {/* Agenda Feed List */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-12 text-center">
              <CalendarClock className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-900">
                {search ? 'Tidak ada jadwal yang cocok' : 'Belum Ada Agenda Penyiaran'}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-normal">
                {search ? 'Coba gunakan kata kunci lain.' : 'Buat jadwal baru untuk menjadwalkan penayangan playlist otomatis.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((schedule: any) => {
                const cfg = statusConfig[schedule.status] || statusConfig.draft;
                return (
                  <div
                    key={schedule.id}
                    className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all duration-200 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                          schedule.mode === 'promosi'
                            ? 'bg-amber-50 border-amber-100 text-amber-600'
                            : 'bg-blue-50 border-blue-100 text-blue-600'
                        }`}>
                          {schedule.mode === 'promosi' ? (
                            <Megaphone className="w-5 h-5" />
                          ) : (
                            <Tv className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900">
                              {schedule.name}
                            </h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cfg.className}`}>
                              {cfg.label}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              schedule.mode === 'promosi'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {schedule.mode === 'promosi' ? 'Mode Promosi' : 'Normal'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 font-normal mt-1 flex items-center gap-1.5">
                            <span>Playlist Target:</span>
                            <strong className="font-semibold text-slate-800">{schedule.playlist?.name || '—'}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Complete CRUD Action Controls Bar */}
                      <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
                        
                        {/* Status Quick Toggles */}
                        {schedule.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(schedule, 'active')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all"
                            title="Aktifkan Penyiaran"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Publish</span>
                          </button>
                        )}

                        {schedule.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(schedule, 'draft')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-2xs transition-all"
                            title="Jadikan Draft"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </button>
                        )}

                        {schedule.status !== 'cancelled' && (
                          <button
                            onClick={() => handleStatusChange(schedule, 'cancelled')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all"
                            title="Batalkan Agenda"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Batal</span>
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(schedule)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          title="Edit Agenda & Perangkat Layar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeletingSchedule(schedule)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                          title="Hapus Agenda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </div>

                    {/* Timeline Info Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-100 bg-slate-50/50 p-3 rounded-lg text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span><strong>Tanggal:</strong> {formatDate(schedule.start_date)} – {formatDate(schedule.end_date)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span><strong>Jam:</strong> {formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <MonitorPlay className="w-3.5 h-3.5 text-slate-400" />
                        <span><strong>Perangkat:</strong> {schedule.schedule_screens?.length || 0} Layar TV</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN (4 Columns): Agenda Breakdown & Operational Guide ── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Agenda Status Summary Card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              Ringkasan Agenda Penyiaran
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Aktif Tayang
                </span>
                <span className="font-bold text-emerald-900">{activeSchedules} Agenda</span>
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
                <span className="font-semibold text-amber-800 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                  Mode Promosi
                </span>
                <span className="font-bold text-amber-900">{promoSchedules} Agenda</span>
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-100/80 border border-slate-200">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Pause className="w-3.5 h-3.5 text-slate-500" />
                  Draft Simpanan
                </span>
                <span className="font-bold text-slate-900">{draftSchedules} Agenda</span>
              </div>
            </div>
          </div>

          {/* Operational Mode Guide Card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Panduan Mode Penyiaran
            </h3>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <p className="font-bold text-slate-900 mb-1">1. Mode Normal</p>
                <p className="font-normal text-slate-500">Penayangan standar harian berdasarkan urutan playlist reguler.</p>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100">
                <p className="font-bold text-amber-900 mb-1">2. Mode Promosi Special</p>
                <p className="font-normal text-amber-800">Mengambil alih seluruh layar TV selama rentang waktu jam yang ditentukan untuk event/pengumuman mendesak.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── EDIT SCHEDULE MODAL DIALOG ── */}
      <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 bg-white border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-600" />
              Edit Agenda & Penugasan Layar
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Perbarui identitas agenda, playlist target, jam tayang harian, dan layar TV penyiaran.
            </DialogDescription>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-bold text-slate-800">
                Nama Agenda Penyiaran
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 text-xs font-semibold rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                required
              />
            </div>

            {/* Target Playlist */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-playlist" className="text-xs font-bold text-slate-800">
                Target Playlist
              </Label>
              <div className="relative">
                <select
                  id="edit-playlist"
                  value={editPlaylistId}
                  onChange={(e) => setEditPlaylistId(e.target.value)}
                  className="w-full h-10 px-3.5 pr-8 text-xs font-bold text-slate-900 bg-slate-50/60 border border-slate-200/80 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none appearance-none transition-all cursor-pointer"
                >
                  {playlists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Target Screens Selection */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MonitorPlay className="w-3.5 h-3.5 text-indigo-600" />
                  Target Layar TV Penyiaran ({editSelectedScreens.length} Terpilih)
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    if (editSelectedScreens.length === screens.length) {
                      setEditSelectedScreens([]);
                    } else {
                      setEditSelectedScreens(screens.map((s) => s.id));
                    }
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:underline"
                >
                  {editSelectedScreens.length === screens.length ? 'Batalkan Semua' : 'Pilih Semua'}
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[160px] overflow-y-auto bg-slate-50/40">
                {screens.map((screen) => (
                  <label
                    key={screen.id}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer transition-colors ${
                      editSelectedScreens.includes(screen.id)
                        ? 'bg-blue-50/60'
                        : 'hover:bg-slate-100/60'
                    }`}
                  >
                    <Checkbox
                      checked={editSelectedScreens.includes(screen.id)}
                      onCheckedChange={() => {
                        setEditSelectedScreens((prev) =>
                          prev.includes(screen.id)
                            ? prev.filter((id) => id !== screen.id)
                            : [...prev, screen.id]
                        );
                      }}
                    />
                    <MonitorPlay className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{screen.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal truncate">
                        {screen.site}{screen.area ? ` — ${screen.area}` : ''} ({screen.screen_code})
                      </p>
                    </div>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </label>
                ))}
              </div>
            </div>

            {/* Status & Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div className="space-y-1.5">
                <Label htmlFor="edit-status" className="text-xs font-bold text-slate-800">Status Penyiaran</Label>
                <div className="relative">
                  <select
                    id="edit-status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full h-10 px-3.5 pr-8 text-xs font-bold text-slate-900 bg-slate-50/60 border border-slate-200/80 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none appearance-none transition-all cursor-pointer"
                  >
                    <option value="draft">Draft Agenda</option>
                    <option value="active">Aktif Tayang</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-mode" className="text-xs font-bold text-slate-800">Mode Tayang</Label>
                <div className="relative">
                  <select
                    id="edit-mode"
                    value={editMode}
                    onChange={(e) => setEditMode(e.target.value as any)}
                    className="w-full h-10 px-3.5 pr-8 text-xs font-bold text-slate-900 bg-slate-50/60 border border-slate-200/80 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none appearance-none transition-all cursor-pointer"
                  >
                    <option value="normal">Normal (Reguler)</option>
                    <option value="promosi">Promosi Special</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-start-date" className="text-xs font-bold text-slate-800">Tanggal Mulai</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-end-date" className="text-xs font-bold text-slate-800">Tanggal Selesai</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                />
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-start-time" className="text-xs font-bold text-slate-800">Jam Mulai Harian</Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-end-time" className="text-xs font-bold text-slate-800">Jam Selesai Harian</Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingSchedule(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Simpan Perubahan
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION ALERT DIALOG ── */}
      <AlertDialog open={!!deletingSchedule} onOpenChange={(open) => !open && setDeletingSchedule(null)}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-200 shadow-xl space-y-4">
          <AlertDialogHeader className="space-y-1.5 text-left">
            <AlertDialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Hapus Agenda Penyiaran?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus agenda <strong className="text-slate-900">{deletingSchedule?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <AlertDialogCancel
              onClick={() => setDeletingSchedule(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-2xs disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Hapus Agenda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
