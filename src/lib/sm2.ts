import { Flashcard, FlashcardRating } from '@/types';

export function calculateSM2(
  card: Pick<Flashcard, 'ease' | 'intervalDays' | 'repetitions'>,
  rating: FlashcardRating
): { ease: number; intervalDays: number; repetitions: number; dueDate: string } {
  let { ease, intervalDays, repetitions } = card;

  // Defaults if undefined
  ease = ease ?? 2.5;
  intervalDays = intervalDays ?? 0;
  repetitions = repetitions ?? 0;

  let nextInterval = 1;
  let nextRepetitions = repetitions;
  let nextEase = ease;

  if (rating === 'again') {
    nextRepetitions = 0;
    nextInterval = 1;
    nextEase = Math.max(1.3, ease - 0.2);
  } else if (rating === 'hard') {
    nextInterval = Math.max(1, Math.round(intervalDays * 1.2));
    nextEase = Math.max(1.3, ease - 0.15);
  } else if (rating === 'good') {
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 3;
    } else {
      nextInterval = Math.max(1, Math.round(intervalDays * ease));
    }
    nextRepetitions += 1;
  } else if (rating === 'easy') {
    if (repetitions === 0) {
      nextInterval = 2;
    } else if (repetitions === 1) {
      nextInterval = 4;
    } else {
      nextInterval = Math.max(1, Math.round(intervalDays * ease * 1.3));
    }
    nextRepetitions += 1;
    nextEase = ease + 0.15;
  }

  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + nextInterval);
  const dueDate = due.toISOString().split('T')[0];

  return {
    ease: Number(nextEase.toFixed(2)),
    intervalDays: nextInterval,
    repetitions: nextRepetitions,
    dueDate,
  };
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
