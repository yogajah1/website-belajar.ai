'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, Sun, Moon, LogIn, User as UserIcon, Shield } from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { calculateLevelFromXP } from '@/lib/gamification';
import { BrandLogo } from '@/components/ui/BrandLogo';

export const Navbar: React.FC = () => {
  const { user, profile, stats, updateProfileData } = useAuth();

  const xpStats = calculateLevelFromXP(stats?.xp || 0);

  const toggleTheme = () => {
    const nextTheme = profile?.theme === 'dark' ? 'light' : 'dark';
    updateProfileData({ theme: nextTheme });
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[var(--surface)] border-b border-[var(--border)] px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition">
          <BrandLogo size={26} showText={true} />
        </Link>

        {/* HUD: Level Shield, XP Bar & Streak Flame */}
        {user && (
          <div className="flex items-center gap-3 sm:gap-6 flex-1 max-w-md justify-center">
            {/* Level Hexagon / Shield Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--reward-subtle)] border border-amber-500/30 text-amber-500 dark:text-[#F5B82E]"
              title={`Level ${xpStats.level} - ${xpStats.title}`}
            >
              <Shield className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-bold font-mono tracking-tight">
                LVL {xpStats.level}
              </span>
            </div>

            {/* Thin Sleek XP Bar */}
            <div className="flex-1 hidden xs:flex flex-col">
              <div className="flex justify-between items-center text-[11px] font-medium mb-1">
                <span className="text-[var(--muted)] truncate max-w-[120px]">
                  {xpStats.title}
                </span>
                <span className="font-mono tabular-nums text-amber-500 dark:text-[#F5B82E] font-semibold text-[11px]">
                  {xpStats.currentLevelXp} / {xpStats.xpNeededForNext} XP
                </span>
              </div>
              <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full bg-amber-500 dark:bg-[#F5B82E] rounded-full transition-all duration-300 glow-reward"
                  style={{ width: `${xpStats.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Streak Flame */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 dark:text-orange-400"
              title={`Streak: ${stats?.streakCurrent || 1} hari berturut-turut`}
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-bold font-mono tabular-nums">
                {stats?.streakCurrent || 1}d
              </span>
            </div>
          </div>
        )}

        {/* Actions & Theme toggle & Profile */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition border border-[var(--border)]"
            title="Ganti Mode Gelap / Terang"
          >
            {profile?.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {user ? (
            <Link
              href="/settings"
              className="flex items-center gap-2 p-1.5 pr-3 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--border)] border border-[var(--border)] transition"
            >
              <div className="w-6 h-6 rounded-md bg-[var(--primary)] text-[#0B0F14] flex items-center justify-center font-bold text-xs uppercase">
                {user.displayName ? user.displayName.charAt(0) : <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs font-semibold text-[var(--text)] max-w-[100px] truncate hidden md:inline">
                {user.displayName || 'Profil'}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="btn-primary py-1.5 px-3 text-xs"
            >
              <LogIn className="w-3.5 h-3.5" /> Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
