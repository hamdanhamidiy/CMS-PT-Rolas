'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MonitorPlay,
  Plus,
  Search,
  Loader2,
  MapPin,
  MoreVertical,
  Edit,
  RotateCcw,
  Trash2,
  Grid3X3,
  List,
  Tv,
  ExternalLink,
  Sparkles,
  Activity,
  Filter,
  X,
  Play,
  Building2,
  Clock,
  Radio,
} from 'lucide-react';
import type { Screen } from '@/lib/types';
import { generateScreenCode, getRelativeTime, formatDateTime, logActivity } from '@/lib/utils';
import { toast } from 'sonner';

export default function ScreensPage() {
  const [loading, setLoading] = useState(true);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [newSite, setNewSite] = useState('');
  const [newArea, setNewArea] = useState('');

  // Action states
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    loadScreens();
  }, []);

  const loadScreens = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('screens').select('*').order('created_at', { ascending: false });
    setScreens(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newSite.trim()) return;
    setCreating(true);

    const supabase = createClient();
    const screenCode = generateScreenCode();

    const { data, error } = await supabase
      .from('screens')
      .insert({
        screen_code: screenCode,
        name: newName.trim(),
        site: newSite.trim(),
        area: newArea.trim(),
        status: 'online',
      })
      .select()
      .single();

    if (error) {
      toast.error('Gagal menambahkan layar', { description: error.message });
      setCreating(false);
      return;
    }

    await logActivity(
      supabase,
      'create_screen',
      'screen',
      data.id,
      `Menambah layar: ${newName.trim()} (${screenCode})`
    );

    toast.success('Layar TV berhasil ditambahkan!');
    setShowCreate(false);
    setNewName('');
    setNewSite('');
    setNewArea('');
    setCreating(false);
    loadScreens();
  };

  const handleUpdate = async () => {
    if (!selectedScreen || !newName.trim() || !newSite.trim()) return;
    
    const supabase = createClient();
    const { error } = await supabase
      .from('screens')
      .update({
        name: newName.trim(),
        site: newSite.trim(),
        area: newArea.trim(),
      })
      .eq('id', selectedScreen.id);

    if (error) {
      toast.error('Gagal memperbarui informasi layar');
      return;
    }

    toast.success('Informasi layar berhasil diperbarui');
    setShowEdit(false);
    setSelectedScreen(null);
    loadScreens();
  };

  const handleDelete = async () => {
    if (!selectedScreen) return;
    
    const supabase = createClient();
    const { error } = await supabase.from('screens').delete().eq('id', selectedScreen.id);

    if (error) {
      toast.error('Gagal menghapus layar');
      return;
    }

    await logActivity(
      supabase,
      'delete_screen',
      'screen',
      selectedScreen.id,
      `Hapus layar: ${selectedScreen.name} (${selectedScreen.screen_code})`
    );

    toast.success('Layar berhasil dihapus');
    setShowDelete(false);
    setSelectedScreen(null);
    loadScreens();
  };

  const handleReset = async () => {
    if (!selectedScreen) return;
    
    const supabase = createClient();
    const { error } = await supabase
      .from('screens')
      .update({
        status: 'inactive',
      })
      .eq('id', selectedScreen.id);

    if (error) {
      toast.error('Gagal mereset status layar');
      return;
    }

    await logActivity(
      supabase,
      'update_screen',
      'screen',
      selectedScreen.id,
      `Reset status layar: ${selectedScreen.name}`
    );

    toast.success('Status layar berhasil direset');
    setShowReset(false);
    setSelectedScreen(null);
    loadScreens();
  };

  const openWebPlayer = (screenIdOrCode?: string) => {
    if (screenIdOrCode) {
      window.open(`/player?id=${screenIdOrCode}`, '_blank');
    } else {
      window.open('/player', '_blank');
    }
  };

  // Unique sites for filter
  const uniqueSites = Array.from(new Set(screens.map((s) => s.site).filter(Boolean)));

  const filtered = screens.filter((s) => {
    // Site filter
    if (selectedSiteFilter !== 'all' && s.site !== selectedSiteFilter) {
      return false;
    }

    // Search filter
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.screen_code.toLowerCase().includes(term) ||
      s.site.toLowerCase().includes(term) ||
      (s.area && s.area.toLowerCase().includes(term))
    );
  });

  const onlineCount = screens.filter((s) => s.status === 'online').length;
  const offlineCount = screens.filter((s) => s.status !== 'online').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">Memuat Perangkat Layar TV...</p>
      </div>
    );
  }

  return (
    <div className="pb-12 space-y-5">
      {/* ── Page Header Banner ── */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Tv className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Perangkat Layar TV
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                {screens.length} Layar
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Manajemen unit TV Digital Signage, alokasi lokasi cabang, dan koneksi Web Player real-time.
            </p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => openWebPlayer()}
            className="h-9.5 px-4 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/90 rounded-xl transition-all active:scale-98 flex items-center gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Web Player</span>
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="h-9.5 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all active:scale-98 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Layar Baru</span>
          </button>
        </div>
      </header>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Layar</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{screens.length}</p>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">Perangkat terdaftar</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Tv className="w-4 h-4 text-slate-700" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Siap Digunakan</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{onlineCount}</p>
            <p className="text-[11px] text-emerald-600 font-normal mt-0.5">Layar online & aktif</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Lokasi / Site</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{uniqueSites.length}</p>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">Cabang / Unit lokasi</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Player Mode</p>
            <p className="text-xs font-bold text-slate-800 mt-1">Menu Layar</p>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">Tanpa Kode Aktivasi</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search, Site Filter & View Mode Switcher ── */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
          {/* Site Filter Dropdown */}
          <div className="relative min-w-[170px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
              className="w-full h-9 pl-8 pr-8 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-400 focus:outline-none transition-all cursor-pointer appearance-none"
            >
              <option value="all">Semua Lokasi Site ({screens.length})</option>
              {uniqueSites.map((site) => {
                const count = screens.filter((s) => s.site === site).length;
                return (
                  <option key={site} value={site}>
                    {site} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari nama layar, kode TV, atau lokasi site..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 text-xs bg-slate-50 border-slate-200 rounded-lg focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
            />
          </div>

          {/* Reset Filters */}
          {(selectedSiteFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setSelectedSiteFilter('all');
                setSearch('');
              }}
              title="Reset Filter"
              className="h-9 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Tabel
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Kartu
          </button>
        </div>
      </div>

      {/* ── Screen Content List/Grid ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-12 text-center">
          <Tv className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-900">
            {search || selectedSiteFilter !== 'all'
              ? 'Tidak ada layar yang cocok dengan filter'
              : 'Belum Ada Layar Terdaftar'}
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Klik tombol &quot;Tambah Layar Baru&quot; di atas untuk mendaftarkan TV ke sistem.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  <th className="text-left font-bold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">
                    Identitas TV
                  </th>
                  <th className="text-left font-bold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">
                    Lokasi Site & Area
                  </th>
                  <th className="text-left font-bold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">
                    Status Perangkat
                  </th>
                  <th className="text-left font-bold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">
                    Terakhir Aktif
                  </th>
                  <th className="text-right font-bold text-slate-500 px-5 py-3 tracking-wider uppercase text-[10px]">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((screen) => (
                  <tr key={screen.id} className="group hover:bg-slate-50/80 transition-colors">
                    {/* Screen Name & Code */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 relative shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <Tv className="w-4 h-4" />
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition-colors leading-snug">
                            {screen.name}
                          </p>
                          <span className="font-mono text-[10px] text-slate-400">
                            {screen.screen_code}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Site & Area */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {screen.site}
                        </span>
                        {screen.area && (
                          <span className="text-[11px] text-slate-400 font-normal pl-4">
                            {screen.area}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Siap Digunakan
                      </span>
                    </td>

                    {/* Last Active */}
                    <td className="px-5 py-3.5 text-slate-500 font-normal">
                      <span title={screen.last_seen ? formatDateTime(screen.last_seen) : ''}>
                        {screen.last_seen ? getRelativeTime(screen.last_seen) : 'Baru Saja'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openWebPlayer(screen.id)}
                          className="h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200/80 transition-all flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Player</span>
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-600 transition-all cursor-pointer">
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="w-48 rounded-xl bg-white border border-slate-200/90 shadow-xl p-1.5 space-y-1">
                            <DropdownMenuItem
                              className="text-xs font-medium px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-slate-100 text-slate-800 transition-colors"
                              onClick={() => {
                                setSelectedScreen(screen);
                                setNewName(screen.name);
                                setNewSite(screen.site);
                                setNewArea(screen.area || '');
                                setShowEdit(true);
                              }}
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit Informasi</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs font-medium px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-amber-50 text-amber-900 transition-colors"
                              onClick={() => {
                                setSelectedScreen(screen);
                                setShowReset(true);
                              }}
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                              <span>Reset Status Layar</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-slate-100" />
                            <DropdownMenuItem
                              className="text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors"
                              onClick={() => {
                                setSelectedScreen(screen);
                                setShowDelete(true);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>Hapus Layar</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW (KARTU PERANGKAT) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((screen) => (
            <div
              key={screen.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Siap Digunakan
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-600 transition-all cursor-pointer">
                      <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="w-48 rounded-xl bg-white border border-slate-200/90 shadow-xl p-1.5 space-y-1">
                      <DropdownMenuItem
                        className="text-xs font-medium px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-slate-100 text-slate-800 transition-colors"
                        onClick={() => {
                          setSelectedScreen(screen);
                          setNewName(screen.name);
                          setNewSite(screen.site);
                          setNewArea(screen.area || '');
                          setShowEdit(true);
                        }}
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit Informasi</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs font-medium px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-amber-50 text-amber-900 transition-colors"
                        onClick={() => {
                          setSelectedScreen(screen);
                          setShowReset(true);
                        }}
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                        <span>Reset Status Layar</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 bg-slate-100" />
                      <DropdownMenuItem
                        className="text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors"
                        onClick={() => {
                          setSelectedScreen(screen);
                          setShowDelete(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Hapus Layar</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                  {screen.name}
                </h3>
                
                <div className="flex items-center gap-1.5 mt-1.5 text-slate-500 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium">
                    {screen.site}{screen.area ? ` — ${screen.area}` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3.5">
                  <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {screen.screen_code}
                  </span>
                  {screen.last_seen && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      • {getRelativeTime(screen.last_seen)}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => openWebPlayer(screen.id)}
                  className="w-full h-9 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Web Player</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE SCREEN DIALOG ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl border-slate-200 p-6 max-w-lg shadow-xl">
          <div className="flex items-start gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">Tambah Layar TV Baru</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-normal mt-0.5">
                Daftarkan perangkat TV baru. Perangkat TV dapat langsung memilih layar ini di Web Player tanpa kode aktivasi.
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="screen-name" className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Nama Perangkat Layar <span className="text-red-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">Wajib diisi</span>
              </Label>
              <div className="relative">
                <Tv className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="screen-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: TV Lobby Utama / TV Poliklinik Lantai 1"
                  className="pl-10 h-10 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                Beri nama unik yang mudah diidentifikasi oleh pengelola.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="screen-site" className="text-xs font-bold text-slate-800">
                  Lokasi / Site <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="screen-site"
                    value={newSite}
                    onChange={(e) => setNewSite(e.target.value)}
                    placeholder="Contoh: RSU Kaliwates"
                    className="pl-10 h-10 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="screen-area" className="text-xs font-bold text-slate-800">
                  Area <span className="text-slate-400 font-normal">(Opsional)</span>
                </Label>
                <Input
                  id="screen-area"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="Contoh: Ruang Tunggu A"
                  className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-100 flex items-start gap-2.5 text-emerald-900">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed font-medium">
                Setelah disimpan, layar langsung aktif & muncul di menu pilihan Web Player (<code className="text-emerald-700 font-bold">/player</code>).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || !newSite.trim() || creating}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Tambah Layar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="rounded-2xl border-slate-200 p-6 max-w-md">
          <div className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900">Edit Informasi Layar</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-normal mt-0.5">
              Perbarui nama, lokasi, atau area penempatan layar TV ini.
            </DialogDescription>
          </div>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Nama Layar <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Contoh: TV Lobby Utama"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Lokasi Site <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Contoh: RSU Kaliwates"
                  value={newSite}
                  onChange={(e) => setNewSite(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Area</Label>
                <Input
                  placeholder="Contoh: Lantai 1"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
            <button onClick={() => setShowEdit(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">
              Batal
            </button>
            <button
              onClick={handleUpdate}
              disabled={!newName.trim() || !newSite.trim()}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              Simpan Perubahan
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RESET ALERT DIALOG ── */}
      <AlertDialog open={showReset} onOpenChange={setShowReset}>
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 font-bold">Reset Status Layar?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-xs">
              Tindakan ini akan mengosongkan sesi aktif layar <strong>{selectedScreen?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs font-semibold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold">
              Ya, Reset Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── DELETE ALERT DIALOG ── */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 font-bold">Hapus Layar Permanen?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-xs">
              Apakah Anda yakin ingin menghapus layar <strong>{selectedScreen?.name}</strong>? Data yang dihapus tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs font-semibold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold">
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
