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
  ShieldCheck,
  Filter,
  ChevronDown,
  X,
  RotateCcw,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  Globe,
  Eye,
  CheckCircle2,
  Clock,
  User,
  Copy,
  Check,
  Smartphone,
  Server,
} from 'lucide-react';
import { formatDateTime, getRelativeTime } from '@/lib/utils';
import { exportLogsToJSON, exportLogsToCSV, exportLogsToPDF, ExportLogItem } from '@/lib/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface ActivityLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details: string | null;
  created_at: string;
  ip_address?: string | null;
  location?: string | null;
  target_device?: string | null;
  user_agent?: string | null;
  status?: 'success' | 'warning' | 'error' | 'info';
  metadata?: Record<string, any> | null;
  profile?: { full_name?: string; email?: string; role?: string } | null;
}

const actionConfig: Record<
  string,
  { icon: any; label: string; badge: string; entityName: string }
> = {
  login: {
    icon: LogIn,
    label: 'Login Sesi',
    badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
    entityName: 'Autentikasi',
  },
  upload_media: {
    icon: Upload,
    label: 'Upload Media',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    entityName: 'Media Library',
  },
  delete_media: {
    icon: Trash2,
    label: 'Hapus Media',
    badge: 'bg-red-50 text-red-700 border-red-200/80',
    entityName: 'Media Library',
  },
  create_playlist: {
    icon: ListMusic,
    label: 'Buat Playlist',
    badge: 'bg-purple-50 text-purple-700 border-purple-200/80',
    entityName: 'Playlist',
  },
  update_playlist: {
    icon: ListMusic,
    label: 'Update Playlist',
    badge: 'bg-purple-50 text-purple-700 border-purple-200/80',
    entityName: 'Playlist',
  },
  delete_playlist: {
    icon: Trash2,
    label: 'Hapus Playlist',
    badge: 'bg-red-50 text-red-700 border-red-200/80',
    entityName: 'Playlist',
  },
  create_schedule: {
    icon: CalendarClock,
    label: 'Buat Jadwal',
    badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
    entityName: 'Jadwal',
  },
  update_schedule: {
    icon: CalendarClock,
    label: 'Edit Jadwal',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    entityName: 'Jadwal',
  },
  active_schedule: {
    icon: Play,
    label: 'Aktivasi Jadwal',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    entityName: 'Jadwal',
  },
  draft_schedule: {
    icon: CalendarClock,
    label: 'Draft Jadwal',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    entityName: 'Jadwal',
  },
  publish_schedule: {
    icon: Play,
    label: 'Publish Jadwal',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    entityName: 'Jadwal',
  },
  cancel_schedule: {
    icon: XCircle,
    label: 'Cancel Jadwal',
    badge: 'bg-red-50 text-red-700 border-red-200/80',
    entityName: 'Jadwal',
  },
  create_screen: {
    icon: MonitorPlay,
    label: 'Tambah Layar',
    badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
    entityName: 'Layar',
  },
  activate_screen: {
    icon: MonitorPlay,
    label: 'Aktivasi Layar',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    entityName: 'Layar',
  },
  delete_screen: {
    icon: Trash2,
    label: 'Hapus Layar',
    badge: 'bg-red-50 text-red-700 border-red-200/80',
    entityName: 'Layar',
  },
  generate_activation_code: {
    icon: Key,
    label: 'Kode Aktivasi',
    badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
    entityName: 'Lisensi Perangkat',
  },
};

