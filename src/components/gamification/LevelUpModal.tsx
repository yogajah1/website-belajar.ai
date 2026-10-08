'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';

export const LevelUpModal: React.FC = () => {
  const { levelUpData, dismissLevelUp, profile } = useAuth();

  if (!levelUpData) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: profile?.reducedAnimations ? 0.05 : 0.15, ease: 'easeOut' }}
          className="w-full max-w-sm bg-[var(--surface)] border border-amber-500/40 rounded-xl p-6 text-center shadow-2xl relative"
        >
          {/* Hexagon Shield Icon */}
          <div className="w-14 h-14 mx-auto rounded-xl bg-[var(--reward-subtle)] border border-amber-500/30 text-amber-500 dark:text-[#F5B82E] flex items-center justify-center mb-3 glow-reward">
            <Shield className="w-7 h-7 fill-current" />
          </div>

          <p className="text-[11px] font-mono uppercase tracking-widest font-bold text-amber-500 dark:text-[#F5B82E]">
            Level Up
          </p>
          <h2 className="text-2xl font-bold text-[var(--text)] mt-0.5">
            Level {levelUpData.newLevel}
          </h2>
          <p className="text-xs text-[var(--muted)] font-medium mt-1">
            Gelar: <span className="text-[var(--text)] font-semibold">&ldquo;{levelUpData.title}&rdquo;</span>
          </p>

          <p className="text-xs text-[var(--muted)] mt-4 leading-relaxed">
            Pencapaian baru terbuka. Terus lanjutkan jalur quest belajarmu.
          </p>

          <button
            onClick={dismissLevelUp}
            className="w-full btn-reward py-2.5 mt-5 text-xs font-bold"
          >
            Lanjutkan Quest <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
