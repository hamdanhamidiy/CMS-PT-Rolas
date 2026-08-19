'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Media, PlaylistItem, Screen } from '@/lib/types';
import Logo from '@/components/shared/Logo';
import {
  Tv,
  Loader2,
  Maximize,
  Minimize,
  Expand,
  Volume2,
  VolumeX,
  Search,
  MapPin,
  Play,
  RotateCcw,
  ArrowLeft,
  Clock,
  X,
} from 'lucide-react';

// ============================================
// Constants
// ============================================
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const SCHEDULE_CHECK_INTERVAL = 10000; // Check schedule transition every 10 seconds
const CLOCK_SYNC_INTERVAL = 3000; // Re-align player clock with global epoch every 3 seconds
const SCREEN_ID_KEY = 'signage_screen_id';

function PlayerContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get('id') || searchParams.get('screen_id');
  const queryCode = searchParams.get('code') || searchParams.get('screen_code');

  const [phase, setPhase] = useState<'selection' | 'loading' | 'playing'>('selection');
  const [screensList, setScreensList] = useState<Screen[]>([]);
  const [loadingScreens, setLoadingScreens] = useState(true);
  const [searchScreen, setSearchScreen] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');

  const [screenId, setScreenId] = useState<string | null>(null);
  const [screenName, setScreenName] = useState('');
  const [selectedScreenData, setSelectedScreenData] = useState<Screen | null>(null);

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

  // Live Clock State
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const activeScheduleIdRef = useRef<string | null>(null);
  const playlistRef = useRef<(PlaylistItem & { media: Media })[]>([]);

  // Update real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeDisplay(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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
    }, 3500);

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
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/player');
    }
    setScreenId(null);
    setSelectedScreenData(null);
    setPlaylist([]);
    setCurrentMedia(null);
    setActiveScheduleId(null);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    setPhase('selection');
    fetchAvailableScreens();
  };

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'a' || e.key === 'A') {
        cycleFitMode();
      } else if (e.key === 's' || e.key === 'S') {
        handleSwitchScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isFullscreen, isMuted, fitMode]);

  const fetchAvailableScreens = async () => {
    setLoadingScreens(true);
    const supabase = createClient();
    const { data } = await supabase.from('screens').select('*').order('name', { ascending: true });
    setScreensList(data || []);
    setLoadingScreens(false);
  };

  const verifyAndPlayScreenById = async (sid: string) => {
    setPhase('loading');
    const supabase = createClient();
    const { data } = await supabase.from('screens').select('*').eq('id', sid).single();

    if (data) {
      localStorage.setItem(SCREEN_ID_KEY, data.id);
      setScreenId(data.id);
      setScreenName(data.name);
      setSelectedScreenData(data);
      await supabase
        .from('screens')
        .update({ status: 'online', last_seen: new Date().toISOString() })
        .eq('id', data.id);
      loadScheduleAndPlay(data.id, true);
    } else {
      localStorage.removeItem(SCREEN_ID_KEY);
      setScreenId(null);
      setSelectedScreenData(null);
      setPhase('selection');
      fetchAvailableScreens();
    }
  };

  const verifyAndPlayScreenByCode = async (code: string) => {
    setPhase('loading');
    const supabase = createClient();
    const { data } = await supabase.from('screens').select('*').eq('screen_code', code).single();

    if (data) {
      localStorage.setItem(SCREEN_ID_KEY, data.id);
      setScreenId(data.id);
      setScreenName(data.name);
      setSelectedScreenData(data);
      await supabase
        .from('screens')
        .update({ status: 'online', last_seen: new Date().toISOString() })
        .eq('id', data.id);
      loadScheduleAndPlay(data.id, true);
    } else {
      localStorage.removeItem(SCREEN_ID_KEY);
      setScreenId(null);
      setSelectedScreenData(null);
      setPhase('selection');
      fetchAvailableScreens();
    }
  };

  // ============================================
  // Initial Mount & Load Screen (from Query Params or LocalStorage)
  // ============================================
  useEffect(() => {
    if (queryId) {
      verifyAndPlayScreenById(queryId);
    } else if (queryCode) {
      verifyAndPlayScreenByCode(queryCode);
    } else {
      const savedScreenId = localStorage.getItem(SCREEN_ID_KEY);
      if (savedScreenId) {
        verifyAndPlayScreenById(savedScreenId);
      } else {
        fetchAvailableScreens();
      }
    }
  }, [queryId, queryCode]);

  // Selection Handler
  const handleSelectScreen = async (screen: Screen) => {
    localStorage.setItem(SCREEN_ID_KEY, screen.id);
    setScreenId(screen.id);
    setScreenName(screen.name);
    setSelectedScreenData(screen);

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
      const limit = item.play_limit === 0 ? 1 : (item.play_limit || 1);
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
      if (Math.abs(vid.currentTime - offsetInMedia) > 1.0) {
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
      return;
    }

    const timeToSec = (tStr: string) => {
      const parts = (tStr || '08:00').split(':').map(Number);
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60;
    };

    const [nowH, nowM] = currentTime.split(':').map(Number);
    const nowSec = nowH * 3600 + nowM * 60;

    const matchingSchedules: any[] = [];

    for (const sched of schedules) {
      const times: string[] = sched.start_times && Array.isArray(sched.start_times) && sched.start_times.length > 0
        ? sched.start_times
        : [sched.start_time || '08:00'];

      const { data: items } = await supabase
        .from('playlist_items')
        .select('*, media(*)')
        .eq('playlist_id', sched.playlist_id)
        .order('sort_order', { ascending: true });

      let isPlaylistContinuous = false;
      let playlistTotalSec = 0;

      (items || []).forEach((it: any) => {
        const dur = it.media?.duration || 10;
        if (it.play_limit === 0) {
          isPlaylistContinuous = true;
        }
        const limit = it.play_limit === 0 ? 1 : (it.play_limit || 1);
        playlistTotalSec += dur * limit;
      });

      const isSlotActive = times.some((tStr) => {
        const slotStartSec = timeToSec(tStr);
        const slotEndSec = isPlaylistContinuous
          ? (sched.end_time && sched.end_time !== '23:59' && sched.end_time !== '23:59:00' ? timeToSec(sched.end_time) : slotStartSec + 86400)
          : slotStartSec + (playlistTotalSec || 60);

        if (slotStartSec <= slotEndSec) {
          return nowSec >= slotStartSec && nowSec < slotEndSec;
        } else {
          return nowSec >= slotStartSec || nowSec < slotEndSec;
        }
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
      return;
    }

    matchingSchedules.sort((a, b) => {
      if (a.mode === 'promosi' && b.mode !== 'promosi') return -1;
      if (a.mode !== 'promosi' && b.mode === 'promosi') return 1;
      return (b.priority || 0) - (a.priority || 0);
    });

    const activeSchedule = matchingSchedules[0];
    const items = activeSchedule.items || [];

    if (activeSchedule.id === activeScheduleIdRef.current && playlist.length > 0) {
      setPhase('playing');
      return;
    }

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
  };

  // ============================================
  // Supabase Realtime Listener (Managed ONCE per screen)
  // ============================================
  useEffect(() => {
    if (!screenId || phase === 'selection') return;

    const supabase = createClient();
    const channelName = `screen-device-changes-${screenId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => {
          loadScheduleAndPlay(screenId, false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_screens' },
        () => {
          loadScheduleAndPlay(screenId, false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'playlists' },
        () => {
          loadScheduleAndPlay(screenId, false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'playlist_items' },
        () => {
          loadScheduleAndPlay(screenId, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [screenId, phase]);

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

  // Unique sites for filter
  const uniqueSites = Array.from(new Set(screensList.map((s) => s.site).filter(Boolean)));

  // Filtered screens for selection menu
  const filteredScreens = screensList.filter((s) => {
    if (selectedSiteFilter !== 'all' && s.site !== selectedSiteFilter) {
      return false;
    }
    if (!searchScreen) return true;
    const term = searchScreen.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.site.toLowerCase().includes(term) ||
      s.screen_code.toLowerCase().includes(term) ||
      (s.area && s.area.toLowerCase().includes(term))
    );
  });

  // ============================================
  // RENDER: SCREEN SELECTION MENU (MODERN & PROPORTIONATE)
  // ============================================
  if (phase === 'selection') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 font-sans">
        
        {/* ── TOP HEADER NAVBAR ── */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <Logo />
            </div>
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <p className="text-xs font-bold text-slate-800 leading-tight">Digital Signage Web Player</p>
              <p className="text-[10px] text-slate-500 font-medium">PT Rolas Nusantara Medika</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-mono font-semibold">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{currentTimeDisplay || '00:00:00'} WIB</span>
            </div>

            <Link
              href="/screens"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-2xs active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-300" />
              <span>Kembali ke CMS</span>
            </Link>
          </div>
        </header>

        {/* ── CENTERED SELECTION CONTAINER (MAX-W-4XL) ── */}
        <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6 my-auto">
          
          {/* Header Title */}
          <div className="text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Pilih Perangkat Layar TV
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-normal">
              Pilih nama unit TV di bawah ini untuk memulai penayangan Digital Signage real-time.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto space-y-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchScreen}
                onChange={(e) => setSearchScreen(e.target.value)}
                placeholder="Cari nama layar, kode TV, atau lokasi..."
                className="w-full pl-10 pr-9 h-10 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all font-medium text-slate-800 placeholder:text-slate-400"
              />
              {searchScreen && (
                <button
                  onClick={() => setSearchScreen('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Site Filter Chips */}
            {uniqueSites.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                <button
                  onClick={() => setSelectedSiteFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedSiteFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Semua Lokasi ({screensList.length})
                </button>
                {uniqueSites.map((site) => (
                  <button
                    key={site}
                    onClick={() => setSelectedSiteFilter(site)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedSiteFilter === site
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {site}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── SCREENS 3-COLUMN GRID ── */}
          {loadingScreens ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2.5">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs text-slate-500 font-medium">Memuat data layar...</p>
            </div>
          ) : filteredScreens.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-2xs space-y-2 max-w-sm mx-auto">
              <Tv className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-800">
                {searchScreen ? 'Tidak ada layar yang sesuai pencarian' : 'Belum Ada Layar'}
              </p>
              <p className="text-[11px] text-slate-500">
                {searchScreen
                  ? 'Silakan gunakan kata kunci lain.'
                  : 'Daftarkan layar di Dashboard Admin (/screens) terlebih dahulu.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-4xl mx-auto">
              {filteredScreens.map((screen) => (
                <div
                  key={screen.id}
                  onClick={() => handleSelectScreen(screen)}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-blue-500/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-3.5 group"
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {screen.screen_code}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Siap Digunakan
                      </span>
                    </div>

                    {/* TV Title & Location */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {screen.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {screen.site}{screen.area ? ` — ${screen.area}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Play Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectScreen(screen);
                    }}
                    className="w-full h-9 rounded-xl bg-slate-900 group-hover:bg-blue-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Pilih & Putar Layar</span>
                  </button>
                </div>
              ))}
            </div>
          )}

        </main>

        {/* ── FOOTER ── */}
        <footer className="py-3.5 px-4 text-center border-t border-slate-200/80 bg-white/70">
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} PT Rolas Nusantara Medika • Digital Signage System
          </p>
        </footer>

      </div>
    );
  }

  // ============================================
  // RENDER: LOADING STATE
  // ============================================
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 font-sans">
        <div className="text-center space-y-3.5 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto shadow-xl">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-white tracking-wide">
              Menghubungkan ke Layar {screenName ? `"${screenName}"` : 'TV'}...
            </h2>
            <p className="text-xs text-slate-400">
              Memverifikasi koneksi dan memuat jadwal siaran real-time...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: FULLSCREEN PLAYER (MODERN & REFINED STANDBY + PLAYBACK)
  // ============================================
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      
      {/* ── FLOATING OVERLAY CONTROLS (AUTO-HIDE AFTER 3.5s) ── */}
      <div
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-950/80 backdrop-blur-xl border border-white/15 p-1.5 rounded-2xl text-white shadow-2xl transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-slate-200">
          <Tv className="w-3.5 h-3.5 text-blue-400" />
          <span className="max-w-[130px] truncate">{screenName || 'TV Player'}</span>
        </div>

        <button
          onClick={handleSwitchScreen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold border border-blue-400/40 transition-all active:scale-95 shadow-2xs cursor-pointer"
          title="Kembali ke Menu Pilihan Layar (Shortcut: S)"
        >
          <RotateCcw className="w-3.5 h-3.5 text-white" />
          <span className="hidden sm:inline">Ganti Layar</span>
        </button>

        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
          title="Layar Penuh (Shortcut: F)"
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">Keluar</span>
            </>
          ) : (
            <>
              <Maximize className="w-3.5 h-3.5 text-blue-400" />
              <span>Full Screen</span>
            </>
          )}
        </button>

        <button
          onClick={cycleFitMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
          title="Aspek Rasio (Shortcut: A)"
        >
          <Expand className="w-3.5 h-3.5 text-amber-400" />
          <span className="capitalize">{fitMode}</span>
        </button>

        <button
          onClick={toggleMute}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
            isMuted
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title="Suara (Shortcut: M)"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              <span>Mute</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Suara</span>
            </>
          )}
        </button>
      </div>

      {/* ── MODERN & REFINED STANDBY SCREEN ── */}
      {playlist.length === 0 || !currentMedia ? (
        <div className="w-full h-full flex flex-col justify-between p-8 sm:p-10 bg-slate-950 text-white relative overflow-hidden">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                <Logo />
              </div>
              <div className="border-l border-white/10 pl-3">
                <p className="text-xs font-bold tracking-tight text-white">Digital Signage System</p>
                <p className="text-[10px] text-slate-400">PT Rolas Nusantara Medika</p>
              </div>
            </div>
          </div>

          {/* Center Card Display (The Screen Identity) */}
          <div className="my-auto max-w-md w-full mx-auto bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-9 text-center shadow-2xl space-y-5 z-10">
            
            {/* Device Icon */}
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto shadow-inner">
              <Tv className="w-7 h-7" />
            </div>

            {/* Status Badge */}
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Perangkat Online & Siap Tayang
              </span>
            </div>

            {/* Screen Identity */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {screenName || 'Digital Signage Player'}
              </h1>
              
              {selectedScreenData && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{selectedScreenData.site}{selectedScreenData.area ? ` — ${selectedScreenData.area}` : ''}</span>
                  <span className="font-mono text-[10px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 ml-1">
                    {selectedScreenData.screen_code}
                  </span>
                </div>
              )}
            </div>

            {/* Waiting Schedule Info Divider */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Menunggu jadwal tayang aktif berikutnya</span>
            </div>

          </div>

          {/* Bottom Status Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 z-10 border-t border-white/5 pt-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px]">Sinkronisasi Otomatis Real-Time</span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Arahkan kursor atau tekan shortcut <kbd className="px-1 py-0.5 rounded bg-white/10 text-white font-mono text-[9px]">S</kbd> untuk kontrol
            </p>
          </div>

        </div>
      ) : currentMedia.media_type === 'video' ? (
        <video
          ref={videoRef}
          src={currentMedia.file_url}
          autoPlay
          loop={playlist.length === 1 || playlist[currentIndex]?.play_limit === 0}
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

export default function PlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans">
          <div className="text-center space-y-3">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin mx-auto" />
            <p className="text-white/70 text-xs font-medium tracking-wide">Memuat Web Player...</p>
          </div>
        </div>
      }
    >
      <PlayerContent />
    </Suspense>
  );
}
