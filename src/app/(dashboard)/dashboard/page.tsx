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
  Activity,
  Plus,
  Upload,
  Clock,
  Radio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import type { Screen, DashboardStats } from '@/lib/types';
import { getRelativeTime } from '@/lib/utils';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('Admin');
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

  const currentDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const screenOnlinePercentage = stats.totalScreens > 0 
    ? Math.round((stats.onlineScreens / stats.totalScreens) * 100)
    : 0;

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
              Pusat Kontrol Digital Signage
            </h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 capitalize">
              {userName}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Pantau status koneksi perangkat layar, kelola media penyiaran, dan jalankan antrean tayang.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {currentDate}
          </div>
          <Link href="/media/upload">
            <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-2xs transition-all">
              <Upload className="w-3.5 h-3.5" />
              Upload Media
            </button>
          </Link>
        </div>
      </header>

      {/* ── Asymmetric Enterprise Layout (8 Cols + 4 Cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN (8 Columns): Screen Status & Activity Stream ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Quick Metrics Cards Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Layar TV</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.onlineScreens} <span className="text-xs font-medium text-slate-400">/ {stats.totalScreens}</span></p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Media</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalMedia} <span className="text-xs font-medium text-slate-400">File</span></p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Playlist</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.activePlaylists} <span className="text-xs font-medium text-slate-400">Aktif</span></p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jadwal</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.todaySchedules} <span className="text-xs font-medium text-slate-400">Hari ini</span></p>
            </div>
          </div>

          {/* Real-time Perangkat Monitoring Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                  Status Perangkat Penyiaran
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Daftar seluruh TV Digital Signage yang terhubung ke server secara real-time.
                </p>
              </div>
              <Link
                href="/screens"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
              >
                Kelola Layar
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-0">
              {screens.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <MonitorPlay className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-900">Belum ada layar terdaftar</p>
                  <p className="text-xs text-slate-500 mt-1 font-normal">
                    Tambahkan perangkat pertama Anda untuk memulai penyiaran media.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-slate-50/80">
                        <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">
                          Identitas TV
                        </th>
                        <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">
                          Lokasi / Area
                        </th>
                        <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">
                          Status Perangkat
                        </th>
                        <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">
                          Terakhir Aktif
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {screens.map((screen) => (
                        <tr
                          key={screen.id}
                          className="hover:bg-slate-50/80 transition-colors duration-150"
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                              }`} />
                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {screen.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {screen.screen_code}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <p className="text-xs font-medium text-slate-800">{screen.site}</p>
                            {screen.area && (
                              <p className="text-[11px] text-slate-400 font-normal mt-0.5">{screen.area}</p>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            {screen.status === 'online' ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                {screen.status === 'inactive' ? 'Tidak Aktif' : 'Offline'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-slate-500 font-normal">
                            {screen.last_seen
                              ? getRelativeTime(screen.last_seen)
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN (4 Columns): Performa Gauge, Storage Meter & Shortcuts ── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Device Connectivity Status Meter */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Status Performa Layar
              </h3>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {screenOnlinePercentage}% Online
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Total Perangkat</span>
                <span className="font-semibold text-slate-800">{stats.onlineScreens} dari {stats.totalScreens} TV</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${screenOnlinePercentage}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {stats.onlineScreens} Terhubung
              </span>
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                {stats.offlineScreens} Terputus
              </span>
            </div>
          </div>

          {/* Storage Capacity Gauge */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-600" />
                Kapasitas Penyimpanan
              </h3>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {formatStorageUsed(stats.totalStorageUsed)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <p className="text-[11px] text-slate-500 font-normal">
                Media yang terunggah digunakan untuk penyiaran di seluruh layar TV cabang.
              </p>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mt-2">
                <span>Total Media File</span>
                <span>{stats.totalMedia} File</span>
              </div>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight mb-2">
              Menu Pintas Akses Cepat
            </h3>

            <Link href="/media/upload" className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Unggah Media</p>
                  <p className="text-[10px] text-slate-400 font-normal">Tambah video/gambar baru</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link href="/playlist" className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <ListMusic className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Kelola Playlist</p>
                  <p className="text-[10px] text-slate-400 font-normal">Atur urutan tayang slide</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link href="/schedule" className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Jadwal Penyiaran</p>
                  <p className="text-[10px] text-slate-400 font-normal">Set waktu tayang otomatis</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
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
