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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="pb-10 space-y-6">
      
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200/60">
        <div>
          <p className="text-xs text-slate-400 font-medium mb-1">{currentDate}</p>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {getGreeting()}, <span className="capitalize">{userName}</span>
          </h1>
          <p className="text-[13px] text-slate-500 font-normal mt-0.5">
            Ringkasan operasional sistem digital signage hari ini.
          </p>
        </div>

        <Link href="/media/upload">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-sm transition-all active:scale-[0.98]">
            <Upload className="w-3.5 h-3.5" />
            Upload Media
          </button>
        </Link>
      </header>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {[
          { label: 'Layar TV', value: stats.onlineScreens, sub: `dari ${stats.totalScreens}`, icon: MonitorPlay },
          { label: 'Total Media', value: stats.totalMedia, sub: 'File', icon: ImageIcon },
          { label: 'Playlist Aktif', value: stats.activePlaylists, sub: `dari ${stats.totalPlaylists}`, icon: ListMusic },
          { label: 'Jadwal Hari Ini', value: stats.todaySchedules, sub: 'Aktif', icon: CalendarClock },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                  <Icon className="w-[18px] h-[18px]" />
                </div>
              </div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">
                {card.value}
                <span className="text-xs font-medium text-slate-400 ml-1.5">{card.sub}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Main Grid (8 + 4) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT: Device Monitoring ── */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Radio className="w-4 h-4 text-slate-500 animate-pulse" />
                  Status Perangkat Penyiaran
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Monitoring TV Digital Signage yang terhubung ke server.
                </p>
              </div>
              <Link
                href="/screens"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors group"
              >
                Kelola Layar
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {screens.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <MonitorPlay className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                <p className="text-sm font-semibold text-slate-800">Belum ada layar terdaftar</p>
                <p className="text-xs text-slate-500 mt-1 font-normal">
                  Tambahkan perangkat pertama Anda untuk memulai penyiaran.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">Identitas TV</th>
                      <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">Lokasi</th>
                      <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">Status</th>
                      <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">Terakhir Aktif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {screens.map((screen) => (
                      <tr key={screen.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`relative w-2 h-2 rounded-full flex-shrink-0 ${
                              screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}>
                              {screen.status === 'online' && (
                                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{screen.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{screen.screen_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <p className="text-xs font-medium text-slate-700">{screen.site}</p>
                          {screen.area && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{screen.area}</p>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          {screen.status === 'online' ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {screen.status === 'inactive' ? 'Tidak Aktif' : 'Offline'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-500">
                          {screen.last_seen ? getRelativeTime(screen.last_seen) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Performance & Quick Actions ── */}
        <div className="lg:col-span-4 space-y-5">

          {/* Device Performance */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight mb-4">Status Performa Layar</h3>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Perangkat Online</span>
                <span className="font-semibold text-slate-800">{stats.onlineScreens} / {stats.totalScreens}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-800 transition-all duration-700 ease-out"
                  style={{ width: `${screenOnlinePercentage}%` }}
                />
              </div>
              <p className="text-right text-[11px] font-semibold text-slate-500">{screenOnlinePercentage}% terhubung</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">{stats.onlineScreens}</p>
                  <p className="text-[10px] text-slate-400">Terhubung</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">{stats.offlineScreens}</p>
                  <p className="text-[10px] text-slate-400">Terputus</p>
                </div>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">Penyimpanan Media</h3>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {formatStorageUsed(stats.totalStorageUsed)}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{stats.totalMedia} File Media</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Digunakan untuk penyiaran layar TV.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight mb-3">Akses Cepat</h3>
            <div className="space-y-2">
              {[
                { label: 'Unggah Media', desc: 'Tambah video/gambar baru', href: '/media/upload', icon: Upload },
                { label: 'Kelola Playlist', desc: 'Atur urutan tayang slide', href: '/playlist', icon: ListMusic },
                { label: 'Jadwal Penyiaran', desc: 'Set waktu tayang otomatis', href: '/schedule', icon: CalendarClock },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href} className="quick-action-link flex items-center justify-between p-3 rounded-lg border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300/60 group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200/60 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">{action.label}</p>
                        <p className="text-[10px] text-slate-400">{action.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                );
              })}
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
