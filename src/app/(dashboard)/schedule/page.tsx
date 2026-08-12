'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
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
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import type { Schedule } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function SchedulePage() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'completed'>('all');

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('schedules')
      .select('*, playlist:playlists(name), schedule_screens(screen_id)')
      .order('created_at', { ascending: false });

    setSchedules(data || []);
    setLoading(false);
  };

  const handleStatusChange = async (schedule: Schedule, newStatus: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('schedules')
      .update({ status: newStatus })
      .eq('id', schedule.id);

    if (error) {
      toast.error('Gagal mengubah status');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: newStatus === 'active' ? 'publish_schedule' : 'cancel_schedule',
        entity_type: 'schedule',
        entity_id: schedule.id,
        details: `${newStatus === 'active' ? 'Publish' : 'Cancel'} jadwal: ${schedule.name}`,
      });
    }

    toast.success(`Jadwal berhasil di-${newStatus === 'active' ? 'publish' : 'cancel'}`);
    loadSchedules();
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
            Atur tanggal mulai/selesai, jam tayang harian, serta penugasan layar TV secara otomatis.
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

        {/* ── LEFT COLUMN (8 Columns): Filters & Timeline Agenda Cards ── */}
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
              {(['all', 'active', 'draft', 'completed'] as const).map((f) => (
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
                    <div className="flex items-start justify-between gap-4">
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

                      {/* Action Button */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {schedule.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(schedule, 'active')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Publish
                          </button>
                        )}
                        {schedule.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(schedule, 'cancelled')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Batalkan
                          </button>
                        )}
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

    </div>
  );
}
