'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import Logo from '@/components/shared/Logo';
import { Loader2, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('admin@rolasmedika.co.id');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error('Login gagal', {
            description: error.message === 'Invalid login credentials'
              ? 'Email atau password salah. Jika belum punya akun, klik "Buat Akun Admin Baru".'
              : error.message,
          });
          setLoading(false);
          return;
        }

        await logActivity(supabase, 'login', 'auth', null, `Login admin: ${email}`);

        toast.success('Login berhasil', {
          description: 'Mengalihkan ke dashboard...',
        });

        router.push('/dashboard');
        router.refresh();
      } else {
        // Mode Sign Up / Buat Akun Baru
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim() || 'Admin User',
            },
          },
        });

        if (error) {
          toast.error('Pendaftaran gagal', { description: error.message });
          setLoading(false);
          return;
        }

        toast.success('Akun Admin berhasil dibuat!', {
          description: 'Mencoba login otomatis...',
        });

        // Try login immediately after signup
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!loginErr) {
          router.push('/dashboard');
          router.refresh();
        } else {
          setMode('login');
          toast.info('Silakan login dengan password yang baru Anda buat.');
        }
      }
    } catch {
      toast.error('Terjadi kesalahan', {
        description: 'Silakan coba lagi.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] animate-fade-in space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <Logo className="justify-center" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-3">
          {mode === 'login' ? 'Masuk ke Dashboard Admin' : 'Buat Akun Admin Baru'}
        </h1>
        <p className="text-xs text-slate-500 font-normal mt-1">
          Central Digital Signage CMS • PT Rolas Nusantara Medika
        </p>
      </div>

      <Card className="border border-slate-200 shadow-xl rounded-2xl bg-white">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="fullname" className="text-xs font-bold text-slate-800">
                  Nama Lengkap
                </Label>
                <Input
                  id="fullname"
                  type="text"
                  placeholder="Contoh: Admin Medika"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-800">
                Email Admin
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@rolasmedika.co.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-slate-800">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password pilihan Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-10 pr-10 text-xs rounded-xl bg-slate-50/60 border-slate-200/80 focus:bg-white font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                Minimal 6 karakter.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk Ke Dashboard</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Daftarkan & Masuk</span>
                </>
              )}
            </Button>
          </form>

          {/* Mode Switcher Footer */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-slate-500 font-normal">
                Belum punya akun admin?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Buat Akun Admin Baru
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500 font-normal">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Masuk Kembali
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-slate-400 font-normal">
        © {new Date().getFullYear()} PT Rolas Nusantara Medika
      </p>
    </div>
  );
}
