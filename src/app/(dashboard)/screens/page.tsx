'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
  Copy,
  MapPin,
  MoreVertical,
  Edit,
  RotateCcw,
  Trash2,
  Grid3X3,
  List,
  KeyRound,
  Tv,
  Radio,
} from 'lucide-react';
import type { Screen } from '@/lib/types';
import { generateActivationCode, generateScreenCode, getRelativeTime, logActivity } from '@/lib/utils';
import { toast } from 'sonner';

export default function ScreensPage() {
  const [loading, setLoading] = useState(true);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showCreate, setShowCreate] = useState(false);
  const [showActivation, setShowActivation] = useState<{ screenId: string; code: string } | null>(null);
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
        status: 'inactive',
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

    toast.success('Layar berhasil ditambahkan');
    setShowCreate(false);
    setNewName('');
    setNewSite('');
    setNewArea('');
    setCreating(false);
    loadScreens();
  };

  const generateCode = async (screen: Screen) => {
    const supabase = createClient();
    const code = generateActivationCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error } = await supabase.from('screen_activations').insert({
      screen_id: screen.id,
      activation_code: code,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast.error('Gagal membuat kode aktivasi');
      return;
    }

    await logActivity(
      supabase,
      'generate_activation_code',
      'screen',
      screen.id,
      `Kode aktivasi untuk ${screen.name}: ${code}`
    );

    setShowActivation({ screenId: screen.id, code });
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
      toast.error('Gagal memperbarui layar');
      return;
    }

    toast.success('Layar berhasil diperbarui');
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
        device_token: null,
        status: 'inactive',
      })
      .eq('id', selectedScreen.id);

    if (error) {
      toast.error('Gagal mereset koneksi layar');
      return;
    }

    await logActivity(
      supabase,
      'update_screen',
      'screen',
      selectedScreen.id,
      `Reset koneksi layar: ${selectedScreen.name}`
    );

    toast.success('Koneksi layar berhasil direset');
    setShowReset(false);
    setSelectedScreen(null);
    loadScreens();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Kode disalin ke clipboard');
  };

  const filtered = screens.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.screen_code.toLowerCase().includes(search.toLowerCase()) ||
      s.site.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = screens.filter((s) => s.status === 'online').length;
  const offlineCount = screens.filter((s) => s.status !== 'online').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="pb-10 space-y-6">
      
      {/* ── Integrated Corporate Header Bar ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Manajemen Layar TV
            </h1>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {screens.length} Total
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {onlineCount} Online
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                {offlineCount} Offline
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Manajemen perangkat TV Digital Signage, alokasi lokasi cabang, dan alokasi kode aktivasi.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-2xs transition-all active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Layar Baru
        </button>
      </header>

      {/* ── Unified Toolbar (Search & View Mode Toggle) ── */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama layar, kode TV, atau lokasi site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 text-xs bg-slate-50/60 border-slate-200/60 rounded-lg focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Tabel Data
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Kartu Perangkat
          </button>
        </div>
      </div>

      {/* ── Master Screen Display ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-12 text-center">
          <MonitorPlay className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-900">
            {search ? 'Tidak ada layar yang cocok dengan pencarian' : 'Belum Ada Layar Terdaftar'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[11px]">Identitas TV</th>
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[11px]">Lokasi Site & Area</th>
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[11px]">Status Koneksi</th>
                  <th className="text-left font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[11px]">Terakhir Aktif</th>
                  <th className="text-right font-semibold text-slate-500 px-6 py-3 tracking-wider uppercase text-[11px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((screen) => (
                  <tr key={screen.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`} />
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{screen.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{screen.screen_code}</p>
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
                      {screen.last_seen ? getRelativeTime(screen.last_seen) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => generateCode(screen)}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                          <span>Kode Aktivasi</span>
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-600 shadow-2xs transition-all active:scale-95">
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="w-52 rounded-xl bg-white border border-slate-200/90 shadow-xl p-1.5 space-y-1 z-[100]">
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
                              <span>Reset Koneksi Layar</span>
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
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((screen) => (
            <div
              key={screen.id}
              className="group bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      screen.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                    }`} />
                    <span className={`text-[11px] font-bold capitalize ${
                      screen.status === 'online' ? 'text-emerald-700' : 'text-slate-500'
                    }`}>
                      {screen.status === 'online' ? 'Online' : screen.status === 'inactive' ? 'Tidak Aktif' : 'Offline'}
                    </span>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-600 shadow-2xs transition-all active:scale-95">
                      <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="w-52 rounded-xl bg-white border border-slate-200/90 shadow-xl p-1.5 space-y-1 z-[100]">
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
                        <span>Reset Koneksi Layar</span>
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
                <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs font-medium">
                    {screen.site}{screen.area ? ` — ${screen.area}` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 text-xs">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-600 border border-slate-200/80">
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
                  onClick={() => generateCode(screen)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Generate Kode Aktivasi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE SCREEN DIALOG ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl border-slate-200 p-6 max-w-lg shadow-xl">
          {/* Header with Icon */}
          <div className="flex items-start gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">Tambah Layar TV Baru</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-normal mt-0.5">
                Daftarkan perangkat TV ke sistem. Setelah dibuat, terbitkan kode aktivasi untuk menghubungkan TV.
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4 py-3">
            {/* Field 1: Nama Layar */}
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
                  className="pl-10 h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                Beri nama unik yang mudah diidentifikasi oleh pengelola cabang.
              </p>
            </div>

            {/* Field 2 & 3: Lokasi & Area */}
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
                    className="pl-10 h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
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
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
            </div>

            {/* Info callout */}
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-900 leading-relaxed font-medium">
                Setelah pendaftaran disimpan, Anda dapat mengklik tombol &quot;Kode Aktivasi&quot; untuk mendapatkan 6 angka koneksi TV.
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

      {/* ── ACTIVATION CODE DIALOG ── */}
      <Dialog open={!!showActivation} onOpenChange={() => setShowActivation(null)}>
        <DialogContent className="max-w-sm rounded-2xl border-slate-200 p-6 text-center shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Kode Aktivasi TV</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-normal">
              Masukkan 6 angka ini pada aplikasi TV Signage Player untuk mendaftarkan perangkat.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="text-3xl font-bold tracking-[0.3em] font-mono text-slate-900 bg-slate-100 rounded-xl py-4 px-4 border border-slate-200">
              {showActivation?.code}
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-2">
              Kode aktivasi berlaku selama 24 jam.
            </p>
          </div>

          <DialogFooter className="flex-row gap-2 justify-center sm:justify-center">
            <button
              onClick={() => showActivation && copyCode(showActivation.code)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Salin Kode
            </button>
            <button
              onClick={() => setShowActivation(null)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all"
            >
              Tutup
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="rounded-2xl border-slate-200 p-6 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Edit Informasi Layar</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-normal">
              Perbarui nama, lokasi, atau area penempatan layar TV ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Nama Layar <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Contoh: TV Lobby Utama"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Lokasi Site <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Contoh: RSU Kaliwates"
                  value={newSite}
                  onChange={(e) => setNewSite(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Area</Label>
                <Input
                  placeholder="Contoh: Lantai 1"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
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
            <AlertDialogTitle className="text-slate-900 font-bold">Reset Koneksi Layar?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-xs">
              Tindakan ini akan memutus koneksi TV secara paksa. Layar akan menjadi &apos;Inactive&apos; dan Anda harus melakukan generate kode aktivasi ulang di TV tersebut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs font-semibold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold">
              Ya, Reset Koneksi
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
