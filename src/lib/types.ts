// Database entity types for Central Digital Signage CMS

export type UserRole = 'admin' | 'operator';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ScreenStatus = 'online' | 'offline' | 'inactive';

export interface Screen {
  id: string;
  screen_code: string;
  name: string;
  site: string;
  area: string;
  device_token: string | null;
  status: ScreenStatus;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScreenActivation {
  id: string;
  screen_id: string;
  activation_code: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export type MediaType = 'video' | 'image';

export interface Media {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  media_type: MediaType;
  duration: number | null;
  file_size: number;
  thumbnail_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type PlaylistStatus = 'draft' | 'active' | 'archived';

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  status: PlaylistStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  items_count?: number;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  media_id: string;
  sort_order: number;
  play_limit: number;
  created_at: string;
  media?: Media;
}

export type ScheduleMode = 'normal' | 'promosi';
export type ScheduleStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface Schedule {
  id: string;
  playlist_id: string;
  name: string;
  mode: ScheduleMode;
  priority: number;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  loop_count?: number;
  start_times?: string[];
  status: ScheduleStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  playlist?: Playlist;
  screens?: Screen[];
}

export interface ScheduleScreen {
  schedule_id: string;
  screen_id: string;
}

export interface ScreenHeartbeat {
  id: string;
  screen_id: string;
  current_media_id: string | null;
  status: string;
  received_at: string;
  current_media?: Media;
}

export type ActivityAction =
  | 'login'
  | 'upload_media'
  | 'delete_media'
  | 'create_playlist'
  | 'update_playlist'
  | 'delete_playlist'
  | 'create_schedule'
  | 'publish_schedule'
  | 'cancel_schedule'
  | 'create_screen'
  | 'activate_screen'
  | 'delete_screen'
  | 'generate_activation_code';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
  profile?: Profile;
}

// Dashboard stats
export interface DashboardStats {
  totalScreens: number;
  onlineScreens: number;
  offlineScreens: number;
  totalMedia: number;
  totalPlaylists: number;
  activePlaylists: number;
  todaySchedules: number;
  totalStorageUsed: number;
}

export interface NowPlaying {
  screen: Screen;
  currentMedia: Media | null;
  schedule: Schedule | null;
  lastHeartbeat: string | null;
}
