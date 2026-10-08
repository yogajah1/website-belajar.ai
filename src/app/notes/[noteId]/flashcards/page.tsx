'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Layers, Plus, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getNoteById, getFlashcards, saveFlashcard } from '@/lib/firebase/store';
import { Note, Flashcard } from '@/types';
import { FlashcardReview } from '@/components/flashcards/FlashcardReview';
import { getTodayDateString } from '@/lib/sm2';

export default function NoteFlashcardsPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.noteId as string;
  const { user, loading } = useAuth();

  const [note, setNote] = useState<Note | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  // Add custom manual card modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user && noteId) {
      const load = async () => {
        const [n, fcs] = await Promise.all([
          getNoteById(user.uid, noteId),
          getFlashcards(user.uid, noteId),
        ]);
        setNote(n);
        setFlashcards(fcs);
      };
      load();
    }
  }, [user, noteId, loading, router]);

  const handleAddCustomCard = async () => {
    if (!user || !newFront.trim() || !newBack.trim()) return;
    const card: Flashcard = {
      id: 'fc_custom_' + Date.now(),
      noteId,
      chapterId: 'manual',
      front: newFront.trim(),
      back: newBack.trim(),
      ease: 2.5,
      intervalDays: 0,
      repetitions: 0,
      dueDate: getTodayDateString(),
    };
    await saveFlashcard(user.uid, noteId, card);
    setFlashcards([...flashcards, card]);
    setNewFront('');
    setNewBack('');
    setShowAddModal(false);
  };

  if (!note && !loading) return null;

  const cardItems = flashcards.map((card) => ({
    noteTitle: note?.title,
    card,
  }));

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between quest-card p-3.5">
          <Link
            href={`/notes/${noteId}`}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Alur Quest
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Kartu
          </button>
        </div>

        {flashcards.length === 0 ? (
          <div className="quest-card p-12 text-center">
            <Layers className="w-10 h-10 mx-auto text-[var(--muted)] mb-3" />
            <h3 className="text-base font-semibold text-[var(--text)]">
              Belum Ada Flashcard
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              Flashcard dibuat secara otomatis oleh AI atau bisa Anda buat secara manual.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary text-xs inline-flex items-center gap-1.5 py-2 px-4 mt-4"
            >
              <Plus className="w-3.5 h-3.5" /> Buat Kartu Pertama
            </button>
          </div>
        ) : (
          <FlashcardReview cards={cardItems} deckTitle={note?.title} />
        )}

        {/* Add Card Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  Tambah Flashcard Baru
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  Sisi Depan (Pertanyaan / Istilah)
                </label>
                <input
                  type="text"
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="Contoh: Apa prinsip kerja fotosintesis?"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] focus:outline-hidden focus:border-[var(--primary)] transition"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  Sisi Belakang (Penjelasan / Definisi)
                </label>
                <textarea
                  rows={3}
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="Contoh: Proses pembentukan karbohidrat dari karbon dioksida dan air dengan bantuan energi cahaya matahari."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] focus:outline-hidden focus:border-[var(--primary)] transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomCard}
                  className="btn-primary text-xs py-1.5 px-4 font-semibold"
                >
                  Simpan Kartu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
