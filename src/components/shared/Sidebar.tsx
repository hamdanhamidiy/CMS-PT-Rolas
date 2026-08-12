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
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Media Library',
    href: '/media',
    icon: Image,
  },
  {
    label: 'Playlist',
    href: '/playlist',
    icon: ListMusic,
  },
  {
    label: 'Jadwal',
    href: '/schedule',
    icon: CalendarClock,
  },
  {
    label: 'Layar',
    href: '/screens',
    icon: MonitorPlay,
  },
  {
    label: 'Aktivitas',
    href: '/activity',
    icon: Activity,
  },
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
    <aside className="sidebar-width fixed top-0 left-0 h-screen bg-[#FAFAFA] border-r border-black/[0.04] flex flex-col z-40 max-lg:hidden">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100/80">
        <Logo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">
          Menu Utama
        </p>
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-300 relative
                ${
                  isActive
                    ? 'font-medium text-slate-900 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-black/[0.03]'
                    : 'font-normal text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
                }
              `}
            >
              <div className={`
                p-1.5 rounded-lg transition-colors
                ${isActive ? 'text-slate-900' : 'text-slate-300 group-hover:text-slate-500'}
              `}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100/80">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium w-full text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-300"
        >
          <div className="p-1.5 rounded-lg text-slate-400 group-hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
