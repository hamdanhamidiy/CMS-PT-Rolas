'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Logo from './Logo';
import {
  LayoutDashboard,
  MonitorPlay,
  Image,
  ListMusic,
  CalendarClock,
  Activity,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Media Library', href: '/media', icon: Image },
  { label: 'Playlist', href: '/playlist', icon: ListMusic },
  { label: 'Jadwal', href: '/schedule', icon: CalendarClock },
  { label: 'Layar', href: '/screens', icon: MonitorPlay },
  { label: 'Aktivitas', href: '/activity', icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="sidebar-width fixed top-0 left-0 h-screen bg-white border-r border-slate-200/70 flex flex-col z-40 max-lg:hidden">
      {/* Logo */}
      <div className="h-[60px] flex items-center px-6 border-b border-slate-100">
        <Logo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 overflow-y-auto">
        <p className="px-3 mb-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">
          Menu Utama
        </p>
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  sidebar-nav-item group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] relative
                  ${
                    isActive
                      ? 'font-medium text-slate-900 bg-slate-900/[0.04]'
                      : 'font-normal text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                  }
                `}
              >
                {/* Active left bar indicator with smooth transition */}
                <div className={`
                  absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-slate-800 transition-all duration-300 ease-out
                  ${isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'}
                `} />

                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200
                  ${isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-transparent text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100/60'}
                `}>
                  <item.icon className="w-[16px] h-[16px]" />
                </div>
                <span className="transition-colors duration-200">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-normal w-full text-slate-500 hover:bg-red-50/80 hover:text-red-600 group"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-red-500 group-hover:bg-red-100/50 transition-colors duration-200">
            <LogOut className="w-[16px] h-[16px]" />
          </div>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
