import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  return `${hours}:${minutes}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function generateActivationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateScreenCode(): string {
  const num = Math.floor(1 + Math.random() * 9999);
  return `SCR-${num.toString().padStart(4, '0')}`;
}

export function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDate(dateString);
}

export function getMediaTypeLabel(type: string): string {
  return type === 'video' ? 'Video' : 'Gambar';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
    case 'active':
      return 'bg-emerald-500';
    case 'offline':
    case 'inactive':
      return 'bg-gray-400';
    case 'draft':
      return 'bg-amber-500';
    case 'completed':
      return 'bg-blue-500';
    case 'cancelled':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

export async function ensureUserProfile(supabase: any, user: any): Promise<string | null> {
  if (!user) return null;
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email || 'admin@rolasmedika.co.id',
          full_name: user.user_metadata?.full_name || 'Admin User',
          role: 'admin',
        },
        { onConflict: 'id' }
      );
    }
    return user.id;
  } catch {
    return user.id || null;
  }
}

export async function logActivity(
  supabase: any,
  action: string,
  entityType: string,
  entityId: string | null = null,
  details: string | null = null,
  location: string | null = null,
  ipAddress: string | null = null,
  metadata: Record<string, any> | null = null
): Promise<void> {
  try {
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = await ensureUserProfile(supabase, user);
      }
    } catch {
      userId = null;
    }

    const payload: any = {
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    };
    if (location) payload.location = location;
    if (ipAddress) payload.ip_address = ipAddress;
    if (metadata) payload.metadata = metadata;

    await supabase.from('activity_logs').insert(payload);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

