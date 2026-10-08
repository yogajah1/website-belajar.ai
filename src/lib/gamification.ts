import confetti from 'canvas-confetti';
import { BadgeDefinition, UserStats } from '@/types';
import { getTodayDateString } from './sm2';

export const BADGES: BadgeDefinition[] = [
  {
    id: 'first_step',
    title: 'Langkah Pertama',
    description: 'Menyelesaikan bab belajar pertama kamu',
    icon: 'Compass',
    category: 'milestone',
  },
  {
    id: 'streak_3',
    title: 'Konsisten 3 Hari',
    description: 'Belajar 3 hari berturut-turut',
    icon: 'Flame',
    category: 'streak',
  },
  {
    id: 'streak_7',
    title: 'Pejuang 7 Hari',
    description: 'Mempertahankan streak belajar selama 1 minggu',
    icon: 'Zap',
    category: 'streak',
  },
  {
    id: 'streak_30',
    title: 'Legenda 30 Hari',
    description: 'Konsistensi luar biasa selama sebulan penuh',
    icon: 'Crown',
    category: 'streak',
  },
  {
    id: 'quiz_10',
    title: 'Penguji Ulung',
    description: 'Menyelesaikan total 10 kuis belajar',
    icon: 'Target',
    category: 'quiz',
  },
  {
    id: 'quiz_perfect',
    title: 'Nilai Sempurna',
    description: 'Mendapatkan skor 100% pada kuis',
    icon: 'Star',
    category: 'quiz',
  },
  {
    id: 'cards_100',
    title: 'Master Flashcard',
    description: 'Mereview 100 kartu flashcard',
    icon: 'Layers',
    category: 'cards',
  },
  {
    id: 'swipe_master',
    title: 'Raja Geser',
    description: 'Mencapai combo 10 pada game kartu geser',
    icon: 'Sparkles',
    category: 'milestone',
  },
  {
    id: 'level_10',
    title: 'Master Konsep',
    description: 'Mencapai Level 10 petualangan belajar',
    icon: 'Award',
    category: 'xp',
  },
];

export function calculateLevelFromXP(totalXp: number): {
  level: number;
  currentLevelXp: number;
  xpNeededForNext: number;
  progressPercent: number;
  title: string;
} {
  let level = 1;
  let remainingXp = Math.max(0, totalXp);

  while (true) {
    const needed = 100 + (level - 1) * 50;
    if (remainingXp < needed) {
      const progressPercent = Math.min(100, Math.round((remainingXp / needed) * 100));
      return {
        level,
        currentLevelXp: remainingXp,
        xpNeededForNext: needed,
        progressPercent,
        title: getTitleForLevel(level),
      };
    }
    remainingXp -= needed;
    level += 1;
  }
}

export function getTitleForLevel(level: number): string {
  if (level >= 25) return 'Grandmaster Belajar';
  if (level >= 20) return 'Cendekiawan Agung';
  if (level >= 15) return 'Penyihir Wawasan';
  if (level >= 10) return 'Master Konsep';
  if (level >= 7) return 'Pendekar Catatan';
  if (level >= 5) return 'Pencari Jawaban';
  if (level >= 3) return 'Penjelajah Ilmu';
  if (level >= 2) return 'Pembaca Gigih';
  return 'Murid Baru';
}

export function triggerConfetti(reducedAnimations = false) {
  if (reducedAnimations || typeof window === 'undefined') return;
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#3B82F6'],
    });
  } catch (err) {
    // Ignore if not supported
  }
}

export function playSoundEffect(
  type: 'xp' | 'correct' | 'wrong' | 'levelup' | 'swipe' | 'quest' | 'click',
  soundEnabled = true
) {
  if (!soundEnabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'correct' || type === 'xp') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.3);
    } else if (type === 'wrong') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(160, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.25);
    } else if (type === 'levelup' || type === 'quest') {
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.09);
        gain.gain.setValueAtTime(0.18, now + index * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.09 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.09);
        osc.stop(now + index * 0.09 + 0.25);
      });
    } else if (type === 'swipe') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch (e) {
    // AudioContext blocked or not allowed until user gesture
  }
}

export function updateStreak(
  stats: UserStats,
  studyDays: number[] = [0, 1, 2, 3, 4, 5, 6]
): { streakCurrent: number; streakLongest: number; isFirstActivityToday: boolean } {
  const today = getTodayDateString();
  const lastActive = stats.lastActiveDate;

  if (lastActive === today) {
    return {
      streakCurrent: stats.streakCurrent,
      streakLongest: stats.streakLongest,
      isFirstActivityToday: false,
    };
  }

  if (!lastActive) {
    return {
      streakCurrent: 1,
      streakLongest: Math.max(1, stats.streakLongest || 1),
      isFirstActivityToday: true,
    };
  }

  // Calculate difference in calendar days
  const todayDate = new Date(today);
  const lastDate = new Date(lastActive);
  const diffTime = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 1) {
    const newStreak = stats.streakCurrent + 1;
    return {
      streakCurrent: newStreak,
      streakLongest: Math.max(newStreak, stats.streakLongest),
      isFirstActivityToday: true,
    };
  }

  // Check if skipped days were scheduled off-days
  let maintained = true;
  for (let i = 1; i < diffDays; i++) {
    const checkDate = new Date(lastDate);
    checkDate.setDate(checkDate.getDate() + i);
    const dayOfWeek = checkDate.getDay();
    if (studyDays.includes(dayOfWeek)) {
      maintained = false;
      break;
    }
  }

  const newStreak = maintained ? stats.streakCurrent + 1 : 1;
  return {
    streakCurrent: newStreak,
    streakLongest: Math.max(newStreak, stats.streakLongest),
    isFirstActivityToday: true,
  };
}
