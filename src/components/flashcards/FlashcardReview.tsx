'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { Flashcard, FlashcardRating } from '@/types';
import { calculateSM2 } from '@/lib/sm2';
import { useAuth } from '@/lib/firebase/authContext';
import { saveFlashcard, recordDailyActivity } from '@/lib/firebase/store';
import { playSoundEffect, triggerConfetti } from '@/lib/gamification';

interface FlashcardReviewProps {
  cards: { noteTitle?: string; card: Flashcard }[];
  deckTitle?: string;
  onFinish?: () => void;
}

export const FlashcardReview: React.FC<FlashcardReviewProps> = ({
  cards,
  deckTitle = 'Flashcards',
  onFinish,
}) => {
  const { user, profile, awardXP } = useAuth();
  const [deck, setDeck] = useState(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentItem = deck[currentIndex];
  const currentCard = currentItem?.card;

  const handleRate = async (rating: FlashcardRating) => {
    if (!currentCard || !user) return;

    // Calculate SM-2
    const sm2Result = calculateSM2(
      {
        ease: currentCard.ease,
        intervalDays: currentCard.intervalDays,
        repetitions: currentCard.repetitions,
      },
      rating
    );

    const updatedCard: Flashcard = {
      ...currentCard,
      ...sm2Result,
      lastReviewedAt: Date.now(),
    };

    await saveFlashcard(user.uid, currentCard.noteId, updatedCard);
    await awardXP(2, 'Review 1 flashcard');
    await recordDailyActivity(user.uid, { xpEarned: 2, cardsReviewed: 1 });
    playSoundEffect('xp', profile?.soundEffects);

    setReviewedCount((prev) => prev + 1);
    setIsFlipped(false);

    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      triggerConfetti(profile?.reducedAnimations);
      if (onFinish) onFinish();
    }
  };

  if (isFinished || deck.length === 0) {
    return (
      <div className="quest-card p-6 sm:p-8 max-w-md mx-auto text-center space-y-5">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--reward)]">
          <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-[var(--text)] tracking-tight">
            Review Kartu Selesai
          </h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {deckTitle}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2 text-xs">
          <div className="flex justify-between items-center text-[var(--muted)]">
            <span>Kartu Dipelajari:</span>
            <span className="font-mono font-bold text-[var(--text)]">{reviewedCount} Kartu</span>
          </div>
          <div className="flex justify-between items-center text-[var(--muted)]">
            <span>XP Diperoleh:</span>
            <span className="font-mono font-bold text-[var(--reward)]">+{reviewedCount * 2} XP</span>
          </div>
        </div>

        <button
          onClick={() => {
            setCurrentIndex(0);
            setIsFlipped(false);
            setReviewedCount(0);
            setIsFinished(false);
          }}
          className="w-full btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5 font-medium"
        >
          <RotateCcw className="w-4 h-4" /> Ulangi Sesi
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center">
      {/* Deck Header */}
      <div className="w-full flex items-center justify-between mb-4 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] font-mono font-medium">
            Kartu {currentIndex + 1} / {deck.length}
          </span>
          {currentItem?.noteTitle && (
            <span className="text-[11px] text-[var(--muted)] truncate max-w-[150px]">
              {currentItem.noteTitle}
            </span>
          )}
        </div>

        <div className="text-[11px] font-mono text-[var(--reward)] flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> +2 XP
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full h-80 perspective-1000 cursor-pointer select-none"
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full relative preserve-3d"
        >
          {/* Card Front */}
          <div className="absolute inset-0 backface-hidden p-6 sm:p-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:border-[var(--muted)] transition flex flex-col justify-between items-center text-center">
            <span className="px-2.5 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] text-[10px] font-mono uppercase tracking-wider">
              Pertanyaan / Konsep
            </span>

            <p className="text-base sm:text-lg font-semibold text-[var(--text)] leading-relaxed px-2">
              {currentCard.front}
            </p>

            <span className="text-[11px] text-[var(--muted)] flex items-center gap-1 font-mono">
              Ketuk untuk melihat jawaban
            </span>
          </div>

          {/* Card Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 p-6 sm:p-8 rounded-xl bg-[var(--surface-2)] border border-[var(--primary)]/40 shadow-sm flex flex-col justify-between items-center text-center">
            <span className="px-2.5 py-0.5 rounded-md bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-[10px] font-mono uppercase tracking-wider">
              Jawaban & Penjelasan
            </span>

            <div className="text-sm font-medium text-[var(--text)] leading-relaxed max-h-44 overflow-y-auto px-2">
              {currentCard.back}
            </div>

            <span className="text-[11px] text-[var(--muted)] font-mono">
              Evaluasi ingatan Anda di bawah
            </span>
          </div>
        </motion.div>
      </div>

      {/* SM-2 Rating Buttons (Shown after flipped) */}
      <div className="w-full mt-4">
        {isFlipped ? (
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleRate('again')}
              className="py-2.5 px-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--border)] hover:border-[var(--danger)] text-xs font-medium transition flex flex-col items-center"
            >
              <span className="font-semibold">Lupa</span>
              <span className="text-[10px] opacity-70 font-mono">&lt;1 hr</span>
            </button>

            <button
              onClick={() => handleRate('hard')}
              className="py-2.5 px-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--reward)]/15 text-[var(--reward)] border border-[var(--border)] hover:border-[var(--reward)] text-xs font-medium transition flex flex-col items-center"
            >
              <span className="font-semibold">Sulit</span>
              <span className="text-[10px] opacity-70 font-mono">+1-2 hr</span>
            </button>

            <button
              onClick={() => handleRate('good')}
              className="py-2.5 px-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--border)] hover:border-[var(--primary)] text-xs font-medium transition flex flex-col items-center"
            >
              <span className="font-semibold">Bagus</span>
              <span className="text-[10px] opacity-70 font-mono">+4 hr</span>
            </button>

            <button
              onClick={() => handleRate('easy')}
              className="py-2.5 px-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--success)]/15 text-[var(--success)] border border-[var(--border)] hover:border-[var(--success)] text-xs font-medium transition flex flex-col items-center"
            >
              <span className="font-semibold">Mudah</span>
              <span className="text-[10px] opacity-70 font-mono">+7 hr</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsFlipped(true)}
            className="w-full btn-secondary py-2.5 text-xs font-semibold"
          >
            Buka Jawaban
          </button>
        )}
      </div>
    </div>
  );
};
