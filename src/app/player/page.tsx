'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Media, PlaylistItem } from '@/lib/types';

// ============================================
// Constants
// ============================================
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const DEVICE_TOKEN_KEY = 'signage_device_token';
const SCREEN_ID_KEY = 'signage_screen_id';

// ============================================
// Types
// ============================================
interface ActiveSchedule {
  id: string;
  mode: string;
  priority: number;
  playlist_id: string;
  start_time: string;
  end_time: string;
}

export default function PlayerPage() {
  const [phase, setPhase] = useState<'activation' | 'loading' | 'playing'>('activation');
  const [screenId, setScreenId] = useState<string | null>(null);
  const [screenName, setScreenName] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activating, setActivating] = useState(false);

  // Player state
  const [playlist, setPlaylist] = useState<(PlaylistItem & { media: Media })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMedia, setCurrentMedia] = useState<Media | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // Check for existing device token on mount
  // ============================================
  useEffect(() => {
    const savedScreenId = localStorage.getItem(SCREEN_ID_KEY);
    const savedToken = localStorage.getItem(DEVICE_TOKEN_KEY);

    if (savedScreenId && savedToken) {
      // Verify the token is still valid
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
      // Update status to online
      await supabase
        .from('screens')
        .update({ status: 'online', last_seen: new Date().toISOString() })
        .eq('id', data.id);
      loadScheduleAndPlay(data.id);
    } else {
      // Token invalid, clear and show activation
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

    // Find valid activation code
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

    // Generate device token
    const deviceToken = `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Mark activation as used
    await supabase
      .from('screen_activations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', activation.id);

    // Update screen with device token and set online
    await supabase
      .from('screens')
      .update({
        device_token: deviceToken,
        status: 'online',
        last_seen: new Date().toISOString(),
      })
      .eq('id', activation.screen_id);

    // Save to localStorage
    localStorage.setItem(SCREEN_ID_KEY, activation.screen_id);
    localStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);

    setScreenId(activation.screen_id);
    setScreenName(activation.screen?.name || '');
    setActivating(false);

    // Start playing
    loadScheduleAndPlay(activation.screen_id);
  };

  // ============================================
  // Load Schedule & Play
  // ============================================
  const loadScheduleAndPlay = async (sid: string) => {
    setPhase('loading');
    const supabase = createClient();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    // Get active schedules for this screen
    const { data: scheduleScreens } = await supabase
      .from('schedule_screens')
      .select('schedule_id')
      .eq('screen_id', sid);

    if (!scheduleScreens || scheduleScreens.length === 0) {
      setPhase('playing');
      setPlaylist([]);
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
      setPhase('playing');
      setPlaylist([]);
      startHeartbeat(sid, null);
      setupRealtimeListener(sid);
      return;
    }

    // Pick highest priority schedule (promosi > normal at same priority)
    const activeSchedule = schedules[0];

    // Load playlist items
    const { data: items } = await supabase
      .from('playlist_items')
      .select('*, media(*)')
      .eq('playlist_id', activeSchedule.playlist_id)
      .order('sort_order', { ascending: true });

    if (items && items.length > 0) {
      setPlaylist(items as any);
      setCurrentIndex(0);
      setCurrentMedia(items[0].media);
    }

    setPhase('playing');
    startHeartbeat(sid, items?.[0]?.media?.id || null);
    setupRealtimeListener(sid);
  };

  // ============================================
  // Playback
  // ============================================
  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIndex);
    setCurrentMedia(playlist[nextIndex].media);
  }, [currentIndex, playlist]);

  useEffect(() => {
    if (!currentMedia || phase !== 'playing') return;

    if (currentMedia.media_type === 'image') {
      // Display image for duration (default 10 seconds)
      const timeout = setTimeout(playNext, (currentMedia.duration || 10) * 1000);
      return () => clearTimeout(timeout);
    }
    // Video will call playNext via onEnded
  }, [currentMedia, phase, playNext]);

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
          // Reload schedule when any schedule changes
          loadScheduleAndPlay(sid);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_screens' },
        () => {
          loadScheduleAndPlay(sid);
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
  // RENDER: Activation Screen
  // ============================================
  if (phase === 'activation') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B1426] to-[#1A2744] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-fade-in">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <polygon points="10 8 16 11 10 14 10 8" fill="white" stroke="none" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Digital Signage</h1>
            <p className="text-sm text-gray-400 mt-1">PT Rolas Nusantara Medika</p>
          </div>

          {/* Activation Form */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-1">Aktivasi Layar</h2>
            <p className="text-sm text-gray-400 mb-6">
              Masukkan kode 6 digit dari Dashboard Admin
            </p>

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
                className="w-full text-center text-4xl tracking-[0.4em] font-mono font-bold bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                autoFocus
              />

              {activationError && (
                <p className="text-sm text-red-400">{activationError}</p>
              )}

              <button
                onClick={handleActivate}
                disabled={activationCode.length !== 6 || activating}
                className="w-full py-3 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activating ? 'Mengaktifkan...' : 'Aktifkan'}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-600 mt-6">
            © {new Date().getFullYear()} PT Rolas Nusantara Medika
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Loading
  // ============================================
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Memuat jadwal...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Player (Fullscreen)
  // ============================================
  return (
    <div className="player-fullscreen">
      {playlist.length === 0 || !currentMedia ? (
        // No content — standby screen
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#0B1426] to-[#1A2744]">
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/20 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">{screenName || 'Digital Signage'}</p>
            <p className="text-white/20 text-xs mt-1">Menunggu jadwal tayang...</p>
          </div>
        </div>
      ) : currentMedia.media_type === 'video' ? (
        <video
          ref={videoRef}
          src={currentMedia.file_url}
          autoPlay
          muted={false}
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
