'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  Layers,
  Gamepad2,
  BrainCircuit,
  CheckCircle2,
  Circle,
  ArrowRight,
  Trash2,
  Play,
  ArrowLeft,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getNoteById, getChapters, getSubjects, deleteNote } from '@/lib/firebase/store';
import { Note, Chapter, Subject } from '@/types';

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.noteId as string;
  const { user, loading } = useAuth();

  const [note, setNote] = useState<Note | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user && noteId) {
      const load = async () => {
        const [n, chs, subs] = await Promise.all([
          getNoteById(user.uid, noteId),
          getChapters(user.uid, noteId),
          getSubjects(user.uid),
        ]);
        setNote(n);
        setChapters(chs);
        if (n?.subjectId) {
          const s = subs.find((sub) => sub.id === n.subjectId);
          if (s) setSubject(s);
        }
      };
      load();
    }
  }, [user, noteId, loading, router]);

  const handleDelete = async () => {
    if (!user || !note) return;
    if (confirm(`Hapus catatan "${note.title}"?`)) {
      await deleteNote(user.uid, note.id);
      router.push('/dashboard');
    }
  };

  if (!note && !loading) {
    return (
      <AppLayout>
        <div className="quest-card p-10 text-center max-w-md mx-auto space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">Catatan Tidak Ditemukan</h3>
          <Link href="/dashboard" className="btn-secondary py-2 px-4 text-xs inline-flex">
            Kembali ke Dasbor
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!note) return null;

  const completedCount = chapters.filter((c) => c.completed).length;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Dasbor
          </Link>

          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition"
            title="Hapus Catatan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Note Hero Card */}
        <div className="quest-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)] uppercase tracking-wider">
              {subject?.name || 'Umum'}
            </span>
            <span className="text-xs font-mono tabular-nums text-[var(--muted)]">
              {note.chapterCount || chapters.length} Bab
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] tracking-tight">
              {note.title}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
              {note.description}
            </p>
          </div>

          {/* Mastery vs Target Bar */}
          <div className="pt-3 border-t border-[var(--border)] space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[var(--muted)]">
                Penguasaan:{' '}
                <span className="font-mono tabular-nums font-bold text-[var(--text)]">
                  {note.mastery || 0}%
                </span>
              </span>
              <span className="text-[var(--muted)] font-mono tabular-nums">
                Target: {note.settings?.targetPercent || 85}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-[var(--primary)] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, note.mastery || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3 Quick Action Modes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href={`/notes/${note.id}/quiz`}
            className="quest-card quest-card-hover p-4 flex flex-col justify-between group"
          >
            <div>
              <div className="p-2 rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)] inline-block mb-2">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-xs text-[var(--text)] group-hover:text-[var(--primary)]">
                Sesi Kuis
              </h4>
              <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
                Pilihan ganda, benar/salah & esai dinilai AI.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[var(--primary)] mt-3 flex items-center gap-1">
              Mulai Kuis <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </span>
          </Link>

          <Link
            href={`/notes/${note.id}/swipe`}
            className="quest-card quest-card-hover p-4 flex flex-col justify-between group"
          >
            <div>
              <div className="p-2 rounded-lg bg-[var(--reward-subtle)] text-amber-500 dark:text-[#F5B82E] inline-block mb-2">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-xs text-[var(--text)] group-hover:text-amber-500">
                Kartu Geser
              </h4>
              <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
                Tebak cepat benar/salah dengan kombo streak.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-amber-500 dark:text-[#F5B82E] mt-3 flex items-center gap-1">
              Mulai Geser <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </span>
          </Link>

          <Link
            href={`/notes/${note.id}/flashcards`}
            className="quest-card quest-card-hover p-4 flex flex-col justify-between group"
          >
            <div>
              <div className="p-2 rounded-lg bg-[var(--success-subtle)] text-[var(--success)] inline-block mb-2">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-xs text-[var(--text)] group-hover:text-[var(--success)]">
                Flashcard SM-2
              </h4>
              <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
                Hafalan interval berjarak cerdas.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[var(--success)] mt-3 flex items-center gap-1">
              Buka Kartu <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </span>
          </Link>
        </div>

        {/* Quest Path: Vertical Connected Chapter Timeline */}
        <div className="quest-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--primary)]" /> Jalur Quest Bab
            </h3>
            <span className="text-xs font-mono tabular-nums text-[var(--muted)]">
              {completedCount}/{chapters.length} Selesai
            </span>
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-[var(--border)]">
            {chapters.map((chap, idx) => {
              const isFirstIncomplete = !chap.completed && chapters.slice(0, idx).every((c) => c.completed);

              return (
                <div key={chap.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-6 top-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border transition ${
                      chap.completed
                        ? 'bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success)]'
                        : isFirstIncomplete
                        ? 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]'
                        : 'bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]'
                    }`}
                  >
                    {chap.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                    ) : isFirstIncomplete ? (
                      <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                    ) : (
                      chap.order
                    )}
                  </div>

                  {/* Chapter Row Link */}
                  <Link
                    href={`/notes/${note.id}/chapter/${chap.id}`}
                    className="block p-3 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--border)] border border-[var(--border)] hover:border-[var(--primary)] transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[var(--text)] group-hover:text-[var(--primary)] truncate">
                            {chap.title}
                          </span>
                          {chap.completed && (
                            <span className="text-[10px] font-medium text-[var(--success)]">
                              Selesai
                            </span>
                          )}
                          {isFirstIncomplete && (
                            <span className="text-[10px] font-semibold text-[var(--primary)]">
                              Sedang Dipelajari
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate">
                          {chap.sourceText || 'Buka untuk membaca penjelasan.'}
                        </p>
                      </div>

                      <ArrowRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--primary)] shrink-0 group-hover:translate-x-0.5 transition" />
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
