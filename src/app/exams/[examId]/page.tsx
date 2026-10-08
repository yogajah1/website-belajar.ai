'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getExamPredictionById } from '@/lib/firebase/store';
import { ExamPrediction } from '@/types';

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user, loading } = useAuth();

  const [exam, setExam] = useState<ExamPrediction | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user && examId) {
      getExamPredictionById(user.uid, examId).then(setExam);
    }
  }, [user, examId, loading, router]);

  const toggleReveal = (index: number) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  if (!exam && !loading) return null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between quest-card p-3.5">
          <Link
            href="/exams"
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Prediksi
          </Link>
          <span className="text-xs font-mono text-[var(--muted)]">
            {exam?.predictions?.length || 0} Soal
          </span>
        </div>

        {/* Exam Header Card */}
        <div className="quest-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] text-[10px] font-mono uppercase tracking-wider">
              Paket Prediksi Soal
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)] tracking-tight">
            {exam?.title}
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Gunakan soal prediksi ini untuk mengukur kesiapan menghadapi ujian. Buka kunci pembahasan saat Anda telah menjawab secara mandiri.
          </p>
        </div>

        {/* Predictions List */}
        <div className="space-y-3.5">
          {exam?.predictions.map((item, idx) => {
            const isRevealed = Boolean(revealedAnswers[idx]);

            return (
              <div
                key={item.id || idx}
                className="quest-card p-5 space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="px-2.5 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] font-mono font-medium text-xs">
                    Soal #{idx + 1}
                  </span>

                  <button
                    onClick={() => toggleReveal(idx)}
                    className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                  >
                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {isRevealed ? 'Sembunyikan Kunci' : 'Kunci & Pembahasan'}
                  </button>
                </div>

                <p className="text-xs sm:text-sm font-medium text-[var(--text)] leading-relaxed">
                  {item.question}
                </p>

                {item.options && item.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {item.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text)]"
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {/* Answer & Explanation Popover */}
                {isRevealed && (
                  <div className="p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--primary)]/40 text-xs leading-relaxed space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--primary)] text-xs">
                      <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                      <span>Kunci Jawaban: {item.answer}</span>
                    </div>
                    <div className="text-[11px] text-[var(--muted)] pt-1.5 border-t border-[var(--border)] leading-relaxed">
                      <span className="font-semibold text-[var(--text)]">Pembahasan: </span>
                      {item.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
