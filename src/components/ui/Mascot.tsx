'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MascotProps {
  mood?: 'happy' | 'thinking' | 'celebrating' | 'study' | 'curious';
  size?: 'sm' | 'md' | 'lg';
  speech?: string;
  className?: string;
}

export const Mascot: React.FC<MascotProps> = ({
  mood = 'happy',
  size = 'md',
  speech,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12 text-2xl',
    md: 'w-20 h-20 text-4xl',
    lg: 'w-32 h-32 text-6xl',
  };

  const getEmoji = () => {
    switch (mood) {
      case 'celebrating':
        return '🎉🦉';
      case 'thinking':
        return '🧐✨';
      case 'study':
        return '📖🦉';
      case 'curious':
        return '💡🦉';
      default:
        return '🦉';
    }
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {speech && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative bg-white dark:bg-[#1E2337] border-2 border-purple-500/30 dark:border-purple-400/40 text-sm font-medium px-4 py-2 rounded-2xl shadow-md max-w-xs text-center mb-1 text-slate-800 dark:text-slate-100"
        >
          {speech}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-[#1E2337] border-r-2 border-b-2 border-purple-500/30 dark:border-purple-400/40 rotate-45" />
        </motion.div>
      )}

      <motion.div
        animate={{
          y: mood === 'celebrating' ? [-4, 4, -4] : [-2, 2, -2],
          rotate: mood === 'curious' ? [-4, 4, -4] : 0,
        }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        className={`relative flex items-center justify-center rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-amber-400 p-1 shadow-lg shadow-purple-500/20 ${sizeClasses[size]}`}
      >
        <div className="w-full h-full bg-white dark:bg-[#161928] rounded-[1.3rem] flex items-center justify-center">
          <span className="select-none filter drop-shadow">{getEmoji()}</span>
        </div>
      </motion.div>
    </div>
  );
};
