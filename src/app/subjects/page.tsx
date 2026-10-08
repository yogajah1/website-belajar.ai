'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  Folder,
  Layers,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getSubjects, saveSubject, deleteSubject, getNotes } from '@/lib/firebase/store';
import { Subject, Note } from '@/types';

const PRESET_COLORS = [
  '#2DD4BF', // Teal
  '#38BDF8', // Sky
  '#818CF8', // Indigo
  '#F5B82E', // Gold
  '#34D399', // Emerald
  '#FB7185', // Rose
  '#A78BFA', // Violet
  '#94A3B8', // Slate
];

export default function SubjectsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, loading, router]);

  const loadData = async () => {
    if (!user) return;
    const [subs, nts] = await Promise.all([getSubjects(user.uid), getNotes(user.uid)]);
    setSubjects(subs);
    setNotes(nts);
  };

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setName('');
    setColor(PRESET_COLORS[0]);
    setShowModal(true);
  };

  const handleOpenEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setName(sub.name);
    setColor(sub.color || PRESET_COLORS[0]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;

    const sub: Subject = {
      id: editingSubject?.id || 'sub_' + Date.now(),
      name: name.trim(),
      color,
      icon: 'Folder',
      createdAt: editingSubject?.createdAt || Date.now(),
    };

    await saveSubject(user.uid, sub);
    await loadData();
    setShowModal(false);
  };

  const handleDelete = async (subId: string, subName: string) => {
    if (!user) return;
    if (confirm(`Hapus mata pelajaran "${subName}"? (Catatan di dalamnya akan tetap aman menjadi 'tanpa mata pelajaran')`)) {
      await deleteSubject(user.uid, subId);
      await loadData();
    }
  };

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
              <Folder className="w-5 h-5 text-[var(--primary)]" /> Mata Pelajaran
            </h2>
            <p className="text-xs text-[var(--muted)] mt-1">
              Kelompokkan catatan dan alur quest belajar berdasarkan topik atau mata pelajaran.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-medium"
          >
            <Plus className="w-4 h-4" /> Tambah Mata Pelajaran
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Cari mata pelajaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-hidden focus:border-[var(--primary)] transition"
          />
        </div>

        {/* Grid List of Subjects */}
        {filteredSubjects.length === 0 ? (
          <div className="quest-card p-12 text-center">
            <Folder className="w-10 h-10 mx-auto text-[var(--muted)] mb-3" />
            <h4 className="text-base font-semibold text-[var(--text)]">
              {searchQuery ? 'Mata Pelajaran Tidak Ditemukan' : 'Belum Ada Mata Pelajaran'}
            </h4>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              Buat topik mata pelajaran seperti Fisika, Matematika, Biologi, atau Pemrograman.
            </p>
            <button
              onClick={handleOpenAdd}
              className="btn-primary text-xs inline-flex items-center gap-1.5 py-2 px-4 mt-4"
            >
              <Plus className="w-3.5 h-3.5" /> Buat Mata Pelajaran
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredSubjects.map((sub) => {
              const noteCount = notes.filter((n) => n.subjectId === sub.id).length;

              return (
                <div
                  key={sub.id}
                  className="quest-card p-4 flex flex-col justify-between group transition hover:border-[var(--muted)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-900 shrink-0 font-bold text-xs"
                        style={{ backgroundColor: sub.color || '#2DD4BF' }}
                      >
                        <Folder className="w-4 h-4 text-slate-900" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-[var(--text)]">
                          {sub.name}
                        </h4>
                        <span className="text-[11px] text-[var(--muted)] font-mono">
                          {noteCount} Catatan
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="p-1.5 rounded-md hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition"
                        title="Ubah"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id, sub.name)}
                        className="p-1.5 rounded-md hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--danger)] transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Create / Edit Subject */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {editingSubject ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  Nama Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Fisika Kuantum, Biologi Sel..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] focus:outline-hidden focus:border-[var(--primary)] transition font-medium"
                />
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">
                  Warna Indikator
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-md transition ${
                        color === c ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface)] scale-105' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn-primary text-xs py-1.5 px-4 font-semibold"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
