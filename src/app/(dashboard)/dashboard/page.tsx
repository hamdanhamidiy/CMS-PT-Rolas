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
  Upload,
  Radio,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
  BarChart3,
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

  const statCards = [
    {
      label: 'Layar TV',
      value: stats.onlineScreens,
      totalText: `/ ${stats.totalScreens} Unit`,
      badge: `${screenOnlinePercentage}% Online`,
      badgeStyle: 'text-blue-700 bg-blue-50/80 border-blue-200/60',
      icon: MonitorPlay,
      topAccent: 'bg-gradient-to-r from-blue-600 to-cyan-500',
      iconBoxStyle: 'bg-blue-50/80 border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600',
      progressColor: 'bg-blue-600',
      href: '/screens',
      progress: screenOnlinePercentage,
    },
    {
      label: 'Total Media',
      value: stats.totalMedia,
      totalText: 'File Media',
      badge: formatStorageUsed(stats.totalStorageUsed),
      badgeStyle: 'text-emerald-700 bg-emerald-50/80 border-emerald-200/60',
      icon: ImageIcon,
      topAccent: 'bg-gradient-to-r from-emerald-600 to-teal-500',
      iconBoxStyle: 'bg-emerald-50/80 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600',
      progressColor: 'bg-emerald-600',
      href: '/media',
      progress: Math.min(100, (stats.totalMedia / 50) * 100),
    },
    {
      label: 'Playlist Aktif',
      value: stats.activePlaylists,
      totalText: `/ ${stats.totalPlaylists} Playlist`,
      badge: stats.activePlaylists > 0 ? 'Sedang Diputar' : 'Nonaktif',
      badgeStyle: stats.activePlaylists > 0 ? 'text-violet-700 bg-violet-50/80 border-violet-200/60' : 'text-slate-600 bg-slate-100/80 border-slate-200/60',
      icon: ListMusic,
      topAccent: 'bg-gradient-to-r from-violet-600 to-indigo-500',
      iconBoxStyle: 'bg-violet-50/80 border-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600',
      progressColor: 'bg-violet-600',
      href: '/playlist',
      progress: stats.totalPlaylists > 0 ? Math.round((stats.activePlaylists / stats.totalPlaylists) * 100) : 0,
    },
    {
      label: 'Jadwal Hari Ini',
      value: stats.todaySchedules,
      totalText: 'Program Aktif',
      badge: 'Penyiaran Otomatis',
      badgeStyle: 'text-amber-700 bg-amber-50/80 border-amber-200/60',
      icon: CalendarClock,
      topAccent: 'bg-gradient-to-r from-amber-600 to-orange-500',
      iconBoxStyle: 'bg-amber-50/80 border-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600',
      progressColor: 'bg-amber-600',
      href: '/schedule',
      progress: stats.todaySchedules > 0 ? 100 : 0,
    },
  ];

  return (
    <div className="pb-8 space-y-4">
      
      {/* ── Greeting Header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200/60">
        <div className="space-y-0.5">
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse-dot" />
            {currentDate}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {getGreeting()}, <span className="text-slate-600 capitalize">{userName}</span>
          </h1>
          <p className="text-xs text-slate-500 font-normal">
            Pantau status perangkat, kelola media penyiaran, dan jalankan jadwal tayang.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/media/upload">
            <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all duration-200 active:scale-[0.97]">
              <Upload className="w-3.5 h-3.5" />
              Upload Media
            </button>
          </Link>
        </div>
      </header>

      {/* ── Refined Multi-Color Corporate Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="stat-card group bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Top Accent Line Gradient */}
              <div className={`absolute top-0 left-0 right-0 h-[2.5px] ${card.topAccent}`} />

              <div className="space-y-2">
                {/* Top Row: Color Icon Box + Badge */}
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors duration-200 ${card.iconBoxStyle}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${card.badgeStyle} flex items-center gap-1`}>
                    {card.label === 'Layar TV' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    )}
                    {card.badge}
                  </span>
                </div>

                {/* Content: Label & Main Value */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-slate-900 tracking-tight">
                      {card.value}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {card.totalText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Accent Mini Progress Bar */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mr-2">
                  <div
                    className={`h-full rounded-full ${card.progressColor} transition-all duration-300`}
                    style={{ width: `${Math.max(8, card.progress)}%` }}
                  />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Main Content Grid (8 + 4) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT: Screen Monitoring ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Real-time Device Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  </div>
                  Status Perangkat Penyiaran
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-1 ml-[38px]">
                  Monitoring real-time seluruh TV Digital Signage yang terhubung.
                </p>
              </div>
              <Link
                href="/screens"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all border border-slate-200/60 hover:border-slate-300 group"
              >
                Kelola Layar
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="p-0">
              {screens.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                    <MonitorPlay className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Belum ada layar terdaftar</p>
                  <p className="text-xs text-slate-500 mt-1 font-normal max-w-xs mx-auto">
                    Tambahkan perangkat pertama Anda untuk memulai penyiaran media.
                  </p>
                  <Link href="/screens" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200/60 transition-colors">
                    Tambah Layar
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">
                          Identitas TV
                        </th>
                        <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">
                          Lokasi / Area
                        </th>
                        <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">
                          Status
                        </th>
                        <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[10px]">
                          Terakhir Aktif
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                      {screens.map((screen) => (
                        <tr
                          key={screen.id}
                          className="hover:bg-slate-50/60 transition-colors duration-150"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`relative w-2.5 h-2.5 rounded-full ${
                                screen.status === 'online' ? 'bg-blue-600' : 'bg-slate-300'
                              }`}>
                                {screen.status === 'online' && (
                                  <span className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-30" />
                                )}
                              </div>
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
                          <td className="px-6 py-4">
                            <p className="text-xs font-medium text-slate-800">{screen.site}</p>
                            {screen.area && (
                              <p className="text-[11px] text-slate-400 font-normal mt-0.5">{screen.area}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {screen.status === 'online' ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                {screen.status === 'inactive' ? 'Tidak Aktif' : 'Offline'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-normal">
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

        {/* ── RIGHT: Performance & Storage ── */}
        <div className="lg:col-span-4 space-y-5">

          {/* Device Performance Meter */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                </div>
                Performa Layar
              </h3>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                screenOnlinePercentage >= 80
                  ? 'text-blue-700 bg-blue-50 border-blue-100'
                  : screenOnlinePercentage >= 50
                    ? 'text-slate-700 bg-slate-100 border-slate-200'
                    : 'text-red-600 bg-red-50 border-red-100'
              }`}>
                {screenOnlinePercentage}%
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Perangkat Terhubung</span>
                <span className="font-semibold text-slate-800">{stats.onlineScreens} / {stats.totalScreens} TV</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 transition-all duration-1000 ease-out"
                  style={{ width: `${screenOnlinePercentage}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-blue-50/50 rounded-xl px-3 py-2.5 border border-blue-100/60">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-blue-900">{stats.onlineScreens}</p>
                  <p className="text-[10px] text-blue-700">Terhubung</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200/60">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-700">{stats.offlineScreens}</p>
                  <p className="text-[10px] text-slate-500">Terputus</p>
                </div>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <HardDrive className="w-3.5 h-3.5 text-slate-700" />
                </div>
                Penyimpanan Media
              </h3>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
                {formatStorageUsed(stats.totalStorageUsed)}
              </span>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 p-4 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center shadow-xs">
                  <Zap className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{stats.totalMedia} File Media</p>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                    Digunakan untuk penyiaran layar TV
                  </p>
                </div>
              </div>
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
