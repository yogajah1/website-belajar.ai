'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, BookOpen, Layers, MessageSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function LoginPage() {
  const { user, signInWithGoogle, signInAsGuest, loading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = err.message || 'Gagal masuk dengan Google.';
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        msg = 'Google Sign-In belum diaktifkan di Firebase Console. Buka Firebase Console > Authentication > Sign-in method > Aktifkan Google.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Jendela login ditutup sebelum selesai.';
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = 'Domain ini belum didaftarkan di Firebase Console > Authentication > Settings > Authorized domains.';
      }
      setErrorMessage(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandLogo size={36} showText={false} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            BelajarQuest
          </h1>
          <p className="text-xs text-[var(--muted)] font-medium">
            Sistem belajar mandiri terstruktur dengan AI & gamifikasi
          </p>
        </div>

        {/* Login Box */}
        <div className="quest-card p-6 space-y-4">
          <div className="space-y-2.5 text-xs text-[var(--muted)] pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
              <span>Ekstraksi dokumen & penyusunan bab otomatis</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-500 dark:text-[#F5B82E] shrink-0" />
              <span>Kuis interaktif, kartu geser, & flashcard SM-2</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
              <span>AI Tutor kontekstual dengan 3 mode respons</span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-[var(--danger)] text-xs leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--border)] border border-[var(--border)] text-xs font-semibold flex items-center justify-center gap-2.5 transition disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {isSigningIn ? 'Menghubungkan Google...' : 'Masuk dengan Google'}
          </button>

          {/* Guest Demo Mode */}
          <button
            onClick={() => signInAsGuest()}
            className="w-full btn-primary py-2.5 text-xs"
          >
            Masuk Mode Coba (Instan) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[11px] text-center text-[var(--muted)] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" /> Data tersimpan privat di akun Anda
        </p>
      </div>
    </div>
  );
}
