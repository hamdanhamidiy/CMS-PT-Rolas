'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
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
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-600', activeBg: 'bg-blue-50', activeBar: 'bg-blue-600' },
  { label: 'Media Library', href: '/media', icon: ImageIcon, color: 'text-emerald-600', activeBg: 'bg-emerald-50', activeBar: 'bg-emerald-600' },
  { label: 'Playlist', href: '/playlist', icon: ListMusic, color: 'text-purple-600', activeBg: 'bg-purple-50', activeBar: 'bg-purple-600' },
  { label: 'Jadwal', href: '/schedule', icon: CalendarClock, color: 'text-amber-600', activeBg: 'bg-amber-50', activeBar: 'bg-amber-600' },
  { label: 'Layar', href: '/screens', icon: MonitorPlay, color: 'text-cyan-600', activeBg: 'bg-cyan-50', activeBar: 'bg-cyan-600' },
  { label: 'Aktivitas', href: '/activity', icon: Activity, color: 'text-rose-600', activeBg: 'bg-rose-50', activeBar: 'bg-rose-600' },
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
  const [userEmail, setUserEmail] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [titleAnimating, setTitleAnimating] = useState(false);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserName(data.user.email?.split('@')[0] || 'Admin');
        setUserEmail(data.user.email || '');
      }
    });
  }, []);

  // Animate title on route change
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setTitleAnimating(true);
      const timer = setTimeout(() => setTitleAnimating(false), 300);
      prevPathRef.current = pathname;
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
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
      {/* ── Top Bar Header ── */}
      <header className="topbar-header h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-4 h-4 text-slate-800" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">Signage</span>
            <ChevronRight className="w-3 h-3 text-slate-300 hidden sm:inline" />
            <span className={`font-bold text-slate-900 tracking-tight text-xs sm:text-sm transition-all duration-300 ${
              titleAnimating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
            }`}>
              {pageTitle}
            </span>
          </div>
        </div>

        {/* User profile badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200/60">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{userName || 'admin'}</p>
              <p className="text-[10px] text-slate-400 font-normal">Super Admin</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-slate-900/20 ring-2 ring-white">
              {userName.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Sidebar Drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm mobile-drawer-backdrop"
            onClick={() => setMobileOpen(false)}
          />

          {/* Sliding drawer panel */}
          <aside className="absolute left-0 top-0 h-full w-[285px] bg-white border-r border-slate-200/60 shadow-2xl flex flex-col justify-between mobile-drawer-panel">
            <div>
              {/* Drawer Logo Header */}
              <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
                <Logo />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                  aria-label="Tutup Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="p-3 space-y-0.5">
                <p className="px-3 mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Menu Utama
                </p>
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
                        group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs relative overflow-hidden mobile-drawer-item
                        ${
                          isActive
                            ? `font-semibold text-slate-900 ${item.activeBg} shadow-sm`
                            : 'font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }
                      `}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      {/* Active bar */}
                      <div className={`
                        absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300
                        ${isActive ? `h-5 ${item.activeBar}` : 'h-0 bg-transparent'}
                      `} />

                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg transition-all duration-200 ${isActive ? item.color : 'text-slate-400 group-hover:text-slate-600'}`}>
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      {isActive && (
                        <div className={`w-1.5 h-1.5 rounded-full ${item.activeBar}`} />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Footer Logout */}
            <div className="p-3 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {userName.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{userName || 'admin'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{userEmail || 'Operator'}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold w-full text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200/60 transition-all duration-200"
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
