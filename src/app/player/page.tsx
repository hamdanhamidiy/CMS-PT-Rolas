'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Media, PlaylistItem } from '@/lib/types';
import Logo from '@/components/shared/Logo';
import { Tv, KeyRound, Loader2, Sparkles } from 'lucide-react';

// ============================================
// Constants
// ============================================
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const SCHEDULE_CHECK_INTERVAL = 10000; // Check schedule transition every 10 seconds
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
  const [playCount, setPlayCount] = useState(0); // Tracks iteration count for 1-item playlists

  const videoRef = useRef<HTMLVideoElement>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const activeScheduleIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    activeScheduleIdRef.current = activeScheduleId;
  }, [activeScheduleId]);

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
      .eq('device_token', token)
      .single();

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
      localStorage.removeItem(DEVICE_TOKEN_KEY);
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
  // Load Schedule & Play (With Silent Transition)
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

    const activeSchedule = schedules[0];

    // Check if schedule hasn't changed to avoid unnecessary playlist reloads
    if (activeSchedule.id === activeScheduleIdRef.current && playlist.length > 0) {
      setPhase('playing');
      return;
    }

    // Load items for newly active schedule (e.g., promo schedule takeover)
    const { data: items } = await supabase
      .from('playlist_items')
      .select('*, media(*)')
      .eq('playlist_id', activeSchedule.playlist_id)
      .order('sort_order', { ascending: true });

    if (items && items.length > 0) {
      setActiveScheduleId(activeSchedule.id);
      setPlaylist(items as any);
      setCurrentIndex(0);
      setCurrentMedia(items[0].media);
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
  // Schedule Auto-Ticker (Syncs Promo Transition Real-Time Every 10s)
  // ============================================
  useEffect(() => {
    if (!screenId || phase === 'activation') return;

    const timer = setInterval(() => {
      loadScheduleAndPlay(screenId, false);
    }, SCHEDULE_CHECK_INTERVAL);

    return () => clearInterval(timer);
  }, [screenId, phase]);

  // ============================================
  // Playback Navigation & Preloading
  // ============================================
  const playNext = useCallback(() => {
    if (playlist.length === 0) return;

    if (playlist.length === 1) {
      // Force restart for single-item playlists (e.g. 1 promo video)
      if (videoRef.current && playlist[0]?.media?.media_type === 'video') {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
      setPlayCount((prev) => prev + 1);
      return;
    }

    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIndex);
    setCurrentMedia(playlist[nextIndex].media);
    setPlayCount((prev) => prev + 1);
  }, [currentIndex, playlist]);

  // Intelligent Background Preloading for Zero Delay
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

  // Robust Autoplay Handler for Images & Videos with Safety Timeout
  useEffect(() => {
    if (!currentMedia || phase !== 'playing') return;

    if (currentMedia.media_type === 'image') {
      const timeout = setTimeout(playNext, (currentMedia.duration || 10) * 1000);
      return () => clearTimeout(timeout);
    }

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

      // Safety fallback timer: skip to next item if video hangs or network stalls
      const safetyTime = ((currentMedia.duration || 30) + 5) * 1000;
      const safetyTimeout = setTimeout(playNext, safetyTime);

      return () => clearTimeout(safetyTimeout);
    }
  }, [currentMedia, phase, playNext, playCount]);

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
      .channel('schedule-changes')
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
    <div className="player-fullscreen">
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
          onEnded={playNext}
          onError={playNext}
          className="w-full h-full object-contain"
        />
      ) : (
        <img
          src={currentMedia.file_url}
          alt={currentMedia.title}
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}
