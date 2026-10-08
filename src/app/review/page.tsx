'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, Sparkles, BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getAllDueFlashcards } from '@/lib/firebase/store';
import { FlashcardReview } from '@/components/flashcards/FlashcardReview';

export default function GlobalReviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [dueCards, setDueCards] = useState<{ noteTitle: string; card: any }[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      getAllDueFlashcards(user.uid).then((res) => {
        setDueCards(res);
        setIsLoadingCards(false);
      });
    }
  }, [user, loading, router]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--primary)]" /> Review Terjadwal Hari Ini
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Algoritma Spaced Repetition (SM-2) memunculkan kartu tepat saat memori mulai menurun untuk retensi maksimal.
          </p>
        </div>

        {isLoadingCards ? (
          <div className="quest-card p-12 text-center text-xs text-[var(--muted)]">
            Memuat kartu review terjadwal...
          </div>
        ) : dueCards.length === 0 ? (
          <div className="quest-card p-10 sm:p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--success)]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">
                Semua Kartu Sudah Selesai
              </h3>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                Tidak ada kartu yang jatuh tempo untuk direview saat ini. Anda dapat mempelajari materi baru atau mengulang kartu manual.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="btn-primary text-xs inline-flex items-center gap-2 py-2 px-4 font-semibold"
            >
              Kembali ke Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <FlashcardReview cards={dueCards} deckTitle="Review Terjadwal Hari Ini" />
        )}
      </div>
    </AppLayout>
  );
}
