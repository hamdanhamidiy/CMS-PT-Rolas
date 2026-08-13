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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const pageTitle = pageTitles[pathname] || 'Dashboard Overview';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {/* ── Top Bar ── */}
      <header className="h-[60px] bg-white/85 backdrop-blur-lg border-b border-slate-200/70 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">Signage</span>
            <ChevronRight className="w-3 h-3 text-slate-300 hidden sm:inline" />
            <span className="font-semibold text-slate-800 text-[13px]">{pageTitle}</span>
          </div>
        </div>

        {/* User badge */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[12px] font-semibold text-slate-800 leading-tight">{userName || 'admin'}</p>
            <p className="text-[10px] text-slate-400 font-normal">Super Admin</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {userName.charAt(0).toUpperCase() || 'A'}
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs mobile-drawer-backdrop"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <aside className="absolute left-0 top-0 h-full w-[280px] bg-white border-r border-slate-200/70 shadow-2xl flex flex-col mobile-drawer-panel">
            <div>
              {/* Logo header */}
              <div className="h-[60px] flex items-center justify-between px-5 border-b border-slate-100">
                <Logo />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Tutup Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav items */}
              <nav className="p-3">
                <p className="px-3 mb-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Menu Utama
                </p>
                <div className="space-y-1">
                  {menuItems.map((item, idx) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`
                          group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] relative mobile-drawer-item
                          ${
                            isActive
                              ? 'font-medium text-slate-900 bg-slate-900/[0.04]'
                              : 'font-normal text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                          }
                        `}
                        style={{ animationDelay: `${idx * 35}ms` }}
                      >
                        <div className={`
                          absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-slate-800 transition-all duration-300
                          ${isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'}
                        `} />
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200
                          ${isActive ? 'bg-slate-900 text-white' : 'text-slate-400 group-hover:text-slate-600'}
                        `}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </div>

            {/* Drawer footer */}
            <div className="p-3 mt-auto border-t border-slate-100">
              <div className="flex items-center gap-2.5 mb-3 px-3 py-2.5 rounded-xl bg-slate-50/80">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
                  {userName.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">{userName || 'admin'}</p>
                  <p className="text-[10px] text-slate-400 truncate">Super Admin</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium w-full text-red-600 hover:bg-red-50/80 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Keluar dari Akun
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
