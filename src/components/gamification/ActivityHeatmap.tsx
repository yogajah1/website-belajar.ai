'use client';

import React, { useState, useEffect } from 'react';
import { DailyActivity } from '@/types';

interface ActivityHeatmapProps {
  activities: DailyActivity[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activities }) => {
  const [heatmapData, setHeatmapData] = useState<{
    weeks: { dateStr: string; count: number; date: Date }[][];
    activityMap: Map<string, DailyActivity>;
  }>({
    weeks: [],
    activityMap: new Map(),
  });

  useEffect(() => {
    const map = new Map<string, DailyActivity>();
    activities.forEach((act) => map.set(act.id, act));

    const today = new Date();
    const daysToShow = 52 * 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToShow + 1);

    const weeksArray: { dateStr: string; count: number; date: Date }[][] = [];
    let currentWeek: { dateStr: string; count: number; date: Date }[] = [];

    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const act = map.get(dateStr);
      const intensity = act ? Math.min(4, Math.ceil((act.xpEarned || 1) / 15)) : 0;

      currentWeek.push({ dateStr, count: intensity, date: d });

      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) weeksArray.push(currentWeek);

    setHeatmapData({ weeks: weeksArray, activityMap: map });
  }, [activities]);

  const getColorClass = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-purple-200 dark:bg-purple-950 border-purple-300 dark:border-purple-800';
      case 2:
        return 'bg-purple-400 dark:bg-purple-800 border-purple-500 dark:border-purple-700';
      case 3:
        return 'bg-purple-600 dark:bg-purple-600 border-purple-700 dark:border-purple-500';
      case 4:
        return 'bg-amber-400 dark:bg-amber-500 border-amber-500 dark:border-amber-400 shadow-xs';
      default:
        return 'bg-slate-100 dark:bg-[#1E2337] border-slate-200 dark:border-slate-800/80';
    }
  };

  if (heatmapData.weeks.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-slate-400">
        Memuat data aktivitas...
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="min-w-[700px] flex flex-col gap-1">
        <div className="flex gap-1">
          {heatmapData.weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((dayItem) => {
                const act = heatmapData.activityMap.get(dayItem.dateStr);
                const titleText = `${dayItem.dateStr}: ${
                  act
                    ? `${act.xpEarned} XP diperoleh (${act.quizzesDone || 0} kuis, ${
                        act.cardsReviewed || 0
                      } kartu)`
                    : 'Belum ada aktivitas'
                }`;

                return (
                  <div
                    key={dayItem.dateStr}
                    title={titleText}
                    className={`w-3.5 h-3.5 rounded-xs border transition-colors cursor-pointer hover:scale-125 ${getColorClass(
                      dayItem.count
                    )}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
          <span>Sedikit</span>
          <div className="w-3 h-3 rounded-xs bg-slate-100 dark:bg-[#1E2337] border border-slate-300 dark:border-slate-800" />
          <div className="w-3 h-3 rounded-xs bg-purple-200 dark:bg-purple-950 border border-purple-300" />
          <div className="w-3 h-3 rounded-xs bg-purple-400 dark:bg-purple-800 border border-purple-500" />
          <div className="w-3 h-3 rounded-xs bg-purple-600 dark:bg-purple-600 border border-purple-700" />
          <div className="w-3 h-3 rounded-xs bg-amber-400 dark:bg-amber-500 border border-amber-500" />
          <span>Banyak Aktivitas</span>
        </div>
      </div>
    </div>
  );
};
