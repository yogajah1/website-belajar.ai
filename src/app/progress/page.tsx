'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Award,
  Flame,
  Sparkles,
  Trophy,
  Calendar,
  Layers,
  BrainCircuit,
  CheckCircle2,
  Lock,
  Zap,
  BookOpen,
  Target,
  Shield,
  Clock,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getAllActivities } from '@/lib/firebase/store';
import { DailyActivity } from '@/types';
import { BADGES, calculateLevelFromXP } from '@/lib/gamification';
import { ActivityHeatmap } from '@/components/gamification/ActivityHeatmap';

// Helper to map badge icon strings to Lucide components
const getBadgeIcon = (name: string) => {
  switch (name) {
    case 'Sparkles':
      return Sparkles;
    case 'Flame':
      return Flame;
    case 'Trophy':
      return Trophy;
    case 'Zap':
      return Zap;
    case 'BookOpen':
      return BookOpen;
    case 'Target':
      return Target;
    case 'Shield':
      return Shield;
    case 'Clock':
      return Clock;
    default:
      return Award;
  }
};

export default function ProgressPage() {
  const { user, stats, loading } = useAuth();
  const router = useRouter();

  const [activities, setActivities] = useState<DailyActivity[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      getAllActivities(user.uid).then(setActivities);
    }
  }, [user, loading, router]);

  const xpStats = calculateLevelFromXP(stats?.xp || 0);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[var(--reward)]" /> Progres & Pencapaian
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Pantau akumulasi XP, status streak harian, heatmap aktivitas, dan koleksi achievement.
          </p>
        </div>

        {/* Top 3 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Level & XP */}
          <div className="quest-card p-5 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
              Status Level
            </span>
            <div className="flex items-baseline justify-between">
              <h3 className="text-2xl font-bold font-mono text-[var(--text)]">Level {xpStats.level}</h3>
              <span className="text-xs text-[var(--reward)] font-medium">&ldquo;{xpStats.title}&rdquo;</span>
            </div>
            <div className="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted)] flex justify-between font-mono">
              <span>Akumulasi XP:</span>
              <span className="font-bold text-[var(--reward)] tabular-nums">{stats?.xp || 0} XP</span>
            </div>
          </div>

          {/* Current & Longest Streak */}
          <div className="quest-card p-5 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
              Streak Belajar
            </span>
            <div className="flex items-baseline gap-2">
              <Flame className="w-5 h-5 text-[var(--reward)] fill-[var(--reward)]" />
              <h3 className="text-2xl font-bold font-mono text-[var(--text)] tabular-nums">{stats?.streakCurrent || 1} Hari</h3>
            </div>
            <div className="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted)] flex justify-between font-mono">
              <span>Rekor Terpanjang:</span>
              <span className="font-bold text-[var(--text)] tabular-nums">{stats?.streakLongest || 1} Hari</span>
            </div>
          </div>

          {/* Activity Metrics */}
          <div className="quest-card p-5 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
              Metrik Latihan
            </span>
            <div className="space-y-1 text-xs text-[var(--muted)]">
              <div className="flex justify-between">
                <span>Kartu Direview:</span>
                <span className="font-mono font-bold text-[var(--text)] tabular-nums">{stats?.cardsReviewed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Kuis Sempurna:</span>
                <span className="font-mono font-bold text-[var(--reward)] tabular-nums">{stats?.perfectQuizzes || 0}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted)] flex justify-between font-mono">
              <span>Lencana Terbuka:</span>
              <span className="font-bold text-[var(--primary)] tabular-nums">{stats?.badges?.length || 0} / {BADGES.length}</span>
            </div>
          </div>
        </div>

        {/* 365-day Activity Heatmap */}
        <div className="quest-card p-5 sm:p-6 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--primary)]" /> Log Keaktifan Belajar
            </h3>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              Riwayat konsistensi aktivitas belajar sepanjang tahun.
            </p>
          </div>

          <ActivityHeatmap activities={activities} />
        </div>

        {/* Badges Collection with Minimalist Hexagonal Emblem */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[var(--reward)]" /> Koleksi Achievement ({stats?.badges?.length || 0}/{BADGES.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {BADGES.map((badge) => {
              const isUnlocked = stats?.badges?.includes(badge.id);
              const IconComp = getBadgeIcon(badge.icon);

              return (
                <div
                  key={badge.id}
                  className={`quest-card p-4 transition-all flex items-start gap-3 ${
                    isUnlocked
                      ? 'border-[var(--reward)]/40 bg-[var(--surface)]'
                      : 'opacity-50 grayscale hover:opacity-60'
                  }`}
                >
                  {/* Minimalist Hexagonal SVG Emblem */}
                  <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                      <polygon
                        points="50 3, 93 25, 93 75, 50 97, 7 75, 7 25"
                        fill={isUnlocked ? 'rgba(245, 184, 46, 0.12)' : 'var(--surface-2)'}
                        stroke={isUnlocked ? 'var(--reward)' : 'var(--border)'}
                        strokeWidth="6"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="relative z-10">
                      {isUnlocked ? (
                        <IconComp className="w-4 h-4 text-[var(--reward)]" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-[var(--muted)]" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-xs text-[var(--text)] truncate">
                        {badge.title}
                      </h4>
                      {isUnlocked && <CheckCircle2 className="w-3 h-3 text-[var(--reward)] shrink-0" />}
                    </div>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">
                      {badge.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
