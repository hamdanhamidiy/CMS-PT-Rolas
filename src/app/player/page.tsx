'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Media, PlaylistItem, Screen } from '@/lib/types';
import Logo from '@/components/shared/Logo';
import {
  Tv,
  Loader2,
  Sparkles,
  Maximize,
  Minimize,
  Expand,
  Volume2,
  VolumeX,
  Search,
  MapPin,
  CheckCircle2,
  Play,
  RotateCcw,
} from 'lucide-react';

// ============================================
// Constants
// ============================================
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const SCHEDULE_CHECK_INTERVAL = 10000; // Check schedule transition every 10 seconds
const CLOCK_SYNC_INTERVAL = 3000; // Re-align player clock with global epoch every 3 seconds
const SCREEN_ID_KEY = 'signage_screen_id';

export default function PlayerPage() {
  const [phase, setPhase] = useState<'selection' | 'loading' | 'playing'>('selection');
  const [screensList, setScreensList] = useState<Screen[]>([]);
  const [loadingScreens, setLoadingScreens] = useState(true);
  const [searchScreen, setSearchScreen] = useState('');

  const [screenId, setScreenId] = useState<string | null>(null);
  const [screenName, setScreenName] = useState('');

  // Player state
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<(PlaylistItem & { media: Media })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMedia, setCurrentMedia] = useState<Media | null>(null);

  // Display Customization State
  const [fitMode, setFitMode] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userExplicitlyMutedRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const activeScheduleIdRef = useRef<string | null>(null);
  const playlistRef = useRef<(PlaylistItem & { media: Media })[]>([]);

  // Keep refs in sync
  useEffect(() => {
    activeScheduleIdRef.current = activeScheduleId;
  }, [activeScheduleId]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  // Auto-hide floating controls after inactivity
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);

    if (videoRef.current && videoRef.current.muted && !userExplicitlyMutedRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Listen for native fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {
      // Ignore API denial
    }
  };

  const cycleFitMode = () => {
    setFitMode((prev) => {
      if (prev === 'contain') return 'cover';
      if (prev === 'cover') return 'fill';
      return 'contain';
    });
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      userExplicitlyMutedRef.current = nextMuted;
    } else {
      setIsMuted((prev) => {
        userExplicitlyMutedRef.current = !prev;
        return !prev;
      });
    }
  };

  // Switch Screen action (Return to Screen Selection menu)
  const handleSwitchScreen = () => {
    localStorage.removeItem(SCREEN_ID_KEY);
    setScreenId(null);
    setPlaylist([]);
    setCurrentMedia(null);
    setActiveScheduleId(null);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    setPhase('selection');
    fetchAvailableScreens();
  };

  // ============================================
  // Initial Mount & Load Available Screens
  // ============================================
  useEffect(() => {
    const savedScreenId = localStorage.getItem(SCREEN_ID_KEY);
    if (savedScreenId) {
      verifyAndPlayScreen(savedScreenId);
    } else {
      fetchAvailableScreens();
    }
  }, []);

  const fetchAvailableScreens = async () => {
    setLoadingScreens(true);
    const supabase = createClient();
    const { data } = await supabase.from('screens').select('*').order('name', { ascending: true });
    setScreensList(data || []);
    setLoadingScreens(false);
  };

  const verifyAndPlayScreen = async (sid: string) => {
    setPhase('loading');
    const supabase = createClient();
    const { data } = await supabase.from('screens').select('*').eq('id', sid).single();

    if (data) {
      setScreenId(data.id);
      setScreenName(data.name);
      await supabase
        .from('screens')
        .update({ status: 'online', last_seen: new Date().toISOString() })
        .eq('id', data.id);
      loadScheduleAndPlay(data.id, true);
    } else {
      localStorage.removeItem(SCREEN_ID_KEY);
      setScreenId(null);
      setPhase('selection');
      fetchAvailableScreens();
    }
  };

  // Selection Handler
  const handleSelectScreen = async (screen: Screen) => {
    localStorage.setItem(SCREEN_ID_KEY, screen.id);
    setScreenId(screen.id);
    setScreenName(screen.name);

    const supabase = createClient();
    await supabase
      .from('screens')
      .update({ status: 'online', last_seen: new Date().toISOString() })
      .eq('id', screen.id);

    loadScheduleAndPlay(screen.id, true);
  };

  // ============================================
  // GLOBAL WALL CLOCK SYNCHRONIZATION ENGINE
  // ============================================
  const syncGlobalClock = useCallback(() => {
    const currentList = playlistRef.current;
    if (currentList.length === 0) return;

    let totalLoopSec = 0;
    const itemDurations = currentList.map((item) => {
      const dur = item.media?.duration || 10;
      const limit = item.play_limit || 1;
      const totalItemSec = dur * limit;
      totalLoopSec += totalItemSec;
      return { dur, limit, totalItemSec };
    });

    if (totalLoopSec === 0) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const globalPos = nowSec % totalLoopSec;

    let accum = 0;
    let targetIndex = 0;
    let offsetInItem = 0;

    for (let i = 0; i < currentList.length; i++) {
      const itemSec = itemDurations[i].totalItemSec;
      if (accum + itemSec > globalPos) {
        targetIndex = i;
        offsetInItem = globalPos - accum;
        break;
      }
      accum += itemSec;
    }

    const targetMedia = currentList[targetIndex]?.media;
    if (!targetMedia) return;

    const mediaDur = targetMedia.duration || 10;
    const offsetInMedia = offsetInItem % mediaDur;

    setCurrentIndex(targetIndex);
    setCurrentMedia(targetMedia);

    if (targetMedia.media_type === 'video' && videoRef.current) {
      const vid = videoRef.current;
      if (Math.abs(vid.currentTime - offsetInMedia) > 0.5) {
        vid.currentTime = offsetInMedia;
      }
    }
  }, []);

  // ============================================
  // Load Schedule & Play
  // ============================================
  const loadScheduleAndPlay = async (sid: string, showLoading = false) => {
    if (showLoading) setPhase('loading');
    const supabase = createClient();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    const { data: scheduleScreens } = await supabase
      .from('schedule_screens')
      .select('schedule_id')
      .eq('screen_id', sid);

    if (!scheduleScreens || scheduleScreens.length === 0) {
      if (activeScheduleIdRef.current !== null || playlist.length > 0) {
        setPlaylist([]);
        setCurrentMedia(null);
        setActiveScheduleId(null);
      }
      setPhase('playing');
      startHeartbeat(sid, null);
      setupRealtimeListener(sid);
      return;
    }

    const scheduleIds = scheduleScreens.map((ss) => ss.schedule_id);

    const { data: schedules } = await supabase
      .from('schedules')
      .select('*')
      .in('id', scheduleIds)
      .eq('status', 'active')
      .lte('start_date', today)
      .gte('end_date', today);

    if (!schedules || schedules.length === 0) {
      if (activeScheduleIdRef.current !== null || playlist.length > 0) {
        setPlaylist([]);
        setCurrentMedia(null);
        setActiveScheduleId(null);
      }
      setPhase('playing');
      startHeartbeat(sid, null);
      setupRealtimeListener(sid);
      return;
    }

    // Helper to convert HH:MM to seconds from midnight
    const timeToSec = (tStr: string) => {
      const [h, m] = (tStr || '08:00').split(':').map(Number);
      return h * 3600 + m * 60;
    };

    const [nowH, nowM] = currentTime.split(':').map(Number);
    const nowSec = nowH * 3600 + nowM * 60;

    // Filter schedules that match current time slot
    const matchingSchedules: any[] = [];

    for (const sched of schedules) {
      const times: string[] = sched.start_times && Array.isArray(sched.start_times) && sched.start_times.length > 0
        ? sched.start_times
        : [sched.start_time || '08:00'];
      
      const loopCnt = sched.loop_count ?? 3;

      // Get playlist duration for this schedule
      const { data: items } = await supabase
        .from('playlist_items')
        .select('*, media(*)')
        .eq('playlist_id', sched.playlist_id);

      let playlistDurSec = 0;
      (items || []).forEach((it: any) => {
        playlistDurSec += (it.media?.duration || 10) * (it.play_limit || 1);
      });

      const sessionDurSec = loopCnt === 0 ? 86400 : (playlistDurSec || 60) * loopCnt;

      // Check if nowSec falls within any start time slot
      const isSlotActive = times.some((tStr) => {
        const slotStartSec = timeToSec(tStr);
        const slotEndSec = slotStartSec + sessionDurSec;
        return nowSec >= slotStartSec && (loopCnt === 0 || nowSec < slotEndSec);
      });

      if (isSlotActive) {
        matchingSchedules.push({ ...sched, items });
      }
    }

    if (matchingSchedules.length === 0) {
      if (activeScheduleIdRef.current !== null || playlist.length > 0) {
        setPlaylist([]);
        setCurrentMedia(null);
        setActiveScheduleId(null);
      }
      setPhase('playing');
      startHeartbeat(sid, null);
      setupRealtimeListener(sid);
      return;
    }

    matchingSchedules.sort((a, b) => {
      if (a.mode === 'promosi' && b.mode !== 'promosi') return -1;
      if (a.mode !== 'promosi' && b.mode === 'promosi') return 1;
      return (b.priority || 0) - (a.priority || 0);
    });

    const activeSchedule = matchingSchedules[0];

    if (activeSchedule.id === activeScheduleIdRef.current && playlist.length > 0) {
      setPhase('playing');
      return;
    }

    const items = activeSchedule.items || [];

    if (items && items.length > 0) {
      setActiveScheduleId(activeSchedule.id);
      const loadedList = items as any;
      setPlaylist(loadedList);
      playlistRef.current = loadedList;

      syncGlobalClock();
    } else {
      setActiveScheduleId(activeSchedule.id);
      setPlaylist([]);
      setCurrentMedia(null);
    }

    setPhase('playing');
    startHeartbeat(sid, items?.[0]?.media?.id || null);
    setupRealtimeListener(sid);
  };

  // ============================================
  // Periodic Clock Sync & Schedule Ticker
  // ============================================
  useEffect(() => {
    if (!screenId || phase === 'selection') return;

    const scheduleTimer = setInterval(() => {
      loadScheduleAndPlay(screenId, false);
    }, SCHEDULE_CHECK_INTERVAL);

    const clockTimer = setInterval(() => {
      syncGlobalClock();
    }, CLOCK_SYNC_INTERVAL);

    return () => {
      clearInterval(scheduleTimer);
      clearInterval(clockTimer);
    };
  }, [screenId, phase, syncGlobalClock]);

  // Preloading next media
  useEffect(() => {
    if (playlist.length <= 1) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    const nextMedia = playlist[nextIndex]?.media;

    if (nextMedia) {
      if (nextMedia.media_type === 'image') {
        const img = new Image();
        img.src = nextMedia.file_url;
      } else if (nextMedia.media_type === 'video') {
        const vid = document.createElement('video');
        vid.preload = 'auto';
        vid.src = nextMedia.file_url;
      }
    }
  }, [currentIndex, playlist]);

  // Autoplay handler
  useEffect(() => {
    if (!currentMedia || phase !== 'playing') return;

    if (currentMedia.media_type === 'video' && videoRef.current) {
      const vid = videoRef.current;

      const attemptPlay = async () => {
        try {
          if (!userExplicitlyMutedRef.current) {
            vid.muted = false;
            setIsMuted(false);
            await vid.play();
          } else {
            vid.muted = true;
            setIsMuted(true);
            await vid.play();
          }
        } catch {
          try {
            vid.muted = true;
            setIsMuted(true);
            await vid.play();
          } catch {
            // Autoplay blocked
          }
        }
      };

      attemptPlay();
    }
  }, [currentMedia, phase]);

  // Heartbeat
  const startHeartbeat = (sid: string, mediaId: string | null) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    const sendHeartbeat = async () => {
      const supabase = createClient();
      await supabase.from('screen_heartbeats').insert({
        screen_id: sid,
        current_media_id: mediaId,
        status: 'playing',
      });
      await supabase
        .from('screens')
        .update({ status: 'online', last_seen: new Date().toISOString() })
        .eq('id', sid);
    };

    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  };

  // Realtime Listener
  const setupRealtimeListener = (sid: string) => {
    const supabase = createClient();

    supabase
      .channel('screen-device-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => {
          loadScheduleAndPlay(sid, false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_screens' },
        () => {
          loadScheduleAndPlay(sid, false);
        }
      )
      .subscribe();
  };

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  const fitClass =
    fitMode === 'cover'
      ? 'object-cover'
      : fitMode === 'fill'
      ? 'object-fill'
      : 'object-contain';

  // Filtered screens for selection menu
  const filteredScreens = screensList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchScreen.toLowerCase()) ||
      s.site.toLowerCase().includes(searchScreen.toLowerCase()) ||
      s.screen_code.toLowerCase().includes(searchScreen.toLowerCase())
  );

  // ============================================
  // RENDER: SCREEN SELECTION MENU (No Code Needed!)
  // ============================================
  if (phase === 'selection') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900 font-sans">
        <div className="w-full max-w-3xl space-y-6">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <Logo />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Pilih Perangkat Layar TV
              </h1>
              <p className="text-xs text-slate-500 font-normal">
                Pilih nama layar TV di bawah ini untuk memulai penayangan Digital Signage pada perangkat ini.
              </p>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full max-w-md mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchScreen}
              onChange={(e) => setSearchScreen(e.target.value)}
              placeholder="Cari nama layar, lokasi site, atau kode TV..."
              className="w-full pl-10 pr-4 h-10 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
            />
          </div>

          {/* Screens Grid Menu */}
          {loadingScreens ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <p className="text-xs text-slate-500 font-medium">Memuat Daftar Layar Terdaftar...</p>
            </div>
          ) : filteredScreens.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs space-y-3">
              <Tv className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                {searchScreen
                  ? 'Tidak ada layar yang cocok dengan pencarian'
                  : 'Belum Ada Layar yang Ditambahkan Admin'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Silakan tambahkan perangkat layar baru pada Dashboard Admin (<code className="text-blue-600 font-semibold">/screens</code>) terlebih dahulu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[55vh] overflow-y-auto pr-1">
              {filteredScreens.map((screen) => (
                <div
                  key={screen.id}
                  onClick={() => handleSelectScreen(screen)}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    {/* Status Dot & Screen Code */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {screen.screen_code}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Siap Digunakan
                      </span>
                    </div>

                    {/* Screen Title */}
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {screen.name}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{screen.site}{screen.area ? ` — ${screen.area}` : ''}</span>
                    </div>
                  </div>

                  {/* Select Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectScreen(screen);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 group-hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Pilih & Putar Layar</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Terhubung otomatis dengan jadwal tayang real-time</span>
          </div>

          <p className="text-[11px] text-center text-slate-400 font-normal">
            © {new Date().getFullYear()} PT Rolas Nusantara Medika • Digital Signage System
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Loading State
  // ============================================
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto" />
          <p className="text-white/70 text-xs font-medium tracking-wide">Memuat Rotasi Media Layar {screenName}...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Fullscreen Player
  // ============================================
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      
      {/* ── FLOATING CONTROLS OVERLAY ── */}
      <div
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-white/15 p-2 rounded-2xl text-white shadow-2xl transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        {/* Switch Screen Menu Button */}
        <button
          onClick={handleSwitchScreen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold border border-blue-400/40 transition-all active:scale-95 shadow-2xs"
          title="Kembali ke Menu Pilihan Layar TV"
        >
          <RotateCcw className="w-3.5 h-3.5 text-white" />
          <span className="hidden sm:inline">Ganti Layar</span>
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95"
          title="Mode Presentasi Layar Penuh"
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Keluar Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize className="w-3.5 h-3.5 text-blue-400" />
              <span>Full Screen</span>
            </>
          )}
        </button>

        {/* Aspect Ratio Mode */}
        <button
          onClick={cycleFitMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95"
          title="Ubah Aspek Rasio (Fit / Cover / Fill)"
        >
          <Expand className="w-3.5 h-3.5 text-amber-400" />
          <span className="capitalize">{fitMode === 'contain' ? 'Fit' : fitMode === 'cover' ? 'Cover' : 'Fill'}</span>
        </button>

        {/* Audio Mute/Unmute */}
        <button
          onClick={toggleMute}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            isMuted
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              <span>Suara: Off</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Suara: On</span>
            </>
          )}
        </button>
      </div>

      {/* ── MEDIA PLAYBACK CONTENT ── */}
      {playlist.length === 0 || !currentMedia ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-950 text-white p-6">
          <div className="text-center space-y-3 max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto">
              <Tv className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <p className="text-base font-bold text-white">{screenName || 'Digital Signage Player'}</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Perangkat Online — Menunggu Jadwal Tayang</p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Siap Memutar Konten Real-Time
            </div>
          </div>
        </div>
      ) : currentMedia.media_type === 'video' ? (
        <video
          ref={videoRef}
          src={currentMedia.file_url}
          autoPlay
          loop={playlist.length === 1}
          playsInline
          controls={false}
          preload="auto"
          className={`w-full h-full ${fitClass}`}
        />
      ) : (
        <img
          src={currentMedia.file_url}
          alt={currentMedia.title}
          className={`w-full h-full ${fitClass}`}
        />
      )}
    </div>
  );
}
