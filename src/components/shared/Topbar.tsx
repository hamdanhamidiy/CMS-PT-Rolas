'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Logo from './Logo';
import {
  LayoutDashboard,
  MonitorPlay,
  Image as ImageIcon,
  ListMusic,
  CalendarClock,
  Activity,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Media Library', href: '/media', icon: ImageIcon },
  { label: 'Playlist', href: '/playlist', icon: ListMusic },
  { label: 'Jadwal', href: '/schedule', icon: CalendarClock },
  { label: 'Layar', href: '/screens', icon: MonitorPlay },
  { label: 'Aktivitas', href: '/activity', icon: Activity },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/media': 'Library Media',
  '/media/upload': 'Upload Media',
  '/playlist': 'Playlist & Antrean',
  '/schedule': 'Jadwal Penyiaran',
  '/schedule/create': 'Buat Jadwal Baru',
  '/screens': 'Perangkat Layar TV',
  '/activity': 'Log Aktivitas',
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserName(data.user.email?.split('@')[0] || 'Admin');
      }
    });
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const pageTitle = pageTitles[pathname] || 'Dashboard Overview';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {/* ── Top Bar Header (Desktop & Mobile Clean Alignment) ── */}
      <header className="h-16 bg-[#FAFAFA]/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 transition-all duration-300">
        <div className="flex items-center gap-3.5">
          {/* Mobile menu hamburger toggle button */}
          <button
            className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs active:scale-95"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-4 h-4 text-slate-800" />
          </button>

          {/* Breadcrumb path indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">Signage</span>
            <ChevronRight className="w-3 h-3 text-slate-300 hidden sm:inline" />
            <span className="font-bold text-slate-900 tracking-tight text-xs sm:text-sm">{pageTitle}</span>
          </div>
        </div>

        {/* User profile dropdown badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200/80">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{userName || 'Administrator'}</p>
              <p className="text-[10px] text-slate-400 font-normal">Super Admin</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {userName.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Sidebar Drawer (Matching Desktop Modern UI/UX) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay with blur */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Sliding drawer panel */}
          <aside className="absolute left-0 top-0 h-full w-[285px] bg-[#FAFAFA] border-r border-slate-200 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-300">
            <div>
              {/* Drawer Logo Header */}
              <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80 bg-white">
                <Logo />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                  aria-label="Tutup Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="p-4 space-y-1.5">
                <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                      onClick={() => setMobileOpen(false)}
                      className={`
                        group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200
                        ${
                          isActive
                            ? 'font-bold text-slate-900 bg-white shadow-2xs border border-slate-200/80'
                            : 'font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-slate-900 text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Footer Logout Button */}
            <div className="p-4 border-t border-slate-200/80 bg-white">
              <div className="flex items-center gap-3 mb-3 px-2 py-1.5 rounded-lg bg-slate-50">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  {userName.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{userName || 'Administrator'}</p>
                  <p className="text-[10px] text-slate-400 truncate">Online Operator</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold w-full text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200/60 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
