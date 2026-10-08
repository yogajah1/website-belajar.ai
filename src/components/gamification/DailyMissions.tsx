'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Target } from 'lucide-react';
import { DailyMission } from '@/types';
import { useAuth } from '@/lib/firebase/authContext';
import { recordDailyActivity } from '@/lib/firebase/store';

export const DailyMissions: React.FC = () => {
  const { user, awardXP } = useAuth();
  const [missions, setMissions] = useState<DailyMission[]>([
    {
      id: 'm1',
      title: 'Baca 1 Bab Materi',
      description: 'Tandai selesai atau pelajari 1 bab materi',
      target: 1,
      progress: 0,
      xpReward: 15,
      isCompleted: false,
      claimed: false,
    },
    {
      id: 'm2',
      title: 'Tuntaskan 1 Sesi Kuis',
      description: 'Selesaikan minimal 1 sesi latihan kuis',
      target: 1,
      progress: 0,
      xpReward: 15,
      isCompleted: false,
      claimed: false,
    },
    {
      id: 'm3',
      title: 'Review 5 Flashcard',
      description: 'Review kartu hafalan terjadwal',
      target: 5,
      progress: 0,
      xpReward: 15,
      isCompleted: false,
      claimed: false,
    },
  ]);

  useEffect(() => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`bq_missions_${user.uid}_${today}`);
      if (saved) {
        setMissions(JSON.parse(saved));
      }
    } catch (e) {}
  }, [user]);

  const handleClaim = async (missionId: string) => {
    const updated = missions.map((m) => {
      if (m.id === missionId) {
        return { ...m, claimed: true };
      }
      return m;
    });
    setMissions(updated);

    const m = missions.find((item) => item.id === missionId);
    if (m && user) {
      await awardXP(m.xpReward, `Daily Quest: ${m.title}`);
      await recordDailyActivity(user.uid, { xpEarned: m.xpReward });
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(`bq_missions_${user.uid}_${today}`, JSON.stringify(updated));
    }
  };

  const completedCount = missions.filter((m) => m.progress >= m.target).length;

  return (
    <div className="quest-card p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-500 dark:text-[#F5B82E]" />
          <h3 className="font-bold text-sm text-[var(--text)]">
            Daily Quests
          </h3>
        </div>
        <span className="text-xs font-mono tabular-nums text-[var(--muted)]">
          {completedCount}/{missions.length} Selesai
        </span>
      </div>

      <div className="space-y-2.5">
        {missions.map((mission) => {
          const isDone = mission.progress >= mission.target;

          return (
            <div
              key={mission.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--muted)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-[var(--text)] truncate">
                      {mission.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] truncate">
                    {mission.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-20 h-1 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 dark:bg-[#F5B82E] rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (mission.progress / mission.target) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-[var(--muted)]">
                      {mission.progress}/{mission.target}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {mission.claimed ? (
                  <span className="px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                    Klaim ✓
                  </span>
                ) : isDone ? (
                  <button
                    onClick={() => handleClaim(mission.id)}
                    className="btn-reward py-1 px-2.5 text-xs font-bold"
                  >
                    Ambil +{mission.xpReward} XP
                  </button>
                ) : (
                  <span className="text-[11px] font-mono font-semibold text-amber-500 dark:text-[#F5B82E]">
                    +{mission.xpReward} XP
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
