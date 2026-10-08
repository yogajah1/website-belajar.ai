'use client';

import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Flame,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import { SwipeStatement } from '@/types';
import { useAuth } from '@/lib/firebase/authContext';
import { recordDailyActivity } from '@/lib/firebase/store';
import { playSoundEffect, triggerConfetti } from '@/lib/gamification';

interface SwipeCardGameProps {
  statements: SwipeStatement[];
  noteTitle?: string;
  onFinish?: () => void;
}

export const SwipeCardGame: React.FC<SwipeCardGameProps> = ({
  statements,
  noteTitle = 'Materi',
  onFinish,
}) => {
  const { user, profile, awardXP } = useAuth();
  const [deck, setDeck] = useState<SwipeStatement[]>(statements);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Feedback state for card
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [revealedExplanation, setRevealedExplanation] = useState<string | null>(null);

  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const currentCard = deck[currentIndex];

  // Motion values for swipe drag
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const opacityRight = useTransform(x, [20, 150], [0, 1]);
  const opacityLeft = useTransform(x, [-20, -150], [0, 1]);

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || gameWon || feedback) return;
      if (e.key === 'ArrowRight') handleAnswer(true);
      if (e.key === 'ArrowLeft') handleAnswer(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, feedback, gameOver, gameWon, lives, combo]);

  const handleAnswer = async (userGuessIsTrue: boolean) => {
    if (!currentCard || feedback) return;

    const isGuessCorrect = userGuessIsTrue === currentCard.isTrue;

    if (isGuessCorrect) {
      playSoundEffect('correct', profile?.soundEffects);
      setFeedback('correct');
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo((prev) => Math.max(prev, newCombo));
      setCorrectCount((prev) => prev + 1);
    } else {
      playSoundEffect('wrong', profile?.soundEffects);
      setFeedback('wrong');
      setCombo(0);
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        setGameOver(true);
      }
    }

    setRevealedExplanation(currentCard.explanation);
  };

  const handleNextCard = async () => {
    setFeedback(null);
    setRevealedExplanation(null);
    x.set(0);

    if (currentIndex + 1 < deck.length && lives > 0) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Victory / End of deck
      setGameWon(true);
      const comboBonus = Math.min(10, maxCombo);
      const xpEarned = 15 + comboBonus;

      await awardXP(xpEarned, `Menyelesaikan game kartu geser (Combo max: ${maxCombo})`);
      if (user) {
        await recordDailyActivity(user.uid, { xpEarned });
      }
      triggerConfetti(profile?.reducedAnimations);
      if (onFinish) onFinish();
    }
  };

  const resetGame = () => {
    setDeck(statements);
    setCurrentIndex(0);
    setLives(3);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setFeedback(null);
    setRevealedExplanation(null);
    setGameOver(false);
    setGameWon(false);
    x.set(0);
  };

  if (gameOver || gameWon) {
    const isWin = gameWon;
    const comboBonus = Math.min(10, maxCombo);
    const totalXp = isWin ? 15 + comboBonus : 5;

    return (
      <div className="quest-card p-6 sm:p-8 max-w-md mx-auto text-center space-y-5">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--reward)]">
          {isWin ? <Trophy className="w-6 h-6 text-[var(--reward)]" /> : <X className="w-6 h-6 text-[var(--danger)]" />}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-[var(--text)] tracking-tight">
            {isWin ? 'Sesi Latihan Selesai' : 'Kesempatan Habis'}
          </h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {noteTitle}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-[var(--muted)]">
            <span>Pernyataan Tepat:</span>
            <span className="font-mono font-bold text-[var(--success)]">{correctCount} / {deck.length}</span>
          </div>
          <div className="flex justify-between items-center text-[var(--muted)]">
            <span>Kombo Maksimal:</span>
            <span className="font-mono font-bold text-[var(--reward)]">{maxCombo}x</span>
          </div>
          <div className="pt-2 border-t border-[var(--border)] flex justify-between items-center font-medium text-[var(--text)]">
            <span>Hadiah XP:</span>
            <span className="font-mono font-bold text-[var(--reward)]">+{totalXp} XP</span>
          </div>
        </div>

        <button
          onClick={resetGame}
          className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-1.5 font-semibold"
        >
          <RotateCcw className="w-4 h-4" /> Ulangi Sesi
        </button>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="max-w-md mx-auto flex flex-col items-center">
      {/* Game Stats Header: Lives & Combo */}
      <div className="w-full flex items-center justify-between px-1 mb-4 text-xs">
        {/* Lives */}
        <div className="flex items-center gap-1.5">
          {[...Array(3)].map((_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 transition-colors ${
                i < lives ? 'text-[var(--danger)] fill-[var(--danger)]' : 'text-[var(--muted)]/40'
              }`}
            />
          ))}
        </div>

        {/* Combo Counter */}
        {combo > 1 && (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--reward)]/15 border border-[var(--reward)]/30 text-[var(--reward)] text-[11px] font-mono font-bold">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{combo}x Combo</span>
          </div>
        )}

        {/* Card Index */}
        <span className="text-[11px] font-mono text-[var(--muted)]">
          {currentIndex + 1} / {deck.length}
        </span>
      </div>

      {/* The Swipeable Card Container */}
      <div className="relative w-full h-72 flex items-center justify-center">
        <motion.div
          style={{ x, rotate }}
          drag={feedback ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (feedback) return;
            if (info.offset.x > 80) {
              handleAnswer(true); // Swipe Right = True
            } else if (info.offset.x < -80) {
              handleAnswer(false); // Swipe Left = False
            }
          }}
          className={`relative w-full h-full p-6 rounded-xl bg-[var(--surface)] border flex flex-col justify-between cursor-grab active:cursor-grabbing select-none transition-all duration-200 ${
            feedback === 'correct'
              ? 'border-[var(--success)] shadow-[0_0_15px_rgba(52,211,153,0.25)]'
              : feedback === 'wrong'
              ? 'border-[var(--danger)] shadow-[0_0_15px_rgba(248,113,113,0.25)]'
              : 'border-[var(--border)] hover:border-[var(--muted)]'
          }`}
        >
          {/* Visual Swiping Overlay Indicators */}
          <motion.div
            style={{ opacity: opacityRight }}
            className="absolute top-3.5 right-3.5 px-3 py-1 rounded-lg bg-[var(--success)] text-slate-950 font-mono font-bold text-xs pointer-events-none"
          >
            BENAR
          </motion.div>
          <motion.div
            style={{ opacity: opacityLeft }}
            className="absolute top-3.5 left-3.5 px-3 py-1 rounded-lg bg-[var(--danger)] text-white font-mono font-bold text-xs pointer-events-none"
          >
            SALAH
          </motion.div>

          {/* Statement Prompt */}
          <div className="flex-1 flex flex-col justify-center items-center text-center px-2">
            <span className="text-[10px] uppercase font-mono text-[var(--muted)] mb-3 tracking-wider">
              Pernyataan #{currentIndex + 1}
            </span>
            <p className="text-sm sm:text-base font-medium text-[var(--text)] leading-relaxed">
              &ldquo;{currentCard.statement}&rdquo;
            </p>
          </div>

          {/* Card footer instruction */}
          <p className="text-[10px] text-center text-[var(--muted)] font-mono">
            {feedback
              ? 'Tekan tombol lanjut di bawah'
              : 'Geser Kanan = Benar  |  Geser Kiri = Salah'}
          </p>
        </motion.div>
      </div>

      {/* Explanation Popover if answered */}
      <AnimatePresence>
        {feedback && revealedExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`w-full mt-3 p-3.5 rounded-lg border text-xs leading-relaxed ${
              feedback === 'correct'
                ? 'bg-[var(--surface-2)] border-[var(--success)]/40 text-[var(--text)]'
                : 'bg-[var(--surface-2)] border-[var(--danger)]/40 text-[var(--text)]'
            }`}
          >
            <div className="font-semibold flex items-center gap-1.5 mb-1">
              <span className={feedback === 'correct' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                {feedback === 'correct' ? 'Tepat' : 'Kurang Tepat'} (Kunci: {currentCard.isTrue ? 'Benar' : 'Salah'})
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">{revealedExplanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Controls for Desktop & Mobile */}
      <div className="w-full flex items-center justify-center gap-3 mt-4">
        {!feedback ? (
          <>
            <button
              onClick={() => handleAnswer(false)}
              className="flex-1 py-2.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--border)] hover:border-[var(--danger)] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <X className="w-4 h-4" /> SALAH (Kiri)
            </button>
            <button
              onClick={() => handleAnswer(true)}
              className="flex-1 py-2.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--success)]/15 text-[var(--success)] border border-[var(--border)] hover:border-[var(--success)] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Check className="w-4 h-4" /> BENAR (Kanan)
            </button>
          </>
        ) : (
          <button
            onClick={handleNextCard}
            className="w-full btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            Kartu Berikutnya <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
