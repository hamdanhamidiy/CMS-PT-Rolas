'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import {
  Activity,
  Search,
  Loader2,
  Upload,
  Trash2,
  ListMusic,
  CalendarClock,
  MonitorPlay,
  Key,
  LogIn,
  XCircle,
  Play,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { formatDateTime, getRelativeTime } from '@/lib/utils';

interface ActivityLogItem {
  id: string;
  action: string;
  entity_type: string;
  details: string | null;
  created_at: string;
  profile?: { full_name: string; email: string } | null;
}

const actionConfig: Record<string, { icon: any; label: string; badge: string }> = {
  login: { icon: LogIn, label: 'Login Sesi', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  upload_media: { icon: Upload, label: 'Upload Media', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  delete_media: { icon: Trash2, label: 'Hapus Media', badge: 'bg-red-50 text-red-700 border-red-200' },
  create_playlist: { icon: ListMusic, label: 'Buat Playlist', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  update_playlist: { icon: ListMusic, label: 'Update Playlist', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  delete_playlist: { icon: Trash2, label: 'Hapus Playlist', badge: 'bg-red-50 text-red-700 border-red-200' },
  create_schedule: { icon: CalendarClock, label: 'Buat Jadwal', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  publish_schedule: { icon: Play, label: 'Publish Jadwal', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancel_schedule: { icon: XCircle, label: 'Cancel Jadwal', badge: 'bg-red-50 text-red-700 border-red-200' },
  create_screen: { icon: MonitorPlay, label: 'Tambah Layar', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  activate_screen: { icon: MonitorPlay, label: 'Aktivasi Layar', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  delete_screen: { icon: Trash2, label: 'Hapus Layar', badge: 'bg-red-50 text-red-700 border-red-200' },
  generate_activation_code: { icon: Key, label: 'Kode Aktivasi', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function ActivityPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('activity_logs')
      .select('*, profile:profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    setLogs(data || []);
    setLoading(false);
  };

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      log.action.includes(term) ||
      log.details?.toLowerCase().includes(term) ||
      log.profile?.email?.toLowerCase().includes(term) ||
      log.profile?.full_name?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="pb-10 space-y-4">
      
      {/* ── Minimalist Compact Header Bar (No Bulky Cards) ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Jurnal Audit Aktivitas
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                {logs.length} Log
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">
              Catatan riwayat tindakan pengelola dan aktivitas sistem digital signage.
            </p>
          </div>
        </div>

        {/* Integrated Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Cari log atau operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8.5 h-8.5 text-xs bg-slate-50/60 border-slate-200/80 rounded-lg focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </header>

      {/* ── High-Density Minimalist Audit Table ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-12 text-center">
          <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-900">
            {search ? 'Tidak ada catatan aktivitas yang cocok' : 'Belum Ada Catatan Aktivitas'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  <th className="text-left font-semibold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">Tindakan</th>
                  <th className="text-left font-semibold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">Rincian Aktivitas</th>
                  <th className="text-left font-semibold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">Operator</th>
                  <th className="text-right font-semibold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => {
                  const cfg = actionConfig[log.action] || {
                    icon: Activity,
                    label: log.action,
                    badge: 'bg-slate-100 text-slate-600 border-slate-200',
                  };
                  const Icon = cfg.icon;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 font-bold text-[10px] px-2 py-0.5 rounded-md border ${cfg.badge}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-bold text-slate-800 leading-snug">
                          {log.details || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-500 font-medium">
                        {log.profile?.email || log.profile?.full_name || 'Sistem Operator'}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap text-slate-400 font-normal">
                        <span title={formatDateTime(log.created_at)}>
                          {getRelativeTime(log.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
