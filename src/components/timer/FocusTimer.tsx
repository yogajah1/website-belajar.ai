'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, Pause, RotateCcw, X } from 'lucide-react';
import { playSoundEffect } from '@/lib/gamification';
import { useAuth } from '@/lib/firebase/authContext';

export const FocusTimer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const { profile } = useAuth();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playSoundEffect('levelup', profile?.soundEffects);
      if (mode === 'focus') {
        alert('Sesi fokus 25 menit selesai. Silakan istirahat 5 menit.');
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        alert('Waktu istirahat selesai. Siap melanjutkan belajar?');
        setMode('focus');
        setTimeLeft(25 * 60);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, profile?.soundEffects]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <>
      {/* Floating HUD Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-18 md:bottom-6 right-6 z-40 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] text-xs font-mono tabular-nums shadow-lg transition"
        title="Timer Fokus (Pomodoro)"
      >
        <Timer className={`w-3.5 h-3.5 text-[var(--primary)] ${isRunning ? 'animate-spin' : ''}`} />
        <span className="font-semibold">{formattedTime}</span>
      </button>

      {/* Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xs bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-2xl relative text-center"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-3 right-3 p-1 text-[var(--muted)] hover:text-[var(--text)] rounded-md"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--muted)] mb-3">
                <Timer className="w-4 h-4 text-[var(--primary)]" />
                <span>Timer Fokus</span>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--border)] mb-4">
                <button
                  onClick={() => {
                    setMode('focus');
                    setIsRunning(false);
                    setTimeLeft(25 * 60);
                  }}
                  className={`flex-1 py-1 rounded text-xs font-medium transition ${
                    mode === 'focus'
                      ? 'bg-[var(--surface)] text-[var(--text)] font-semibold shadow-xs'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  Fokus (25m)
                </button>
                <button
                  onClick={() => {
                    setMode('break');
                    setIsRunning(false);
                    setTimeLeft(5 * 60);
                  }}
                  className={`flex-1 py-1 rounded text-xs font-medium transition ${
                    mode === 'break'
                      ? 'bg-[var(--surface)] text-[var(--text)] font-semibold shadow-xs'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  Istirahat (5m)
                </button>
              </div>

              {/* Clock */}
              <div className="py-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] mb-4">
                <span className="text-4xl font-mono tabular-nums font-bold tracking-widest text-[var(--text)]">
                  {formattedTime}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={resetTimer}
                  className="btn-secondary py-2 px-3 text-xs"
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={toggleTimer}
                  className={`btn-primary flex-1 py-2 text-xs font-semibold ${
                    isRunning ? 'bg-amber-500 text-slate-900' : ''
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Jeda
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" /> Mulai
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
