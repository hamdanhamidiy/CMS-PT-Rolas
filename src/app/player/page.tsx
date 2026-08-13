'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Media, PlaylistItem } from '@/lib/types';
import Logo from '@/components/shared/Logo';
import { Tv, KeyRound, Loader2, Sparkles, Maximize, Minimize, Expand, LogOut } from 'lucide-react';

// ============================================
// Constants
// ============================================
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const SCHEDULE_CHECK_INTERVAL = 10000; // Check schedule transition every 10 seconds
const CLOCK_SYNC_INTERVAL = 3000; // Re-align player clock with global epoch every 3 seconds
const DEVICE_TOKEN_KEY = 'signage_device_token';
const SCREEN_ID_KEY = 'signage_screen_id';

export default function PlayerPage() {
  const [phase, setPhase] = useState<'activation' | 'loading' | 'playing'>('activation');
  const [screenId, setScreenId] = useState<string | null>(null);
  const [screenName, setScreenName] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activating, setActivating] = useState(false);

  // Player state
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<(PlaylistItem & { media: Media })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMedia, setCurrentMedia] = useState<Media | null>(null);

  // Display Customization State
  const [fitMode, setFitMode] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      // Ignore fullscreen API denial
    }
  };

  const cycleFitMode = () => {
    setFitMode((prev) => {
      if (prev === 'contain') return 'cover';
      if (prev === 'cover') return 'fill';
      return 'contain';
    });
  };

  // Reset & Unpair device from local player
  const handleResetDevice = async () => {
    if (!confirm('Reset koneksi perangkat ini? Layar akan kembali meminta Kode Aktivasi 6-digit.')) {
      return;
    }

    if (screenId) {
      const supabase = createClient();
      await supabase
        .from('screens')
        .update({ device_token: null, status: 'inactive' })
        .eq('id', screenId);
    }

    localStorage.removeItem(SCREEN_ID_KEY);
    localStorage.removeItem(DEVICE_TOKEN_KEY);
    setScreenId(null);
    setPlaylist([]);
    setCurrentMedia(null);
    setActiveScheduleId(null);
    setPhase('activation');
  };

  // ============================================
  // Check for existing device token on mount
  // ============================================
  useEffect(() => {
    const savedScreenId = localStorage.getItem(SCREEN_ID_KEY);
    const savedToken = localStorage.getItem(DEVICE_TOKEN_KEY);

    if (savedScreenId && savedToken) {
      verifyToken(savedScreenId, savedToken);
    }
  }, []);

  const verifyToken = async (screenIdVal: string, token: string) => {
    setPhase('loading');
    const supabase = createClient();

    const { data } = await supabase
      .from('screens')
      .select('*')
      .eq('id', screenIdVal)
      .single();

    if (data && data.device_token === token) {
      setScreenId(data.id);
      setScreenName(data.name);
      await supabase
        .from('screens')
        .update({ status: 'online', last_seen: new Date().toISOString() })
        .eq('id', data.id);
      loadScheduleAndPlay(data.id, true);
    } else {
      // Device token has been reset by Admin in Dashboard! Force reset to activation screen.
      localStorage.removeItem(SCREEN_ID_KEY);
      localStorage.removeItem(DEVICE_TOKEN_KEY);
      setScreenId(null);
      setPhase('activation');
    }
  };

  // ============================================
  // Activation
  // ============================================
  const handleActivate = async () => {
    if (activationCode.length !== 6) {
      setActivationError('Kode harus 6 digit');
      return;
    }

    setActivating(true);
    setActivationError('');
    const supabase = createClient();

    const { data: activation } = await supabase
      .from('screen_activations')
      .select('*, screen:screens(*)')
      .eq('activation_code', activationCode)
      .is('used_at', null)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!activation) {
      setActivationError('Kode tidak valid atau sudah kedaluwarsa');
      setActivating(false);
      return;
    }

    const deviceToken = `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await supabase
      .from('screen_activations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', activation.id);

    await supabase
      .from('screens')
      .update({
        device_token: deviceToken,
        status: 'online',
        last_seen: new Date().toISOString(),
      })
      .eq('id', activation.screen_id);

    localStorage.setItem(SCREEN_ID_KEY, activation.screen_id);
    localStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);

    setScreenId(activation.screen_id);
    setScreenName(activation.screen?.name || '');
    setActivating(false);

    loadScheduleAndPlay(activation.screen_id, true);
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
  // Load Schedule & Play (With Silent Transition)
  // ============================================
  const loadScheduleAndPlay = async (sid: string, showLoading = false) => {
    if (showLoading) setPhase('loading');
    const supabase = createClient();

    // 1. Verify device token validity in DB
    const savedToken = localStorage.getItem(DEVICE_TOKEN_KEY);
    const { data: currentScreen } = await supabase
      .from('screens')
      .select('device_token')
      .eq('id', sid)
      .single();

    if (!currentScreen || currentScreen.device_token !== savedToken) {
      // Admin clicked "Reset Koneksi" in Dashboard! Force reset to activation screen.
      localStorage.removeItem(SCREEN_ID_KEY);
      localStorage.removeItem(DEVICE_TOKEN_KEY);
      setScreenId(null);
      setActiveScheduleId(null);
      setPlaylist([]);
      setCurrentMedia(null);
      setPhase('activation');
      return;
    }

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
      .gte('end_date', today)
      .lte('start_time', currentTime)
      .gte('end_time', currentTime)
      .order('priority', { ascending: false });

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

    // Sort schedules: Prioritize 'promosi' mode over 'normal' mode, then by priority
    schedules.sort((a, b) => {
      if (a.mode === 'promosi' && b.mode !== 'promosi') return -1;
      if (a.mode !== 'promosi' && b.mode === 'promosi') return 1;
      return (b.priority || 0) - (a.priority || 0);
    });

    const activeSchedule = schedules[0];

    if (activeSchedule.id === activeScheduleIdRef.current && playlist.length > 0) {
      setPhase('playing');
      return;
    }

    const { data: items } = await supabase
      .from('playlist_items')
      .select('*, media(*)')
      .eq('playlist_id', activeSchedule.playlist_id)
      .order('sort_order', { ascending: true });

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
    if (!screenId || phase === 'activation') return;

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

  // ============================================
  // Background Preloading for Next Media
  // ============================================
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

  // ============================================
  // Playback Auto-play & Autoplay Policy Fallback
  // ============================================
  useEffect(() => {
    if (!currentMedia || phase !== 'playing') return;

    if (currentMedia.media_type === 'video' && videoRef.current) {
      const vid = videoRef.current;

      const attemptPlay = async () => {
        try {
          vid.muted = false;
          await vid.play();
        } catch {
          try {
            vid.muted = true;
            await vid.play();
          } catch {
            // Autoplay blocked completely
          }
        }
      };

      attemptPlay();
    }
  }, [currentMedia, phase]);

  // ============================================
  // Heartbeat
  // ============================================
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

  // ============================================
  // Realtime Listener
  // ============================================
  const setupRealtimeListener = (sid: string) => {
    const supabase = createClient();

    supabase
      .channel('screen-device-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'screens', filter: `id=eq.${sid}` },
        (payload) => {
          const newScreen = payload.new as any;
          const savedToken = localStorage.getItem(DEVICE_TOKEN_KEY);
          if (!newScreen || newScreen.device_token !== savedToken) {
            // Admin clicked "Reset Koneksi" in Dashboard! Instantly return to activation screen.
            localStorage.removeItem(SCREEN_ID_KEY);
            localStorage.removeItem(DEVICE_TOKEN_KEY);
            setScreenId(null);
            setActiveScheduleId(null);
            setPlaylist([]);
            setCurrentMedia(null);
            setPhase('activation');
          }
        }
      )
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  // Class for Object-Fit Aspect Ratio
  const fitClass =
    fitMode === 'cover'
      ? 'object-cover'
      : fitMode === 'fill'
      ? 'object-fill'
      : 'object-contain';

  // ============================================
  // RENDER: Corporate Clean Activation Screen
  // ============================================
  if (phase === 'activation') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 text-slate-900 font-sans">
        <div className="w-full max-w-md space-y-6">
          
          {/* Logo Header */}
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs mb-3">
              <Logo />
            </div>
            <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
              Web Player Signage
            </p>
          </div>

          {/* Activation Card */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Aktivasi Perangkat Layar</h2>
              <p className="text-xs text-slate-500 font-normal max-w-xs mx-auto">
                Masukkan 6 angka kode aktivasi dari Dashboard Admin (<code className="text-blue-600 font-semibold">/screens</code>)
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                maxLength={6}
                value={activationCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setActivationCode(val);
                  setActivationError('');
                }}
                placeholder="000000"
                className="w-full text-center text-3xl tracking-[0.4em] font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                autoFocus
              />

              {activationError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
                  {activationError}
                </div>
              )}

              <button
                onClick={handleActivate}
                disabled={activationCode.length !== 6 || activating}
                className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs flex items-center justify-center gap-2"
              >
                {activating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghubungkan Perangkat...</span>
                  </>
                ) : (
                  <>
                    <Tv className="w-4 h-4" />
                    <span>Aktifkan Layar Ini</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Otomatis terhubung & tayang real-time</span>
            </div>
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
          <p className="text-white/70 text-xs font-medium tracking-wide">Memuat Jadwal & Rotasi Media...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Fullscreen Player
  // ============================================
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      
      {/* ── FLOATING AUTO-HIDE PLAYER CONTROL BAR ── */}
      <div
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-white/15 p-2 rounded-2xl text-white shadow-2xl transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        {/* Reset Device Button */}
        <button
          onClick={handleResetDevice}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30 transition-all active:scale-95"
          title="Reset Koneksi Perangkat Ini"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden sm:inline">Reset Perangkat</span>
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

        {/* Aspect Ratio Mode Cycle Button */}
        <button
          onClick={cycleFitMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95"
          title="Ubah Aspek Rasio (Fit / Cover / Fill)"
        >
          <Expand className="w-3.5 h-3.5 text-amber-400" />
          <span className="capitalize">{fitMode === 'contain' ? 'Fit (Proporsional)' : fitMode === 'cover' ? 'Penuhi Layar (Cover)' : 'Stretch (Fill)'}</span>
        </button>
      </div>

      {/* ── MEDIA PLAYBACK CONTENT ── */}
      {playlist.length === 0 || !currentMedia ? (
        // No content — Corporate standby screen
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
