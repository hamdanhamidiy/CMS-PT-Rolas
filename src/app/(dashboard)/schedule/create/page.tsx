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
  Info,
  CalendarClock,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import type { Playlist, Screen } from '@/lib/types';
import { toast } from 'sonner';
import { ensureUserProfile, logActivity } from '@/lib/utils';

export default function CreateSchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);

  const [name, setName] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [mode, setMode] = useState<'normal' | 'promosi'>('normal');
  const [priority, setPriority] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !playlistId || !startDate || !endDate || selectedScreens.length === 0) {
      toast.error('Lengkapi form', { description: 'Semua field wajib diisi dan minimal 1 layar dipilih.' });
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Create schedule
    const createdBy = await ensureUserProfile(supabase, user);

    let { data: schedule, error } = await supabase
      .from('schedules')
      .insert({
        name: name.trim(),
        playlist_id: playlistId,
        mode,
        priority,
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        status: 'draft',
        created_by: createdBy,
      })
      .select()
      .single();

    // Retry with created_by = null if foreign key constraint failed
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
          start_time: startTime,
          end_time: endTime,
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

    // 2. Assign screens
    const screenAssignments = selectedScreens.map((screenId) => ({
      schedule_id: schedule.id,
      screen_id: screenId,
    }));

    await supabase.from('schedule_screens').insert(screenAssignments);

    // 3. Log activity
    await logActivity(
      supabase,
      'create_schedule',
      'schedule',
      schedule.id,
      `Membuat jadwal: ${name.trim()} (${mode}, ${selectedScreens.length} layar)`
    );

    toast.success('Jadwal berhasil dibuat');
    router.push('/schedule');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-6">
      
      {/* Back Link */}
      <Link href="/schedule" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Daftar Jadwal
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Buat Agenda Penyiaran Baru
        </h1>
        <p className="text-xs text-slate-500 font-normal mt-1">
          Tentukan nama agenda, target playlist, jam tayang harian, serta pilih layar TV penyiaran.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: Informasi Dasar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              1. Informasi Agenda & Playlist
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Identitas jadwal dan playlist yang akan disiarkan.</p>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-slate-800">
                Nama Agenda Penyiaran <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Jadwal Penyiaran Promo Pagi Lobby"
                className="h-10 text-xs font-semibold rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                required
              />
            </div>

            {/* Playlist Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="target-playlist" className="text-xs font-bold text-slate-800">
                Target Playlist <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  id="target-playlist"
                  value={playlistId}
                  onChange={(e) => setPlaylistId(e.target.value)}
                  className="w-full h-10 px-3.5 pr-8 text-xs font-bold text-slate-900 bg-slate-50/60 border border-slate-200/80 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none appearance-none transition-all cursor-pointer"
                  required
                >
                  <option value="" disabled>Pilih playlist yang akan ditayangkan...</option>
                  {playlists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Mode & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="mode-tayang" className="text-xs font-bold text-slate-800">Mode Tayang</Label>
                <div className="relative">
                  <select
                    id="mode-tayang"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as 'normal' | 'promosi')}
                    className="w-full h-10 px-3.5 pr-8 text-xs font-bold text-slate-900 bg-slate-50/60 border border-slate-200/80 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none appearance-none transition-all cursor-pointer"
                  >
                    <option value="normal">Normal / Pelayanan (Reguler)</option>
                    <option value="promosi">Promosi Special (Mengambil Alih Layar)</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priority" className="text-xs font-bold text-slate-800">Tingkat Prioritas (1-10)</Label>
                <Input
                  id="priority"
                  type="number"
                  min={1}
                  max={10}
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                  className="h-10 text-xs font-semibold rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Pengaturan Waktu Tayang */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600" />
              2. Rentang Tanggal & Waktu Tayang Harian
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Tentukan periode tanggal dan jam tayang aktif.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-xs font-bold text-slate-800">Tanggal Mulai <span className="text-red-500">*</span></Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date" className="text-xs font-bold text-slate-800">Tanggal Selesai <span className="text-red-500">*</span></Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start-time" className="text-xs font-bold text-slate-800">Jam Mulai Harian <span className="text-red-500">*</span></Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-time" className="text-xs font-bold text-slate-800">Jam Selesai Harian <span className="text-red-500">*</span></Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Target Layar TV */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-indigo-600" />
                3. Target Perangkat Layar TV <span className="text-red-500">*</span>
              </h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5">Pilih layar TV yang akan menyiarkan jadwal ini.</p>
            </div>
            <button
              type="button"
              onClick={selectAllScreens}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              {selectedScreens.length === screens.length ? 'Batalkan Semua' : 'Pilih Semua Layar'}
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[240px] overflow-y-auto">
            {screens.map((screen) => (
              <label
                key={screen.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  selectedScreens.includes(screen.id)
                    ? 'bg-blue-50/50'
                    : 'hover:bg-slate-50'
                }`}
              >
                <Checkbox
                  checked={selectedScreens.includes(screen.id)}
                  onCheckedChange={() => toggleScreen(screen.id)}
                />
                <MonitorPlay className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">{screen.name}</p>
                  <p className="text-[11px] text-slate-400 font-normal">
                    {screen.site}{screen.area ? ` — ${screen.area}` : ''} ({screen.screen_code})
                  </p>
                </div>
                <span className={`w-2 h-2 rounded-full ${screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </label>
            ))}
          </div>

          <p className="text-xs text-slate-500 font-normal">
            <strong className="font-semibold text-slate-900">{selectedScreens.length}</strong> dari {screens.length} layar terpilih.
          </p>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/schedule">
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan Jadwal Penyiaran
          </button>
        </div>

      </form>
    </div>
  );
}
