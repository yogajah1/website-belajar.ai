'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  BookOpen,
  ArrowLeft,
  Save,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getNoteById, getChapters, getChapterById, saveChapter, recordDailyActivity } from '@/lib/firebase/store';
import { Note, Chapter } from '@/types';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { triggerConfetti } from '@/lib/gamification';

export default function ChapterReaderPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.noteId as string;
  const chapterId = params.chapterId as string;
  const { user, profile, awardXP, loading } = useAuth();

  const [note, setNote] = useState<Note | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [editedHtml, setEditedHtml] = useState('');
  const [isSaved, setIsSaved] = useState(true);

  // Chat panel state
  const [showChatPanel, setShowChatPanel] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user && noteId && chapterId) {
      const load = async () => {
        const [n, chs, c] = await Promise.all([
          getNoteById(user.uid, noteId),
          getChapters(user.uid, noteId),
          getChapterById(user.uid, noteId, chapterId),
        ]);
        setNote(n);
        setChapters(chs);
        setCurrentChapter(c);
        if (c) setEditedHtml(c.contentHtml);
      };
      load();
    }
  }, [user, noteId, chapterId, loading, router]);

  const currentIndex = chapters.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  const handleContentChange = (html: string) => {
    setEditedHtml(html);
    setIsSaved(false);
  };

  const handleManualSave = async () => {
    if (!user || !currentChapter) return;
    const updated: Chapter = {
      ...currentChapter,
      contentHtml: editedHtml,
      updatedAt: Date.now(),
    };
    await saveChapter(user.uid, noteId, updated);
    setCurrentChapter(updated);
    setIsSaved(true);
  };

  const handleMarkCompleted = async () => {
    if (!user || !currentChapter) return;
    const nextCompleted = !currentChapter.completed;

    const updated: Chapter = {
      ...currentChapter,
      completed: nextCompleted,
      contentHtml: editedHtml || currentChapter.contentHtml,
      updatedAt: Date.now(),
    };
    await saveChapter(user.uid, noteId, updated);
    setCurrentChapter(updated);

    if (nextCompleted) {
      await awardXP(10, `Menyelesaikan Bab: ${currentChapter.title}`);
      await recordDailyActivity(user.uid, { xpEarned: 10 });
      triggerConfetti(profile?.reducedAnimations);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const allChaptersText = useMemo(() => {
    return chapters.map((c) => `${c.title}:\n${c.contentHtml.replace(/<[^>]*>?/gm, ' ')}`).join('\n\n');
  }, [chapters]);

  if (!currentChapter && !loading) {
    return (
      <AppLayout>
        <div className="text-center py-16 quest-card max-w-md mx-auto">
          <BookOpen className="w-10 h-10 mx-auto text-[var(--muted)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--text)]">Bab Tidak Ditemukan</h3>
          <p className="text-xs text-[var(--muted)] mt-1 mb-4">Bab yang Anda cari mungkin telah dihapus atau dipindahkan.</p>
          <Link href={`/notes/${noteId}`} className="btn-secondary text-xs">
            Kembali ke Catatan
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!currentChapter) return null;

  return (
    <AppLayout>
      <div className="flex gap-6 max-w-7xl mx-auto">
        {/* Main Chapter Content Area */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Top Navigation & Action Bar (Hidden in Print) */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 quest-card p-3.5">
            <Link
              href={`/notes/${noteId}`}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Alur Quest
            </Link>

            <div className="flex items-center gap-2">
              {/* Save changes indicator */}
              {!isSaved && (
                <button
                  onClick={handleManualSave}
                  className="px-3 py-1.5 rounded-lg bg-[var(--reward)] text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition hover:opacity-90"
                >
                  <Save className="w-3.5 h-3.5" /> Simpan
                </button>
              )}

              {/* Export PDF */}
              <button
                onClick={handleExportPDF}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                title="Ekspor PDF (Cetak)"
              >
                <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cetak PDF</span>
              </button>

              {/* Mark Completed */}
              <button
                onClick={handleMarkCompleted}
                className={`text-xs py-1.5 px-3.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                  currentChapter.completed
                    ? 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30 font-semibold'
                    : 'btn-primary'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentChapter.completed ? 'Selesai' : 'Tandai Selesai (+10 XP)'}
              </button>

              {/* Chat Toggle Button (Desktop & Mobile) */}
              <button
                onClick={() => setShowChatPanel(!showChatPanel)}
                className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition ${
                  showChatPanel
                    ? 'bg-[var(--primary)] text-slate-900 border-[var(--primary)] font-semibold'
                    : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
                title="Buka AI Tutor"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tutor</span>
              </button>
            </div>
          </div>

          {/* Chapter Content Card */}
          <article className="quest-card p-6 sm:p-10">
            {/* Chapter Header */}
            <div className="mb-6 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] text-[11px] font-mono font-medium uppercase tracking-wider">
                  Bab {currentChapter.order}
                </span>
                {note && (
                  <span className="text-xs text-[var(--muted)]">
                    / {note.title}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight">
                {currentChapter.title}
              </h1>
            </div>

            {/* TipTap Rich Text Editor / Viewer */}
            <TipTapEditor
              content={currentChapter.contentHtml}
              onChange={handleContentChange}
              chapterTitle={currentChapter.title}
            />
          </article>

          {/* Bottom Prev / Next Chapter Navigation (Hidden in Print) */}
          <div className="no-print flex items-center justify-between gap-4 pt-2">
            {prevChapter ? (
              <Link
                href={`/notes/${noteId}/chapter/${prevChapter.id}`}
                className="btn-secondary text-xs flex items-center gap-2 py-2 px-4"
              >
                <ChevronLeft className="w-4 h-4" /> Bab Sebelumnya
              </Link>
            ) : (
              <div />
            )}

            {nextChapter ? (
              <Link
                href={`/notes/${noteId}/chapter/${nextChapter.id}`}
                className="btn-primary text-xs flex items-center gap-2 py-2 px-4"
              >
                Bab Selanjutnya <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={`/notes/${noteId}/quiz`}
                className="btn-reward text-xs flex items-center gap-2 py-2 px-4 font-semibold"
              >
                Lanjut ke Uji Pemahaman <Sparkles className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Floating/Collapsible AI Tutor Chat Panel */}
        {showChatPanel && (
          <div className="no-print fixed inset-y-0 right-0 z-50 md:relative md:z-auto w-full max-w-sm sm:max-w-md shadow-2xl md:shadow-none flex shrink-0">
            <ChatPanel
              noteId={noteId}
              chapterId={chapterId}
              currentChapterContent={currentChapter.contentHtml.replace(/<[^>]*>?/gm, ' ')}
              allChaptersContent={allChaptersText}
              onClose={() => setShowChatPanel(false)}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
