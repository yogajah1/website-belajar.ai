'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Plus,
  Sparkles,
  Search,
  FileText,
  UploadCloud,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getExamPredictions, saveExamPrediction, deleteExamPrediction, getNotes } from '@/lib/firebase/store';
import { extractTextFromFile } from '@/lib/extractors/documentExtractor';
import { ExamPrediction, Note } from '@/types';

export default function ExamsListPage() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();

  const [exams, setExams] = useState<ExamPrediction[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Creation modal
  const [showModal, setShowModal] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [pastExamsText, setPastExamsText] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
    const [exList, nList] = await Promise.all([
      getExamPredictions(user.uid),
      getNotes(user.uid),
    ]);
    setExams(exList);
    setNotes(nList);
  };

  const handleGenerateExam = async () => {
    if (!user) return;

    let sourceText = pastExamsText;
    if (selectedFile) {
      try {
        sourceText = await extractTextFromFile(selectedFile);
      } catch (e: any) {
        alert(e.message);
        return;
      }
    }

    if (!sourceText.trim() && !selectedNoteId) {
      alert('Silakan masukkan contoh soal ujian atau pilih catatan rujukan.');
      return;
    }

    setIsGenerating(true);
    try {
      const token = await getIdToken();
      const refNote = notes.find((n) => n.id === selectedNoteId);

      const res = await fetch('/api/ai/exam-predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pastExamsText: sourceText,
          noteTitle: refNote?.title,
          noteContent: refNote?.description,
          count: 5,
        }),
      });

      const data = await res.json();
      if (!data.data || !data.data.predictions) {
        throw new Error(data.error || 'Gagal membuat prediksi soal');
      }

      const examObj: ExamPrediction = {
        id: 'exam_' + Date.now(),
        title: examTitle || data.data.title || 'Prediksi Soal Ujian',
        noteId: selectedNoteId || null,
        sourceText: sourceText.slice(0, 1000),
        predictions: data.data.predictions,
        createdAt: Date.now(),
      };

      await saveExamPrediction(user.uid, examObj);
      await loadData();
      setShowModal(false);
      setExamTitle('');
      setPastExamsText('');
      setSelectedFile(null);
      router.push(`/exams/${examObj.id}`);
    } catch (err: any) {
      alert(err.message || 'Terjadi gangguan saat membuat prediksi ujian');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (confirm(`Hapus paket prediksi "${title}"?`)) {
      await deleteExamPrediction(user.uid, id);
      await loadData();
    }
  };

  const filteredExams = exams.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[var(--primary)]" /> Prediksi Soal Ujian
            </h2>
            <p className="text-xs text-[var(--muted)] mt-1">
              Analisis cerdas pola ujian masa lalu dan materi pelajaran untuk memprediksi soal evaluasi.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-medium"
          >
            <Plus className="w-4 h-4" /> Buat Prediksi Soal
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Cari koleksi prediksi soal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-hidden focus:border-[var(--primary)] transition"
          />
        </div>

        {/* Exams List */}
        {filteredExams.length === 0 ? (
          <div className="quest-card p-12 text-center">
            <GraduationCap className="w-10 h-10 mx-auto text-[var(--muted)] mb-3" />
            <h4 className="text-base font-semibold text-[var(--text)]">
              Belum Ada Paket Prediksi Ujian
            </h4>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
              Unggah soal ujian tahun lalu atau kaitkan dengan catatan materi untuk meracik paket soal prediksi.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary text-xs inline-flex items-center gap-1.5 py-2 px-4 mt-4"
            >
              <Plus className="w-3.5 h-3.5" /> Buat Prediksi Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredExams.map((exam) => {
              const noteRef = notes.find((n) => n.id === exam.noteId);

              return (
                <Link
                  key={exam.id}
                  href={`/exams/${exam.id}`}
                  className="quest-card p-4 flex flex-col justify-between group hover:border-[var(--muted)] transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">
                        {exam.predictions?.length || 0} Soal
                      </span>
                      <button
                        onClick={(e) => handleDelete(e, exam.id, exam.title)}
                        className="p-1 text-[var(--muted)] hover:text-[var(--danger)] rounded transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="font-semibold text-xs text-[var(--text)] group-hover:text-[var(--primary)] transition line-clamp-2">
                      {exam.title}
                    </h4>
                    {noteRef && (
                      <p className="text-[11px] text-[var(--muted)] mt-1">
                        Rujukan: {noteRef.title}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-medium text-[var(--primary)]">
                    <span>Mulai Latihan</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Modal Generate Exam Predictions */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 text-[var(--text)]">
                  <GraduationCap className="w-5 h-5 text-[var(--primary)]" />
                  <h3 className="text-sm font-semibold">Buat Prediksi Soal Ujian</h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  Judul Paket Prediksi
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="Contoh: Prediksi UAS Biologi Sel..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] focus:outline-hidden focus:border-[var(--primary)] transition font-medium"
                />
              </div>

              {/* Link with Note (Optional) */}
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  Kaitkan dengan Catatan Belajar (Opsional)
                </label>
                <select
                  value={selectedNoteId}
                  onChange={(e) => setSelectedNoteId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] focus:outline-hidden focus:border-[var(--primary)] font-medium"
                >
                  <option value="">-- Tidak dikaitkan --</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload file or paste */}
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  Materi atau Contoh Soal Lama
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-[var(--muted)] file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[var(--surface-2)] file:text-[var(--text)] hover:file:opacity-80"
                  />
                  <textarea
                    rows={4}
                    value={pastExamsText}
                    onChange={(e) => setPastExamsText(e.target.value)}
                    placeholder="Atau tempelkan kisi-kisi, silabus, atau contoh soal sebelumnya..."
                    className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-hidden focus:border-[var(--primary)] transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerateExam}
                  className="btn-primary text-xs py-1.5 px-4 font-semibold flex items-center gap-1.5"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menganalisis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Buat Prediksi
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