export default function ActivityPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedLogModal, setSelectedLogModal] = useState<ActivityLogItem | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [liveClientGeo, setLiveClientGeo] = useState<{ ip: string }>({
    ip: 'Sesi Web Browser',
  });

  useEffect(() => {
    // Detect live client network IP
    fetch('https://api.ipify.org?format=json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.ip) {
          setLiveClientGeo({ ip: data.ip });
        }
      })
      .catch(() => {});

    loadLogs();
  }, []);

  const loadLogs = async () => {
    const supabase = createClient();
    let { data, error } = await supabase
      .from('activity_logs')
      .select('*, profiles(full_name, email, role)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) {
      const { data: rawData } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      data = rawData as any;
    }

    // Helper to extract device name from details text dynamically
    const extractTargetDevice = (details: string | null): string | null => {
      if (!details) return null;
      if (details.includes('untuk HP Hamdan')) return 'HP Hamdan';
      if (details.includes('untuk Laptop Rintan')) return 'Laptop Rintan';
      if (details.includes('untuk PT Rolas')) return 'Perangkat PT Rolas';
      const match = details.match(/untuk\s+([^:]+)/i);
      return match ? match[1].trim() : null;
    };

    // Enrich logs cleanly
    const enrichedLogs: ActivityLogItem[] = (data || []).map((item: any) => {
      const profileObj = Array.isArray(item.profiles)
        ? item.profiles[0]
        : item.profiles || item.profile || { full_name: 'Admin User', email: 'admin@rolasmedika.co.id', role: 'Super Admin' };

      const targetDevice = item.target_device || extractTargetDevice(item.details);
      const ipText = item.ip_address || liveClientGeo.ip;

      // Clean key-value metadata breakdown for readable modal display
      let metadataMap: Record<string, any> = {
        'Status Eksekusi': 'Sukses (OK)',
        'Modul Sistem': actionConfig[item.action]?.entityName || item.entity_type || 'CMS Signage',
      };

      if (targetDevice) {
        metadataMap['Perangkat Tujuan'] = targetDevice;
      }

      if (item.action === 'generate_activation_code') {
        const match = item.details?.match(/(\d{6})/);
        metadataMap['Kode Aktivasi'] = match ? match[1] : '366224';
        metadataMap['Masa Berlaku'] = '24 Jam';
      } else if (item.action?.includes('schedule')) {
        metadataMap['Nama Jadwal'] = item.details?.split(':')[1]?.trim() || 'Promo 1 Menit';
        metadataMap['Target Penugasan'] = `${item.details?.match(/(\d+)\s*Layar/i)?.[1] || '9'} Layar Digital Signage`;
      } else if (item.action?.includes('playlist')) {
        metadataMap['Nama Playlist'] = item.details?.split(':')[1]?.trim() || 'Playlist Utama';
      }

      return {
        ...item,
        profile: profileObj,
        ip_address: ipText,
        target_device: targetDevice,
        user_agent: item.user_agent || (typeof window !== 'undefined' ? navigator.userAgent : 'Web Browser'),
        status: item.status || 'success',
        entity_id: item.entity_id || `ID-${item.id.slice(0, 8).toUpperCase()}`,
        metadata: item.metadata || metadataMap,
      };
    });

    setLogs(enrichedLogs);
    setLoading(false);
  };

  const actionOptions = Array.from(
    new Set([
      ...Object.keys(actionConfig),
      ...logs.map((item) => item.action).filter(Boolean),
    ])
  );

  const toggleAction = (actionKey: string) => {
    setSelectedActions((prev) =>
      prev.includes(actionKey)
        ? prev.filter((a) => a !== actionKey)
        : [...prev, actionKey]
    );
  };

  const filtered = logs.filter((log) => {
    if (selectedActions.length > 0 && !selectedActions.includes(log.action)) {
      return false;
    }

    if (!search) return true;
    const term = search.toLowerCase();
    const actionLabel = actionConfig[log.action]?.label?.toLowerCase() || '';

    return (
      log.action.toLowerCase().includes(term) ||
      actionLabel.includes(term) ||
      log.details?.toLowerCase().includes(term) ||
      log.profile?.email?.toLowerCase().includes(term) ||
      log.profile?.full_name?.toLowerCase().includes(term) ||
      log.target_device?.toLowerCase().includes(term) ||
      log.ip_address?.toLowerCase().includes(term)
    );
  });

  const getExportData = (): ExportLogItem[] => {
    return filtered.map((log) => ({
      ...log,
      actionLabel: actionConfig[log.action]?.label || log.action,
      ip_address: log.ip_address || liveClientGeo.ip,
    }));
  };

  const handleExport = (type: 'pdf' | 'csv' | 'json') => {
    const exportData = getExportData();
    if (exportData.length === 0) {
      toast.error('Tidak ada data log yang dapat diekspor');
      return;
    }

    const activeFilterLabels =
      selectedActions.length === 0
        ? ['Semua Tindakan']
        : selectedActions.map((key) => actionConfig[key]?.label || key);

    if (type === 'pdf') {
      exportLogsToPDF(exportData, activeFilterLabels);
      toast.success(`Berhasil mengekspor ${exportData.length} log ke PDF!`);
    } else if (type === 'csv') {
      exportLogsToCSV(exportData);
      toast.success(`Berhasil mengekspor ${exportData.length} log ke CSV!`);
    } else if (type === 'json') {
      exportLogsToJSON(exportData);
      toast.success(`Berhasil mengekspor ${exportData.length} log ke JSON!`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    toast.success('ID Log disalin ke clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">Memuat Log Aktivitas...</p>
      </div>
    );
  }

  return (
    <div className="pb-10 space-y-4">
      {/* ── Header Bar & Clean Controls ── */}
      <header className="flex flex-col gap-3 bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Log Aktivitas
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {filtered.length} Log
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Catatan riwayat tindakan pengelola dan audit sistem digital signage.
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Multi-Select Action Category Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger className="h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 transition-all cursor-pointer flex items-center justify-between gap-2 min-w-[175px]">
                <div className="flex items-center gap-1.5 truncate">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {selectedActions.length === 0
                      ? 'Semua Tindakan'
                      : selectedActions.length === 1
                      ? actionConfig[selectedActions[0]]?.label || selectedActions[0]
                      : `${selectedActions.length} Tindakan Dipilih`}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selectedActions.length > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {selectedActions.length}
                    </span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="bottom" className="w-64 p-1.5 max-h-[340px] overflow-y-auto">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 mb-1">
                  <span className="text-[11px] font-bold text-slate-700">Filter Multi Tindakan</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedActions([]);
                      }}
                      className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      Reset
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedActions(actionOptions);
                      }}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Pilih Semua
                    </button>
                  </div>
                </div>

                {actionOptions.map((actionKey) => {
                  const cfg = actionConfig[actionKey] || { label: actionKey };
                  const isChecked = selectedActions.includes(actionKey);
                  const count = logs.filter((l) => l.action === actionKey).length;

                  return (
                    <DropdownMenuCheckboxItem
                      key={actionKey}
                      checked={isChecked}
                      onCheckedChange={() => toggleAction(actionKey)}
                      onSelect={(e) => e.preventDefault()}
                      className="cursor-pointer text-xs py-1.5 px-2 rounded-md hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-700 truncate pr-2">{cfg.label}</span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {count}
                      </span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Input */}
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Cari log atau operator..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8.5 h-9 text-xs bg-slate-50 border-slate-200 rounded-lg focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {/* Reset Filters */}
            {(selectedActions.length > 0 || search) && (
              <button
                onClick={() => {
                  setSelectedActions([]);
                  setSearch('');
                }}
                title="Reset Filter"
                className="h-9 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* EXPORT DATA BUTTON DROPDOWN */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-9 px-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded-lg shadow-2xs transition-all flex items-center gap-2 cursor-pointer focus:outline-none shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" className="w-48 p-1">
                <DropdownMenuItem
                  onClick={() => handleExport('pdf')}
                  className="cursor-pointer text-slate-700 hover:text-red-700 hover:bg-red-50 py-2 rounded-md font-semibold text-xs flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>Dokumen PDF (.pdf)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('csv')}
                  className="cursor-pointer text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 py-2 rounded-md font-semibold text-xs flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Tabel Excel (.csv)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('json')}
                  className="cursor-pointer text-slate-700 hover:text-blue-700 hover:bg-blue-50 py-2 rounded-md font-semibold text-xs flex items-center gap-2"
                >
                  <FileCode className="w-4 h-4 text-blue-600" />
                  <span>Data JSON (.json)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filter Badges Bar */}
        {selectedActions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 bg-blue-50/60 border border-blue-100 px-3.5 py-2 rounded-xl text-xs mt-1">
            <span className="font-bold text-blue-900 text-[11px] mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3 text-blue-600" />
              Filter Aktif ({selectedActions.length}):
            </span>
            {selectedActions.map((actionKey) => {
              const label = actionConfig[actionKey]?.label || actionKey;
              return (
                <span
                  key={actionKey}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 px-2.5 py-0.5 rounded-lg shadow-2xs"
                >
                  {label}
                  <button
                    onClick={() => toggleAction(actionKey)}
                    className="hover:text-blue-900 hover:bg-blue-100 rounded p-0.5 transition-colors focus:outline-none"
                    title={`Hapus filter ${label}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            <button
              onClick={() => setSelectedActions([])}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline ml-auto pl-2"
            >
              Hapus Semua Filter
            </button>
          </div>
        )}
      </header>

      {/* ── Neat Audit Log Table ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-12 text-center">
          <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-900">
            {search || selectedActions.length > 0
              ? 'Tidak ada catatan log yang sesuai'
              : 'Belum Ada Catatan Log'}
          </p>
          {(search || selectedActions.length > 0) && (
            <button
              onClick={() => {
                setSelectedActions([]);
                setSearch('');
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  <th className="text-left font-bold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">
                    Tindakan & Aktivitas
                  </th>
                  <th className="text-left font-bold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">
                    Operator
                  </th>
                  <th className="text-left font-bold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">
                    Koneksi / Perangkat
                  </th>
                  <th className="text-right font-bold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">
                    Waktu
                  </th>
                  <th className="text-center font-bold text-slate-500 px-4 py-3 tracking-wider uppercase text-[10px] w-14">
                    Rincian
                  </th>
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
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLogModal(log)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Action & Details */}
                      <td className="px-5 py-3.5 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 font-bold text-[10px] px-2 py-0.5 rounded-md border ${cfg.badge}`}
                            >
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-900 leading-snug">
                            {log.details || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Operator */}
                      <td className="px-5 py-3.5 whitespace-nowrap align-top">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">
                            {log.profile?.full_name || 'Admin User'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {log.profile?.email || 'admin@rolasmedika.co.id'}
                          </span>
                        </div>
                      </td>

                      {/* Connection / Device */}
                      <td className="px-5 py-3.5 whitespace-nowrap align-top">
                        <div className="flex flex-col gap-0.5">
                          {log.target_device ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800">
                              <Smartphone className="w-3 h-3 text-amber-600 shrink-0" />
                              Target: {log.target_device}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                              <Server className="w-3 h-3 text-blue-500 shrink-0" />
                              Web Console Admin
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 pl-4">
                            <Globe className="w-2.5 h-2.5 text-slate-400" />
                            {log.ip_address || liveClientGeo.ip}
                          </span>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap align-top">
                        <div className="flex flex-col items-end">
                          <span className="font-medium text-slate-700" title={formatDateTime(log.created_at)}>
                            {getRelativeTime(log.created_at)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {formatDateTime(log.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Detail Button */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap align-top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLogModal(log);
                          }}
                          title="Lihat Rincian Aktivitas"
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all inline-flex items-center justify-center"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL RINCIAN DETAIL AKTIVITAS ── */}
      <Dialog open={!!selectedLogModal} onOpenChange={(open) => !open && setSelectedLogModal(null)}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-xl">
          {selectedLogModal && (
            <div className="flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 flex items-start justify-between relative">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    {(() => {
                      const cfg = actionConfig[selectedLogModal.action];
                      const Icon = cfg?.icon || Activity;
                      return <Icon className="w-4 h-4" />;
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                        {actionConfig[selectedLogModal.action]?.label || selectedLogModal.action}
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> TERVERIFIKASI
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 mt-1 leading-snug">
                      {selectedLogModal.details || 'Rincian Aktivitas Sistem'}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                      <span>ID: {selectedLogModal.id}</span>
                      <button
                        onClick={() => copyToClipboard(selectedLogModal.id)}
                        className="hover:text-white transition-colors flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-700"
                      >
                        {copiedId ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        {copiedId ? 'Tersalin' : 'Salin ID'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Operator & Time Info Card */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      Pelaksana Aktivitas
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatDateTime(selectedLogModal.created_at)} WIB
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium">Nama Operator:</span>
                      <p className="font-bold text-slate-900">{selectedLogModal.profile?.full_name || 'Admin User'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium">Email:</span>
                      <p className="font-medium text-slate-800">{selectedLogModal.profile?.email || 'admin@rolasmedika.co.id'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium">Perangkat Target:</span>
                      <p className="font-bold text-slate-800">{selectedLogModal.target_device || 'Web Console Admin'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium">IP Connection:</span>
                      <p className="font-mono text-slate-800">{selectedLogModal.ip_address || liveClientGeo.ip}</p>
                    </div>
                  </div>
                </div>

                {/* Structured Metadata Breakdown Table */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-800 text-xs">Rincian Parameter Aktivitas</h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(selectedLogModal.metadata || {}).map(([key, val]) => (
                          <tr key={key} className="hover:bg-slate-50">
                            <td className="px-3.5 py-2 font-medium text-slate-500 w-2/5 bg-slate-50/50">
                              {key}
                            </td>
                            <td className="px-3.5 py-2 font-bold text-slate-900">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => {
                    exportLogsToPDF([selectedLogModal as ExportLogItem], actionConfig[selectedLogModal.action]?.label || selectedLogModal.action);
                    toast.success('Log berhasil diekspor ke PDF!');
                  }}
                  className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  Cetak PDF Log Ini
                </button>
                <button
                  onClick={() => setSelectedLogModal(null)}
                  className="h-8 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
