'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  MonitorPlay,
  Image as ImageIcon,
  ListMusic,
  CalendarClock,
  ArrowRight,
  HardDrive,
  Loader2,
  Upload,
  Radio,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Clock,
  Plus,
  Layers,
  ExternalLink,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import type { Screen, DashboardStats } from '@/lib/types';
import { getRelativeTime } from '@/lib/utils';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('Admin');
  const [activeScreenFilter, setActiveScreenFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [stats, setStats] = useState<DashboardStats>({
    totalScreens: 0,
    onlineScreens: 0,
    offlineScreens: 0,
    totalMedia: 0,
    totalPlaylists: 0,
    activePlaylists: 0,
    todaySchedules: 0,
    totalStorageUsed: 0,
  });
  const [screens, setScreens] = useState<Screen[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserName(user.email.split('@')[0]);
      }

      const [screensRes, mediaRes, playlistsRes, schedulesRes] = await Promise.all([
        supabase.from('screens').select('*'),
        supabase.from('media').select('id, file_size'),
        supabase.from('playlists').select('id, status'),
        supabase.from('schedules').select('id, status, start_date, end_date').eq('status', 'active'),
      ]);

      const allScreens = screensRes.data || [];
      const allMedia = mediaRes.data || [];
      const allPlaylists = playlistsRes.data || [];
      const activeSchedules = schedulesRes.data || [];

      const today = new Date().toISOString().split('T')[0];
      const todaySchedules = activeSchedules.filter(
        (s) => s.start_date <= today && s.end_date >= today
      );

      setStats({
        totalScreens: allScreens.length,
        onlineScreens: allScreens.filter((s) => s.status === 'online').length,
        offlineScreens: allScreens.filter((s) => s.status !== 'online').length,
        totalMedia: allMedia.length,
        totalPlaylists: allPlaylists.length,
        activePlaylists: allPlaylists.filter((p) => p.status === 'active').length,
        todaySchedules: todaySchedules.length,
        totalStorageUsed: allMedia.reduce((sum, m) => sum + (m.file_size || 0), 0),
      });

      setScreens(allScreens);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const currentDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const screenOnlinePercentage = stats.totalScreens > 0 
    ? Math.round((stats.onlineScreens / stats.totalScreens) * 100)
    : 0;

  const filteredScreens = screens.filter((s) => {
    if (activeScreenFilter === 'online') return s.status === 'online';
    if (activeScreenFilter === 'offline') return s.status !== 'online';
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        </div>
        <p className="text-xs text-slate-500 font-medium tracking-tight">Memuat data dashboard...</p>
      </div>
    );
  }

  return (
    <div className="pb-16 space-y-6 max-w-7xl mx-auto">
      
      {/* ── Top Header Section (Modern Corporate Studio) ── */}
      <div className="space-y-4">
        {/* Date & Greeting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{currentDate}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {getGreeting()}! <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent capitalize">{userName}</span>
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Central Digital Signage Command Center • PT Rolas Nusantara Medika
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/screens">
              <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                <MonitorPlay className="w-3.5 h-3.5 text-slate-500" />
                Kelola Layar
              </button>
            </Link>
            <Link href="/media/upload">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]">
                <Plus className="w-3.5 h-3.5" />
                Upload Media
              </button>
            </Link>
          </div>
        </div>

        {/* Floating Metric Capsules (Dribbble Signature Bar) */}
        <div className="flex flex-wrap items-center gap-2.5 p-1.5 rounded-2xl bg-slate-100/60 border border-slate-200/70 backdrop-blur-xs">
          <Link
            href="/screens"
            className="group inline-flex items-center gap-2.5 bg-white hover:bg-blue-50/50 px-3.5 py-2 rounded-xl border border-slate-200/80 hover:border-blue-200 text-xs font-semibold text-slate-800 transition-all shadow-2xs hover:shadow-xs"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <MonitorPlay className="w-3.5 h-3.5" />
            </div>
            <span>{stats.onlineScreens}/{stats.totalScreens} Layar TV Online</span>
            <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {screenOnlinePercentage}% Online
            </span>
          </Link>

          <Link
            href="/media"
            className="group inline-flex items-center gap-2.5 bg-white hover:bg-emerald-50/50 px-3.5 py-2 rounded-xl border border-slate-200/80 hover:border-emerald-200 text-xs font-semibold text-slate-800 transition-all shadow-2xs hover:shadow-xs"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <span>{stats.totalMedia} File Media</span>
            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {formatStorageUsed(stats.totalStorageUsed)}
            </span>
          </Link>

          <Link
            href="/playlist"
            className="group inline-flex items-center gap-2.5 bg-white hover:bg-purple-50/50 px-3.5 py-2 rounded-xl border border-slate-200/80 hover:border-purple-200 text-xs font-semibold text-slate-800 transition-all shadow-2xs hover:shadow-xs"
          >
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <ListMusic className="w-3.5 h-3.5" />
            </div>
            <span>{stats.activePlaylists} Playlist Aktif</span>
          </Link>

          <Link
            href="/schedule"
            className="group inline-flex items-center gap-2.5 bg-white hover:bg-amber-50/50 px-3.5 py-2 rounded-xl border border-slate-200/80 hover:border-amber-200 text-xs font-semibold text-slate-800 transition-all shadow-2xs hover:shadow-xs"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <CalendarClock className="w-3.5 h-3.5" />
            </div>
            <span>{stats.todaySchedules} Jadwal Hari Ini</span>
          </Link>
        </div>
      </div>

      {/* ── Main Section 1: Real-Time Devices Table Widget ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all hover:shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
              <Radio className="w-4 h-4 animate-pulse text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Status Perangkat Penyiaran</h2>
              <p className="text-[11px] text-slate-500 font-normal">
                Monitoring status real-time seluruh unit TV Digital Signage yang terhubung.
              </p>
            </div>
          </div>

          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-200/80 text-xs font-medium">
            <button
              onClick={() => setActiveScreenFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeScreenFilter === 'all'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({screens.length})
            </button>
            <button
              onClick={() => setActiveScreenFilter('online')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeScreenFilter === 'online'
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Online ({stats.onlineScreens})
            </button>
            <button
              onClick={() => setActiveScreenFilter('offline')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeScreenFilter === 'offline'
                  ? 'bg-slate-800 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Offline ({stats.offlineScreens})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {filteredScreens.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <MonitorPlay className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Tidak ada layar TV pada kategori ini</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400">
                  <th className="text-left font-bold px-6 py-3 tracking-wider uppercase text-[10px]">
                    Identitas Perangkat TV
                  </th>
                  <th className="text-left font-bold px-6 py-3 tracking-wider uppercase text-[10px]">
                    Lokasi / Area Operasional
                  </th>
                  <th className="text-left font-bold px-6 py-3 tracking-wider uppercase text-[10px]">
                    Status Koneksi
                  </th>
                  <th className="text-left font-bold px-6 py-3 tracking-wider uppercase text-[10px]">
                    Terakhir Aktif
                  </th>
                  <th className="text-right font-bold px-6 py-3 tracking-wider uppercase text-[10px]">
                    Aksi Quick View
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredScreens.map((screen) => (
                  <tr key={screen.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          screen.status === 'online' ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-slate-300'
                        }`} />
                        <div>
                          <p className="font-bold text-slate-900">{screen.name}</p>
                          <span className="inline-block bg-slate-100 text-slate-600 font-mono text-[10px] px-1.5 py-0.5 rounded mt-0.5">
                            {screen.screen_code}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-slate-800">{screen.site}</p>
                      {screen.area && <p className="text-[10px] text-slate-400 font-normal">{screen.area}</p>}
                    </td>
                    <td className="px-6 py-3.5">
                      {screen.status === 'online' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online (Menyiarkan)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Terputus / Offline
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-medium">
                      {screen.last_seen ? getRelativeTime(screen.last_seen) : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/player?code=${screen.screen_code}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-all shadow-2xs active:scale-[0.97]"
                      >
                        <span>Buka Player</span>
                        <ExternalLink className="w-3 h-3 text-slate-300" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Main Section 2: Split Dashboard Layout (7 + 5) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT: Schedule Timeline Widget ── */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                <CalendarClock className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Jadwal Tayang Penyiaran</h3>
                <p className="text-[11px] text-slate-400">Penyiaran otomatis yang aktif hari ini</p>
              </div>
            </div>
            <Link href="/schedule" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Lihat Semua
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Dribbble Style Week Selector Strip */}
          <div className="grid grid-cols-7 gap-1.5 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/60 text-center">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, idx) => {
              const isToday = idx === 3;
              return (
                <div
                  key={day}
                  className={`py-2 rounded-xl text-xs transition-all cursor-pointer ${
                    isToday
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20'
                      : 'text-slate-500 hover:text-slate-900 font-semibold'
                  }`}
                >
                  <p className="text-[9px] uppercase tracking-wider opacity-80">{day}</p>
                  <p className="text-xs font-extrabold mt-0.5">{13 + idx}</p>
                </div>
              );
            })}
          </div>

          {/* Active Schedule Cards List */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-300 transition-all flex items-center justify-between border-l-4 border-l-blue-600 shadow-2xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-blue-700 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                    08:00 - 17:00 WIB
                  </span>
                  <span className="text-xs font-bold text-slate-900">Penyiaran Utama PT Rolas</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Playlist: Pengumuman Layanan Rumah Sakit (8 Slide)</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Berjalan
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-purple-300 transition-all flex items-center justify-between border-l-4 border-l-purple-600 shadow-2xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-purple-700 bg-purple-500/10 px-2.5 py-0.5 rounded-lg border border-purple-500/20">
                    07:00 - 20:00 WIB
                  </span>
                  <span className="text-xs font-bold text-slate-900">Tayangan Edukasi Kesehatan</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Playlist: Info Dokter & Fasilitas Medika</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Berjalan
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: System Health & Storage Widget ── */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Health & Performance */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                  <BarChart3 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Kesehatan Perangkat TV</h3>
                  <p className="text-[11px] text-slate-400">Indikator stabilitas jaringan</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {screenOnlinePercentage}% Optimal
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Status Konektivitas Perangkat</span>
                <span className="font-bold text-slate-900">{stats.onlineScreens} / {stats.totalScreens} TV Online</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-700"
                  style={{ width: `${screenOnlinePercentage}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-900">{stats.onlineScreens} TV</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">Terhubung Normal</p>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200/80 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{stats.offlineScreens} TV</p>
                  <p className="text-[10px] text-slate-500 font-medium">Terputus / Off</p>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Capacity Box */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3.5 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                  <HardDrive className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Penyimpanan Media Cloud</h3>
                  <p className="text-[11px] text-slate-400">Total file gambar & video</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200/80">
                {formatStorageUsed(stats.totalStorageUsed)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">{stats.totalMedia} File Tersimpan</span>
              </div>
              <Link href="/media/upload" className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline">
                + Upload Media Baru
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

function formatStorageUsed(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
