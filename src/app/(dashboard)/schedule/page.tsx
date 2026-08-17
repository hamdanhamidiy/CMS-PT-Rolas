'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
  Megaphone,
  Tv,
  Clock,
  Calendar,
  CheckCircle2,
  Edit3,
  Trash2,
  Repeat,
  Sunrise,
  Sun,
  Moon,
  Check,
  X,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import type { Schedule, Playlist, Screen } from '@/lib/types';
import { formatDate, formatDuration, logActivity } from '@/lib/utils';
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

  // Editable Presets State in Edit Modal (Pagi, Siang, Malam)
  const [editPresetTimes, setEditPresetTimes] = useState<{
    pagi: string;
    siang: string;
    malam: string;
  }>({
    pagi: '08:00',
    siang: '12:00',
    malam: '19:00',
  });

  const [editStartTimes, setEditStartTimes] = useState<string[]>(['08:00', '12:00', '19:00']);
  const [editCustomTime, setEditCustomTime] = useState('10:00');
  const [editStatus, setEditStatus] = useState<'draft' | 'active' | 'cancelled'>('draft');
  const [editSelectedScreens, setEditSelectedScreens] = useState<string[]>([]);
  const [editScreenSearch, setEditScreenSearch] = useState('');
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
        .select('*, playlist:playlists(id, name, playlist_items(play_limit, media(duration))), schedule_screens(screen_id)')
        .order('created_at', { ascending: false }),
      supabase.from('playlists').select('*, playlist_items(play_limit, media(duration))').order('name'),
      supabase.from('screens').select('*').order('name'),
    ]);

    setSchedules(schedRes.data || []);
    setPlaylists(playRes.data || []);
    setScreens(screenRes.data || []);
    setLoading(false);
  };

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

  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setEditName(schedule.name);
    setEditPlaylistId(schedule.playlist_id);
    setEditMode(schedule.mode);
    setEditPriority(schedule.priority || 1);
    setEditStartDate(schedule.start_date);
    setEditEndDate(schedule.end_date);

    const rawTimes = schedule.start_times && Array.isArray(schedule.start_times) && schedule.start_times.length > 0
      ? schedule.start_times
      : [schedule.start_time || '08:00'];
    const uniqueTimes = Array.from(new Set(rawTimes)).sort();
    setEditStartTimes(uniqueTimes);
    setEditStatus(schedule.status as any);

    const assignedScreenIds = (schedule as any).schedule_screens?.map((ss: any) => ss.screen_id) || [];
    setEditSelectedScreens(assignedScreenIds);
    setEditScreenSearch('');
  };

  const handleEditPresetTimeChange = (key: 'pagi' | 'siang' | 'malam', newTime: string) => {
    const oldTime = editPresetTimes[key];
    setEditPresetTimes((prev) => ({ ...prev, [key]: newTime }));

    if (editStartTimes.includes(oldTime)) {
      const updated = Array.from(new Set(editStartTimes.map((t) => (t === oldTime ? newTime : t)))).sort();
      setEditStartTimes(updated);
    }
  };

  const toggleEditPresetTime = (timeVal: string) => {
    if (editStartTimes.includes(timeVal)) {
      if (editStartTimes.length === 1) {
        toast.error('Jadwal harus memiliki minimal 1 jam tayang');
        return;
      }
      setEditStartTimes(editStartTimes.filter((t) => t !== timeVal));
    } else {
      setEditStartTimes(Array.from(new Set([...editStartTimes, timeVal])).sort());
    }
  };

  const addEditCustomTimeSlot = () => {
    if (!editCustomTime) return;
    if (editStartTimes.includes(editCustomTime)) {
      toast.error('Jam tayang ini sudah ada dalam daftar');
      return;
    }
    setEditStartTimes(Array.from(new Set([...editStartTimes, editCustomTime])).sort());
  };

  const removeEditTimeSlot = (timeVal: string) => {
    if (editStartTimes.length === 1) {
      toast.error('Jadwal harus memiliki minimal 1 jam tayang');
      return;
    }
    setEditStartTimes(editStartTimes.filter((t) => t !== timeVal));
  };

  const toggleEditScreen = (screenId: string) => {
    if (editSelectedScreens.includes(screenId)) {
      setEditSelectedScreens(editSelectedScreens.filter((id) => id !== screenId));
    } else {
      setEditSelectedScreens([...editSelectedScreens, screenId]);
    }
  };

  const selectAllEditScreens = () => {
    if (editSelectedScreens.length === screens.length) {
      setEditSelectedScreens([]);
    } else {
      setEditSelectedScreens(screens.map((s) => s.id));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule || !editName.trim() || !editPlaylistId || editStartTimes.length === 0) {
      toast.error('Lengkapi formulir edit jadwal');
      return;
    }

    if (editSelectedScreens.length === 0) {
      toast.error('Pilih minimal 1 layar TV penyiaran');
      return;
    }

    setSavingEdit(true);
    const supabase = createClient();
    const firstTime = editStartTimes[0] || '08:00';

    const selectedPl = playlists.find((p) => p.id === editPlaylistId);
    const selectedLoopCount = selectedPl?.loop_count ?? 3;

    const { error: schedErr } = await supabase
      .from('schedules')
      .update({
        name: editName.trim(),
        playlist_id: editPlaylistId,
        mode: editMode,
        priority: editPriority,
        start_date: editStartDate,
        end_date: editEndDate,
        start_time: firstTime,
        start_times: editStartTimes,
        loop_count: selectedLoopCount,
        status: editStatus,
      })
      .eq('id', editingSchedule.id);

    if (schedErr) {
      toast.error('Gagal memperbarui jadwal', { description: schedErr.message });
      setSavingEdit(false);
      return;
    }

    await supabase.from('schedule_screens').delete().eq('schedule_id', editingSchedule.id);

    const screenAssignments = editSelectedScreens.map((sid) => ({
      schedule_id: editingSchedule.id,
      screen_id: sid,
    }));

    await supabase.from('schedule_screens').insert(screenAssignments);

    await logActivity(
      supabase,
      'update_schedule',
      'schedule',
      editingSchedule.id,
      `Edit jadwal: ${editName.trim()} (${editStartTimes.length} jam tayang)`
    );

    toast.success('Jadwal berhasil diperbarui');
    setEditingSchedule(null);
    setSavingEdit(false);
    loadData();
  };

  const handleDeleteSchedule = async () => {
    if (!deletingSchedule) return;
    setDeleting(true);

    const supabase = createClient();
    const { error } = await supabase.from('schedules').delete().eq('id', deletingSchedule.id);

    if (error) {
      toast.error('Gagal menghapus jadwal');
      setDeleting(false);
      return;
    }

    await logActivity(
      supabase,
      'cancel_schedule',
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
    if (filter !== 'all' && s.status !== filter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      (s.playlist?.name && s.playlist.name.toLowerCase().includes(term))
    );
  });

  const activeCount = schedules.filter((s) => s.status === 'active').length;
  const draftCount = schedules.filter((s) => s.status === 'draft').length;
  const promoCount = schedules.filter((s) => s.mode === 'promosi').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">Memuat Jadwal Penyiaran...</p>
      </div>
    );
  }

  const editPresetList = [
    { key: 'pagi' as const, label: 'Sesi Pagi', time: editPresetTimes.pagi, icon: Sunrise },
    { key: 'siang' as const, label: 'Sesi Siang', time: editPresetTimes.siang, icon: Sun },
    { key: 'malam' as const, label: 'Sesi Malam', time: editPresetTimes.malam, icon: Moon },
  ];

  const filteredModalScreens = screens.filter((screen) => {
    if (!editScreenSearch) return true;
    const term = editScreenSearch.toLowerCase();
    return (
      screen.name.toLowerCase().includes(term) ||
      screen.site.toLowerCase().includes(term) ||
      screen.screen_code.toLowerCase().includes(term)
    );
  });

  return (
    <div className="pb-12 space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Jadwal & Agenda Penyiaran
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              {schedules.length} Agenda
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Atur periode tanggal tayang, multi jam tayang harian (Pagi, Siang, Malam), dan penugasan layar.
          </p>
        </div>

        <Link
          href="/schedule/create"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-2xs transition-all active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
          Buat Jadwal Baru
        </Link>
      </header>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Toolbar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari nama agenda penyiaran..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9 text-xs bg-slate-50 border-slate-200 rounded-lg focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
              {(['all', 'active', 'draft', 'cancelled'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold capitalize transition-all ${
                    filter === f ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {f === 'all' ? 'Semua' : f === 'active' ? 'Aktif' : f === 'draft' ? 'Draft' : 'Dibatalkan'}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Cards */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-12 text-center">
              <CalendarClock className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-900">
                {search || filter !== 'all' ? 'Tidak ada jadwal yang cocok dengan filter' : 'Belum Ada Jadwal Penyiaran'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filtered.map((schedule) => {
                const timesList: string[] = schedule.start_times && Array.isArray(schedule.start_times) && schedule.start_times.length > 0
                  ? schedule.start_times
                  : [schedule.start_time || '08:00'];
                
                const uniqueTimesList = Array.from(new Set(timesList)).sort();
                
                // Calculate playlist duration & loop mode from target playlist items
                const plItems = (schedule as any).playlist?.playlist_items || [];
                let isContinuous = false;
                let totalSec = 0;
                
                (plItems || []).forEach((it: any) => {
                  if (it.play_limit === 0) isContinuous = true;
                  const dur = it.media?.duration || 10;
                  const limit = it.play_limit === 0 ? 1 : (it.play_limit || 1);
                  totalSec += dur * limit;
                });

                const badgeText = isContinuous
                  ? 'Kontinu (Sepanjang Sesi)'
                  : totalSec > 0
                  ? `Rotasi: ${formatDuration(totalSec)}`
                  : 'Rotasi Sesi';

                return (
                  <div
                    key={schedule.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            schedule.mode === 'promosi'
                              ? 'bg-purple-50 text-purple-600 border border-purple-100'
                              : 'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}
                        >
                          {schedule.mode === 'promosi' ? <Megaphone className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 leading-snug">{schedule.name}</h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                schedule.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : schedule.status === 'draft'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {schedule.status === 'active' ? 'Aktif Tayang' : schedule.status === 'draft' ? 'Draft Agenda' : 'Dibatalkan'}
                            </span>
                            {schedule.mode === 'promosi' && (
                              <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                                Mode Promosi
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-normal mt-0.5">
                            Playlist Target: <span className="font-semibold text-slate-800">{schedule.playlist?.name || 'Utama'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {schedule.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(schedule, 'active')}
                            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Publish</span>
                          </button>
                        )}
                        {schedule.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(schedule, 'draft')}
                            className="h-8 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </button>
                        )}

                        <button
                          onClick={() => openEditModal(schedule)}
                          className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors"
                          title="Edit Jadwal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingSchedule(schedule)}
                          className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 flex items-center justify-center transition-colors"
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                      <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Periode Tanggal</span>
                          <span className="font-semibold text-slate-800 text-[11px]">
                            {formatDate(schedule.start_date)} – {formatDate(schedule.end_date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 sm:col-span-2">
                        <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Multi Jam Tayang Harian</span>
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              {badgeText}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {uniqueTimesList.map((t, idx) => (
                              <span key={`${t}-${idx}`} className="font-mono text-[10px] font-bold bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                {t} WIB
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ringkasan Penyiaran</h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 text-emerald-900 font-semibold">
                <span>Aktif Tayang</span>
                <span className="font-bold text-sm">{activeCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-purple-50/70 rounded-xl border border-purple-100 text-purple-900 font-semibold">
                <span>Mode Promosi</span>
                <span className="font-bold text-sm">{promoCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 font-semibold">
                <span>Draft Simpanan</span>
                <span className="font-bold text-sm">{draftCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── REVAMPED MODERN EDIT SCHEDULE DIALOG ── */}
      <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
        <DialogContent className="sm:max-w-2xl w-full rounded-2xl border-slate-200 p-0 overflow-hidden shadow-2xl">
          {/* Fixed Header */}
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <Edit3 className="w-4 h-4" />
                </div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Edit Jadwal & Penugasan
                </DialogTitle>
              </div>

              {/* Status Badge Selectable */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                {(['draft', 'active', 'cancelled'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setEditStatus(st)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      editStatus === st
                        ? st === 'active'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : st === 'draft'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'bg-red-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {st === 'active' ? 'Aktif' : st === 'draft' ? 'Draft' : 'Dibatalkan'}
                  </button>
                ))}
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Form Body */}
          {editingSchedule && (
            <div className="px-6 py-5 space-y-6 max-h-[58vh] overflow-y-auto custom-scrollbar">
              {/* SECTION 1: Detail Agenda & Playlist */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Informasi Utama Agenda
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    ID: {editingSchedule.id.slice(0, 8)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Nama Agenda Penyiaran <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Contoh: Promo Spesial Hari Kesehatan"
                    className="h-9 text-xs bg-white border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">
                      Playlist Target Media <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={editPlaylistId}
                      onChange={(e) => setEditPlaylistId(e.target.value)}
                      className="w-full h-9 px-3 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                    >
                      {playlists.map((pl) => {
                        const items = (pl as any).playlist_items || [];
                        let isContinuous = false;
                        let totalSec = 0;
                        (items || []).forEach((it: any) => {
                          if (it.play_limit === 0) isContinuous = true;
                          const dur = it.media?.duration || 10;
                          const limit = it.play_limit === 0 ? 1 : (it.play_limit || 1);
                          totalSec += dur * limit;
                        });
                        const durLabel = isContinuous
                          ? 'Kontinu'
                          : totalSec > 0
                          ? `Durasi ${formatDuration(totalSec)}`
                          : 'Rotasi Sesi';

                        return (
                          <option key={pl.id} value={pl.id}>
                            {pl.name} ({items.length} Media • {durLabel})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">Mode Penyiaran</Label>
                    <select
                      value={editMode}
                      onChange={(e) => setEditMode(e.target.value as any)}
                      className="w-full h-9 px-3 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                    >
                      <option value="normal">Normal / Reguler (Default)</option>
                      <option value="promosi">Promosi Spesial (Takeover Layar)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Periode Tanggal */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Periode Tanggal Penyiaran
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">Tanggal Mulai *</Label>
                    <Input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="h-9 text-xs bg-white border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">Tanggal Selesai *</Label>
                    <Input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="h-9 text-xs bg-white border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Multi Jam Tayang Harian */}
              <div className="space-y-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Multi Jam Tayang Harian
                    </span>
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Aktifkan jam tayang cepat atau tambahkan kustom jam tayang harian.
                    </p>
                  </div>
                </div>

                {/* Preset Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {editPresetList.map((p) => {
                    const Icon = p.icon;
                    const isSel = editStartTimes.includes(p.time);
                    return (
                      <div
                        key={p.key}
                        onClick={() => toggleEditPresetTime(p.time)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                          isSel
                            ? 'bg-blue-50/80 border-blue-300 text-blue-950 shadow-2xs'
                            : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5">
                            <Icon className={`w-3.5 h-3.5 ${isSel ? 'text-blue-600' : 'text-slate-400'}`} />
                            {p.label}
                          </span>
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                            isSel ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5"
                        >
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <input
                            type="time"
                            value={p.time}
                            onChange={(e) => handleEditPresetTimeChange(p.key, e.target.value)}
                            className="w-full bg-transparent font-mono text-xs font-bold text-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Slots Pill Bar */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Slot Jam Tayang Aktif ({editStartTimes.length} Slot)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {editStartTimes.map((tVal, idx) => (
                      <span
                        key={`${tVal}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-900 shadow-2xs"
                      >
                        <Clock className="w-3 h-3 text-blue-600" />
                        {tVal} WIB
                        <button
                          type="button"
                          onClick={() => removeEditTimeSlot(tVal)}
                          className="hover:text-red-600 transition-colors ml-0.5"
                          title="Hapus slot"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-600">Tambah Jam Custom:</span>
                    <input
                      type="time"
                      value={editCustomTime}
                      onChange={(e) => setEditCustomTime(e.target.value)}
                      className="h-8 px-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={addEditCustomTimeSlot}
                      className="h-8 px-3 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Slot
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Target Perangkat Layar TV */}
              <div className="space-y-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Tv className="w-4 h-4 text-blue-600" />
                      Target Perangkat Layar TV ({editSelectedScreens.length}/{screens.length} Layar) *
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari layar..."
                        value={editScreenSearch}
                        onChange={(e) => setEditScreenSearch(e.target.value)}
                        className="pl-8 h-7 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none w-32 sm:w-40"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={selectAllEditScreens}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 transition-colors shrink-0"
                    >
                      {editSelectedScreens.length === screens.length ? 'Batalkan Semua' : 'Pilih Semua'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                  {filteredModalScreens.length === 0 ? (
                    <div className="col-span-2 text-center py-6 text-xs text-slate-400">
                      Tidak ada perangkat layar yang cocok
                    </div>
                  ) : (
                    filteredModalScreens.map((screen) => {
                      const isSelected = editSelectedScreens.includes(screen.id);
                      return (
                        <div
                          key={screen.id}
                          onClick={() => toggleEditScreen(screen.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-50/90 border-blue-300 text-blue-950 shadow-2xs'
                              : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 transition-all ${
                              isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs truncate text-slate-900">{screen.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{screen.site} ({screen.screen_code})</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`w-2 h-2 rounded-full ${
                              screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                            }`} />
                            <span className="text-[9px] font-semibold uppercase text-slate-400">
                              {screen.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fixed Footer */}
          <DialogFooter className="m-0 p-4 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
            <button
              type="button"
              onClick={() => setEditingSchedule(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 shadow-2xs transition-all active:scale-[0.98]"
            >
              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Simpan Perubahan
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={!!deletingSchedule} onOpenChange={() => setDeletingSchedule(null)}>
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 font-bold">Hapus Jadwal Penyiaran?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-xs">
              Apakah Anda yakin ingin menghapus jadwal <strong>{deletingSchedule?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs font-semibold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSchedule} className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold">
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
