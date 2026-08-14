'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Save,
  Loader2,
  MonitorPlay,
  CalendarClock,
  ChevronDown,
  Sun,
  Sunset,
  Moon,
  Sunrise,
  Plus,
  X,
  RotateCcw,
  Sparkles,
  Clock,
  Play,
  Repeat,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import type { Playlist, Screen, PlaylistItem, Media } from '@/lib/types';
import { toast } from 'sonner';
import { ensureUserProfile, logActivity, formatDuration } from '@/lib/utils';

export default function CreateSchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [mode, setMode] = useState<'normal' | 'promosi'>('normal');
  const [priority, setPriority] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Multi Jam Tayang & Looping State
  const [startTimes, setStartTimes] = useState<string[]>(['08:00', '12:00', '15:00', '19:00']);
  const [customTime, setCustomTime] = useState('10:00');
  const [loopCount, setLoopCount] = useState<number>(3); // 3x putaran default

  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  
  // Selected Playlist Duration Calculation
  const [playlistDuration, setPlaylistDuration] = useState<number>(0); // 1 loop in seconds
  const [playlistItemsCount, setPlaylistItemsCount] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (playlistId) {
      calculatePlaylistDuration(playlistId);
    }
  }, [playlistId]);

  const loadData = async () => {
    const supabase = createClient();
    const [playlistRes, screenRes] = await Promise.all([
      supabase.from('playlists').select('*').in('status', ['draft', 'active']).order('name'),
      supabase.from('screens').select('*').order('name'),
    ]);
    const plList = playlistRes.data || [];
    setPlaylists(plList);
    if (plList.length > 0) {
      setPlaylistId(plList[0].id);
    }
    setScreens(screenRes.data || []);
    setLoading(false);

    // Set default dates
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(nextWeek.toISOString().split('T')[0]);
  };

  const calculatePlaylistDuration = async (pid: string) => {
    const supabase = createClient();
    const { data: items } = await supabase
      .from('playlist_items')
      .select('*, media(*)')
      .eq('playlist_id', pid);

    if (items && items.length > 0) {
      let totalSec = 0;
      items.forEach((item: any) => {
        const dur = item.media?.duration || 10;
        const limit = item.play_limit || 1;
        totalSec += dur * limit;
      });
      setPlaylistDuration(totalSec);
      setPlaylistItemsCount(items.length);
    } else {
      setPlaylistDuration(0);
      setPlaylistItemsCount(0);
    }
  };

  // Preset Time Slots
  const presets = [
    { label: 'Pagi', time: '08:00', icon: Sunrise, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Siang', time: '12:00', icon: Sun, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { label: 'Sore', time: '15:00', icon: Sunset, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { label: 'Malam', time: '19:00', icon: Moon, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  ];

  const togglePresetTime = (timeVal: string) => {
    if (startTimes.includes(timeVal)) {
      if (startTimes.length === 1) {
        toast.error('Jadwal harus memiliki minimal 1 jam tayang');
        return;
      }
      setStartTimes(startTimes.filter((t) => t !== timeVal));
    } else {
      const updated = [...startTimes, timeVal].sort();
      setStartTimes(updated);
    }
  };

  const addCustomTimeSlot = () => {
    if (!customTime) return;
    if (startTimes.includes(customTime)) {
      toast.error('Jam tayang ini sudah ada dalam daftar');
      return;
    }
    const updated = [...startTimes, customTime].sort();
    setStartTimes(updated);
  };

  const removeTimeSlot = (timeVal: string) => {
    if (startTimes.length === 1) {
      toast.error('Jadwal harus memiliki minimal 1 jam tayang');
      return;
    }
    setStartTimes(startTimes.filter((t) => t !== timeVal));
  };

  const toggleScreen = (screenId: string) => {
    setSelectedScreens((prev) =>
      prev.includes(screenId) ? prev.filter((id) => id !== screenId) : [...prev, screenId]
    );
  };

  const selectAllScreens = () => {
    if (selectedScreens.length === screens.length) {
      setSelectedScreens([]);
    } else {
      setSelectedScreens(screens.map((s) => s.id));
    }
  };

  // Helper to calculate auto-end time for a given start time and duration
  const getAutoEndTime = (startTimeStr: string, sessionSec: number): string => {
    if (sessionSec <= 0 || loopCount === 0) return 'Kontinu (Sepanjang Hari)';
    const [h, m] = startTimeStr.split(':').map(Number);
    const startTotalSec = h * 3600 + m * 60;
    const endTotalSec = startTotalSec + sessionSec;

    const endH = Math.floor((endTotalSec / 3600) % 24);
    const endM = Math.floor((endTotalSec % 3600) / 60);
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')} WIB`;
  };

  const totalSessionSeconds = loopCount > 0 ? playlistDuration * loopCount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !playlistId || !startDate || !endDate || startTimes.length === 0 || selectedScreens.length === 0) {
      toast.error('Lengkapi formulir jadwal', { description: 'Semua field wajib diisi dan minimal 1 layar dipilih.' });
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const createdBy = await ensureUserProfile(supabase, user);

    const firstStartTime = startTimes[0] || '08:00';
    const autoCalculatedEndTime = loopCount > 0
      ? getAutoEndTime(firstStartTime, totalSessionSeconds).replace(' WIB', '')
      : '23:59';

    let { data: schedule, error } = await supabase
      .from('schedules')
      .insert({
        name: name.trim(),
        playlist_id: playlistId,
        mode,
        priority,
        start_date: startDate,
        end_date: endDate,
        start_time: firstStartTime,
        end_time: autoCalculatedEndTime,
        loop_count: loopCount,
        start_times: startTimes,
        status: 'draft',
        created_by: createdBy,
      })
      .select()
      .single();

    if (error && error.message.includes('foreign key constraint')) {
      const { data: retrySched, error: retryErr } = await supabase
        .from('schedules')
        .insert({
          name: name.trim(),
          playlist_id: playlistId,
          mode,
          priority,
          start_date: startDate,
          end_date: endDate,
          start_time: firstStartTime,
          end_time: autoCalculatedEndTime,
          loop_count: loopCount,
          start_times: startTimes,
          status: 'draft',
          created_by: null,
        })
        .select()
        .single();

      schedule = retrySched;
      error = retryErr;
    }

    if (error || !schedule) {
      toast.error('Gagal membuat jadwal', { description: error?.message });
      setSaving(false);
      return;
    }

    // Assign screens
    const screenAssignments = selectedScreens.map((sid) => ({
      schedule_id: schedule.id,
      screen_id: sid,
    }));

    await supabase.from('schedule_screens').insert(screenAssignments);

    await logActivity(
      supabase,
      'create_schedule',
      'schedule',
      schedule.id,
      `Membuat jadwal: ${name.trim()} (${startTimes.length} jam tayang, ${selectedScreens.length} layar)`
    );

    toast.success('Jadwal penyiaran berhasil dibuat');
    router.push('/schedule');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">Memuat Formulir Penjadwalan...</p>
      </div>
    );
  }

  return (
    <div className="pb-16 max-w-4xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/schedule"
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Buat Jadwal Penyiaran Baru</h1>
            <p className="text-xs text-slate-500 font-normal">
              Atur playlist target, multi jam tayang harian, dan putaran tayang layar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/schedule"
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Batal
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan Jadwal
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── SECTION 1: Informasi Dasar Jadwal ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Informasi & Playlist Target</h2>
              <p className="text-xs text-slate-500 font-normal">Tentukan nama agenda dan playlist media yang akan ditayangkan.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nama Jadwal */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold text-slate-800">
                Nama Agenda Penyiaran <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Contoh: Promo Spesial Hari Kesehatan / Edukasi Pasien Pagi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
                required
              />
            </div>

            {/* Playlist Target */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">
                Playlist Target Media <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  value={playlistId}
                  onChange={(e) => setPlaylistId(e.target.value)}
                  className="w-full h-10 px-3 pr-8 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all appearance-none"
                  required
                >
                  <option value="" disabled>Pilih Playlist...</option>
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} ({pl.status.toUpperCase()})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Mode Penyiaran */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Mode Penyiaran</Label>
              <div className="relative">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="w-full h-10 px-3 pr-8 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all appearance-none"
                >
                  <option value="normal">Normal / Pelayanan (Reguler)</option>
                  <option value="promosi">Promosi Spesial (Takeover Layar)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: Periode Tanggal & Multi Jam Tayang ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Periode Tanggal & Multi Jam Tayang Harian</h2>
              <p className="text-xs text-slate-500 font-normal">Tentukan tanggal tayang, multi jam tayang (Pagi, Siang, Sore, Malam), dan putaran tayang.</p>
            </div>
          </div>

          {/* Range Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Tanggal Mulai <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Tanggal Selesai <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
                required
              />
            </div>
          </div>

          {/* Multi Jam Tayang Presets */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Multi Jam Tayang Harian
              </Label>
              <span className="text-[11px] text-slate-400 font-normal">Pilih preset atau buat jam kustom</span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {presets.map((preset) => {
                const Icon = preset.icon;
                const isSelected = startTimes.includes(preset.time);
                return (
                  <button
                    type="button"
                    key={preset.time}
                    onClick={() => togglePresetTime(preset.time)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                        {preset.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="font-mono text-sm font-bold">{preset.time} WIB</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Time Slots List & Custom Input */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 mt-3">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Daftar Slot Jam Tayang Aktif ({startTimes.length} Slot)
              </span>

              <div className="flex flex-wrap gap-2">
                {startTimes.map((timeVal) => (
                  <span
                    key={timeVal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-mono font-bold shadow-2xs"
                  >
                    <Clock className="w-3 h-3 text-blue-600" />
                    {timeVal} WIB
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(timeVal)}
                      className="hover:text-red-600 transition-colors ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Custom Time Input */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                <span className="text-xs font-medium text-slate-600">Tambah Jam Tayang Kustom:</span>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="h-8 px-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addCustomTimeSlot}
                  className="h-8 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah
                </button>
              </div>
            </div>
          </div>

          {/* Looping / Putaran Tayang Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Repeat className="w-4 h-4 text-purple-600" />
              Jumlah Putaran Tayang (Looping Per Sesi)
            </Label>
            <p className="text-[11px] text-slate-500 font-normal">
              Jumlah berapa kali seluruh isi media dalam playlist diputar secara berulang per slot jam tayang.
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
              {[
                { label: '1x Putaran', val: 1 },
                { label: '2x Putaran', val: 2 },
                { label: '3x Putaran', val: 3 },
                { label: '5x Putaran', val: 5 },
                { label: '10x Putaran', val: 10 },
                { label: 'Kontinu', val: 0 },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.val}
                  onClick={() => setLoopCount(opt.val)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    loopCount === opt.val
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Duration Calculator Box */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Estimasi Durasi Sesi & Jam Selesai Otomatis
              </span>
              <span className="text-[10px] font-mono font-semibold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                1 Loop: {formatDuration(playlistDuration)} ({playlistItemsCount} Media)
              </span>
            </div>

            <div className="text-xs text-blue-900 font-normal leading-relaxed space-y-1">
              <p>
                <strong>Total Durasi Per Sesi:</strong>{' '}
                {loopCount > 0
                  ? `${formatDuration(totalSessionSeconds)} (${loopCount}x Putaran Tayang)`
                  : 'Sepanjang Hari (Kontinu)'}
              </p>
              <div className="pt-1 text-[11px] space-y-0.5">
                {startTimes.map((st) => (
                  <div key={st} className="flex items-center gap-2 text-blue-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span>Slot {st} WIB</span> →{' '}
                    <strong className="text-blue-950 font-mono">
                      Selesai Otomatis pada {getAutoEndTime(st, totalSessionSeconds)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: Target Layar TV Penyiaran ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Target Perangkat Layar TV</h2>
                <p className="text-xs text-slate-500 font-normal">Pilih layar TV yang akan menyiarkan jadwal ini.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={selectAllScreens}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
            >
              {selectedScreens.length === screens.length ? 'Batalkan Semua' : 'Pilih Semua Layar'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
            {screens.map((screen) => {
              const isSelected = selectedScreens.includes(screen.id);
              return (
                <div
                  key={screen.id}
                  onClick={() => toggleScreen(screen.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleScreen(screen.id)}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-snug">{screen.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {screen.site} ({screen.screen_code})
                      </p>
                    </div>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/schedule"
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-2xs"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan & Terbitkan Jadwal
          </button>
        </div>
      </form>
    </div>
  );
}
