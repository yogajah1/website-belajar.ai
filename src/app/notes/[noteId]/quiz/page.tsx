'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BrainCircuit, RotateCcw, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getNoteById, getQuizzes, getChapters } from '@/lib/firebase/store';
import { Note, Quiz, Chapter } from '@/types';
import { QuizComponent } from '@/components/quiz/QuizComponent';

export default function NoteQuizPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.noteId as string;
  const { user, loading } = useAuth();

  const [note, setNote] = useState<Note | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user && noteId) {
      const load = async () => {
        const [n, qzs, chs] = await Promise.all([
          getNoteById(user.uid, noteId),
          getQuizzes(user.uid, noteId),
          getChapters(user.uid, noteId),
        ]);
        setNote(n);
        setQuizzes(qzs);
        setChapters(chs);
      };
      load();
    }
  }, [user, noteId, loading, router]);

  if (!note && !loading) {
    return (
      <AppLayout>
        <div className="text-center py-16 quest-card max-w-md mx-auto">
          <BrainCircuit className="w-10 h-10 mx-auto text-[var(--muted)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--text)]">Catatan Tidak Ditemukan</h3>
          <Link href="/dashboard" className="btn-secondary text-xs inline-block mt-4">
            Kembali ke Dashboard
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!note) return null;

  // Combine questions based on selected chapter
  const activeQuestions = quizzes
    .filter((q) => selectedChapterId === 'all' || q.chapterId === selectedChapterId)
    .flatMap((q) => q.questions);

  const combinedQuiz: Quiz = {
    id: `quiz_combined_${noteId}_${selectedChapterId}`,
    noteId,
    chapterId: selectedChapterId === 'all' ? null : selectedChapterId,
    difficulty: note.settings?.difficulty || 'medium',
    questions: activeQuestions,
    createdAt: Date.now(),
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 quest-card p-3.5">
          <Link
            href={`/notes/${noteId}`}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Alur Quest
          </Link>

          {/* Chapter Filter */}
          {chapters.length > 1 && (
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-hidden focus:border-[var(--primary)] font-medium"
            >
              <option value="all">Semua Bab ({activeQuestions.length} Soal)</option>
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  Bab {ch.order}: {ch.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {activeQuestions.length === 0 ? (
          <div className="quest-card p-12 text-center">
            <BrainCircuit className="w-10 h-10 mx-auto text-[var(--muted)] mb-3" />
            <h3 className="text-base font-semibold text-[var(--text)]">
              Belum Ada Soal Uji Pemahaman
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              Soal evaluasi belum tersedia untuk bagian ini.
            </p>
            <Link
              href={`/notes/${noteId}`}
              className="btn-secondary text-xs inline-flex items-center gap-2 py-2 px-4 mt-4"
            >
              Kembali ke Catatan
            </Link>
          </div>
        ) : (
          <QuizComponent quiz={combinedQuiz} noteTitle={note.title} />
        )}
      </div>
    </AppLayout>
  );
}
