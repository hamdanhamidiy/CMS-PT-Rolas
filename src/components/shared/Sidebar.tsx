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
    color: 'text-blue-600',
    activeBg: 'bg-blue-50',
    activeBar: 'bg-blue-600',
  },
  {
    label: 'Media Library',
    href: '/media',
    icon: Image,
    color: 'text-emerald-600',
    activeBg: 'bg-emerald-50',
    activeBar: 'bg-emerald-600',
  },
  {
    label: 'Playlist',
    href: '/playlist',
    icon: ListMusic,
    color: 'text-purple-600',
    activeBg: 'bg-purple-50',
    activeBar: 'bg-purple-600',
  },
  {
    label: 'Jadwal',
    href: '/schedule',
    icon: CalendarClock,
    color: 'text-amber-600',
    activeBg: 'bg-amber-50',
    activeBar: 'bg-amber-600',
  },
  {
    label: 'Layar',
    href: '/screens',
    icon: MonitorPlay,
    color: 'text-cyan-600',
    activeBg: 'bg-cyan-50',
    activeBar: 'bg-cyan-600',
  },
  {
    label: 'Aktivitas',
    href: '/activity',
    icon: Activity,
    color: 'text-rose-600',
    activeBg: 'bg-rose-50',
    activeBar: 'bg-rose-600',
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
    <aside className="sidebar-width fixed top-0 left-0 h-screen bg-white border-r border-slate-200/60 flex flex-col z-40 max-lg:hidden">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <Logo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
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
                sidebar-nav-item group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] relative overflow-hidden
                ${
                  isActive
                    ? `font-semibold text-slate-900 ${item.activeBg} shadow-sm`
                    : 'font-normal text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }
              `}
            >
              {/* Active indicator bar */}
              <div className={`
                absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300
                ${isActive ? `h-5 ${item.activeBar}` : 'h-0 bg-transparent'}
              `} />

              <div className={`
                p-1.5 rounded-lg transition-all duration-200
                ${isActive ? item.color : 'text-slate-400 group-hover:text-slate-600'}
              `}>
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              </div>
              <span className="transition-colors duration-200">{item.label}</span>

              {/* Hover shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full" 
                   style={{ transition: 'transform 0.6s ease, opacity 0.3s ease' }} />
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium w-full text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
        >
          <div className="p-1.5 rounded-lg text-slate-400 group-hover:text-red-500 transition-colors duration-200">
            <LogOut className="w-[18px] h-[18px]" />
          </div>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
