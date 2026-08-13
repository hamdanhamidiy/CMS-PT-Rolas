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
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500 font-medium">Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="pb-16 space-y-6 max-w-7xl mx-auto">
      
      {/* ── Header Matching Dribbble Reference ── */}
      <div className="space-y-3">
        {/* Date & Greeting Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-400 mb-1">{currentDate}</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {getGreeting()}! <span className="capitalize">{userName}</span>,
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/screens">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200/90 shadow-2xs transition-all">
                <MonitorPlay className="w-4 h-4 text-slate-500" />
                Kelola Layar
              </button>
            </Link>
            <Link href="/media/upload">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-2xs transition-all active:scale-[0.98]">
                <Plus className="w-4 h-4" />
                Upload Media
              </button>
            </Link>
          </div>
        </div>

        {/* Dribbble Signature Inline Pills Bar */}
        <div className="flex flex-wrap items-center gap-3 p-1.5 rounded-2xl bg-slate-100/70 border border-slate-200/70">
          <Link
            href="/screens"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/90 text-sm font-semibold text-slate-700 transition-all shadow-2xs"
          >
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{stats.onlineScreens}/{stats.totalScreens} Layar TV Online</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {screenOnlinePercentage}%
            </span>
          </Link>

          <Link
            href="/media"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/90 text-sm font-semibold text-slate-700 transition-all shadow-2xs"
          >
            <ImageIcon className="w-4 h-4 text-slate-500" />
            <span>{stats.totalMedia} File Media</span>
            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {formatStorageUsed(stats.totalStorageUsed)}
            </span>
          </Link>

          <Link
            href="/playlist"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/90 text-sm font-semibold text-slate-700 transition-all shadow-2xs"
          >
            <ListMusic className="w-4 h-4 text-slate-500" />
            <span>{stats.activePlaylists} Playlist Aktif</span>
          </Link>

          <Link
            href="/schedule"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/90 text-sm font-semibold text-slate-700 transition-all shadow-2xs"
          >
            <CalendarClock className="w-4 h-4 text-slate-500" />
            <span>{stats.todaySchedules} Jadwal Hari Ini</span>
          </Link>
        </div>
      </div>

      {/* ── Main Table Card: Status Perangkat Penyiaran ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-6 py-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <Radio className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Status Perangkat Penyiaran</h2>
              <p className="text-xs text-slate-500 font-normal">
                Monitoring status real-time seluruh TV Digital Signage yang terhubung.
              </p>
            </div>
          </div>

          {/* Clean Segmented Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-medium">
            <button
              onClick={() => setActiveScreenFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeScreenFilter === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua ({screens.length})
            </button>
            <button
              onClick={() => setActiveScreenFilter('online')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeScreenFilter === 'online'
                  ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Online ({stats.onlineScreens})
            </button>
            <button
              onClick={() => setActiveScreenFilter('offline')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeScreenFilter === 'offline'
                  ? 'bg-white text-slate-700 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Offline ({stats.offlineScreens})
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          {filteredScreens.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <MonitorPlay className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Tidak ada layar TV pada filter ini</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400">
                  <th className="text-left font-bold px-6 py-3.5 tracking-wider uppercase text-xs">
                    Identitas TV
                  </th>
                  <th className="text-left font-bold px-6 py-3.5 tracking-wider uppercase text-xs">
                    Lokasi / Area
                  </th>
                  <th className="text-left font-bold px-6 py-3.5 tracking-wider uppercase text-xs">
                    Status Penyiaran
                  </th>
                  <th className="text-left font-bold px-6 py-3.5 tracking-wider uppercase text-xs">
                    Terakhir Aktif
                  </th>
                  <th className="text-right font-bold px-6 py-3.5 tracking-wider uppercase text-xs">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredScreens.map((screen) => (
                  <tr key={screen.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`} />
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{screen.name}</p>
                          <span className="inline-block text-slate-400 font-mono text-xs mt-0.5">
                            {screen.screen_code}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 text-sm">{screen.site}</p>
                      {screen.area && <p className="text-xs text-slate-400 font-normal mt-0.5">{screen.area}</p>}
                    </td>
                    <td className="px-6 py-4">
                      {screen.status === 'online' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online (Menyiarkan)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Terputus / Offline
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                      {screen.last_seen ? getRelativeTime(screen.last_seen) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Black button for Buka Player as requested by user */}
                      <Link
                        href={`/player?code=${screen.screen_code}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-all active:scale-[0.97]"
                      >
                        <span>Buka Player</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Split Layout: Schedule & System Health (7 + 5) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT: Schedule Timeline Widget ── */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
                <CalendarClock className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Jadwal Tayang Penyiaran</h3>
                <p className="text-xs text-slate-400">Penyiaran otomatis yang aktif hari ini</p>
              </div>
            </div>
            <Link href="/schedule" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Lihat Semua
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Day Selector Strip */}
          <div className="grid grid-cols-7 gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60 text-center">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, idx) => {
              const isToday = idx === 3;
              return (
                <div
                  key={day}
                  className={`py-2 rounded-lg text-xs transition-all cursor-pointer ${
                    isToday
                      ? 'bg-blue-600 text-white font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider opacity-80">{day}</p>
                  <p className="text-sm font-bold mt-0.5">{13 + idx}</p>
                </div>
              );
            })}
          </div>

          {/* Schedule List */}
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 transition-all flex items-center justify-between border-l-4 border-l-blue-600">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                    08:00 - 17:00 WIB
                  </span>
                  <span className="text-sm font-bold text-slate-900">Penyiaran Utama PT Rolas</span>
                </div>
                <p className="text-xs text-slate-500">Playlist: Pengumuman Layanan Rumah Sakit (8 Slide)</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Berjalan
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-purple-200 transition-all flex items-center justify-between border-l-4 border-l-purple-600">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-md">
                    07:00 - 20:00 WIB
                  </span>
                  <span className="text-sm font-bold text-slate-900">Tayangan Edukasi Kesehatan</span>
                </div>
                <p className="text-xs text-slate-500">Playlist: Info Dokter & Fasilitas Medika</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Berjalan
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: System Health & Storage ── */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Health Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <BarChart3 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Kesehatan Perangkat TV</h3>
                  <p className="text-xs text-slate-400">Indikator stabilitas konektivitas</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {screenOnlinePercentage}% Optimal
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Perangkat Terhubung</span>
                <span className="font-bold text-slate-800">{stats.onlineScreens} / {stats.totalScreens} TV Online</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${screenOnlinePercentage}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">{stats.onlineScreens} TV</p>
                  <p className="text-xs text-emerald-700 font-medium">Terhubung Normal</p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
                <AlertCircle className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-800">{stats.offlineScreens} TV</p>
                  <p className="text-xs text-slate-500 font-medium">Terputus / Off</p>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                  <HardDrive className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Kapasitas Penyimpanan</h3>
                  <p className="text-xs text-slate-400">Total file media tersimpan</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200/60">
                {formatStorageUsed(stats.totalStorageUsed)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="w-4.5 h-4.5 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">{stats.totalMedia} File Gambar & Video</span>
              </div>
              <Link href="/media/upload" className="text-xs font-bold text-blue-600 hover:underline">
                + Upload
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
