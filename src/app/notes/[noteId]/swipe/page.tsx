'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Layers } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getNoteById, getSwipeStatements } from '@/lib/firebase/store';
import { Note, SwipeStatement } from '@/types';
import { SwipeCardGame } from '@/components/swipe/SwipeCardGame';

export default function NoteSwipeGamePage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.noteId as string;
  const { user, loading } = useAuth();

  const [note, setNote] = useState<Note | null>(null);
  const [statements, setStatements] = useState<SwipeStatement[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user && noteId) {
      const load = async () => {
        const [n, sws] = await Promise.all([
          getNoteById(user.uid, noteId),
          getSwipeStatements(user.uid, noteId),
        ]);
        setNote(n);
        setStatements(sws);
      };
      load();
    }
  }, [user, noteId, loading, router]);

  if (!note && !loading) return null;

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
          <span className="text-xs font-medium text-[var(--muted)]">
            {note?.title}
          </span>
        </div>

        {statements.length === 0 ? (
          <div className="quest-card p-12 text-center">
            <Layers className="w-10 h-10 mx-auto text-[var(--muted)] mb-3" />
            <h3 className="text-base font-semibold text-[var(--text)]">
              Belum Ada Kartu Geser
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              Kartu geser dibuat secara otomatis saat catatan baru diproses.
            </p>
            <Link
              href={`/notes/${noteId}`}
              className="btn-secondary text-xs inline-flex items-center gap-2 py-2 px-4 mt-4"
            >
              Kembali ke Catatan
            </Link>
          </div>
        ) : (
          <SwipeCardGame statements={statements} noteTitle={note?.title} />
        )}
      </div>
    </AppLayout>
  );
}
