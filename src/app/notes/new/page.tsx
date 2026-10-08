'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  Target,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getSubjects, saveNote, saveChapter, saveQuiz, saveFlashcardsBatch, saveSwipeStatementsBatch } from '@/lib/firebase/store';
import { extractTextFromFile } from '@/lib/extractors/documentExtractor';
import { Subject, Difficulty, Note, Chapter, Quiz, Flashcard, SwipeStatement } from '@/types';
import { getTodayDateString } from '@/lib/sm2';

type StepStatus = 'waiting' | 'running' | 'success' | 'error';

interface ChapterTask {
  order: number;
  title: string;
  summary: string;
  contentHtml?: string;
  statusChapter: StepStatus;
  statusStudyPack: StepStatus;
  errorMessage?: string;
}

export default function NewNotePage() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();

  // 3-step wizard (1: Sumber, 2: Detail, 3: Pengaturan)
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Source inputs
  const [sourceType, setSourceType] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  // Study Settings
  const [targetPercent, setTargetPercent] = useState<number>(85);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon - Fri default

  // Pipeline execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<1 | 2 | 3 | 4>(1);
  const [pipelineMessage, setPipelineMessage] = useState('');
  const [chapterTasks, setChapterTasks] = useState<ChapterTask[]>([]);
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);
  const [rawExtractedText, setRawExtractedText] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      getSubjects(user.uid).then(setSubjects);
    }
  }, [user, loading, router]);

  const toggleStudyDay = (day: number) => {
    if (studyDays.includes(day)) {
      setStudyDays(studyDays.filter((d) => d !== day));
    } else {
      setStudyDays([...studyDays, day].sort());
    }
  };

  const handleStartPipeline = async () => {
    if (!user) return;
    setIsProcessing(true);
    setPipelineStep(1);
    setPipelineMessage('Mengekstrak dan memproses teks dokumen...');

    try {
      let text = '';
      if (sourceType === 'upload') {
        if (!selectedFile) throw new Error('Pilih file PDF/Word/TXT terlebih dahulu.');
        text = await extractTextFromFile(selectedFile);
      } else {
        if (!pastedText.trim()) throw new Error('Tempel teks materi terlebih dahulu.');
        text = pastedText;
      }

      if (!text || text.trim().length < 50) {
        throw new Error('Materi terlalu pendek. Berikan materi minimal 50 karakter.');
      }
      setRawExtractedText(text);

      // Step 2: Generate Outline
      setPipelineStep(2);
      setPipelineMessage('Menyusun kerangka bab materi...');
      const token = await getIdToken();

      const outlineRes = await fetch('/api/ai/outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          difficulty,
          titleHint: customTitle || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : ''),
        }),
      });

      const outlineJson = await outlineRes.json();
      if (!outlineJson.data || !outlineJson.data.chapters) {
        throw new Error(outlineJson.error || 'Gagal menyusun kerangka bab');
      }

      const { title, description, chapters: outlineChapters } = outlineJson.data;

      const noteId = 'note_' + Date.now();
      setCreatedNoteId(noteId);

      const newNote: Note = {
        id: noteId,
        title: customTitle || title,
        description,
        subjectId: selectedSubjectId || null,
        sourceType: sourceType === 'upload' ? (selectedFile?.name.split('.').pop() as any) : 'text',
        chapterCount: outlineChapters.length,
        settings: {
          targetPercent,
          studyDays,
          difficulty,
        },
        mastery: 0,
        status: 'processing',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveNote(user.uid, newNote);

      const tasks: ChapterTask[] = outlineChapters.map((ch: any) => ({
        order: ch.order,
        title: ch.title,
        summary: ch.summary,
        statusChapter: 'waiting',
        statusStudyPack: 'waiting',
      }));
      setChapterTasks(tasks);

      // Step 3 & 4: Process sequentially
      await processAllChapters(user.uid, noteId, newNote.title, text, tasks);
    } catch (err: any) {
      setPipelineMessage(err.message || 'Terjadi kesalahan');
    }
  };

  const processAllChapters = async (
    uid: string,
    noteId: string,
    noteTitle: string,
    sourceText: string,
    tasks: ChapterTask[]
  ) => {
    const token = await getIdToken();
    const updatedTasks = [...tasks];

    for (let i = 0; i < updatedTasks.length; i++) {
      const task = updatedTasks[i];
      const chapterId = `chap_${noteId}_${task.order}`;

      // 3. Generate Chapter Content
      setPipelineStep(3);
      setPipelineMessage(`Menulis penjelasan ${task.title}...`);
      task.statusChapter = 'running';
      setChapterTasks([...updatedTasks]);

      try {
        const chapRes = await fetch('/api/ai/chapter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            noteTitle,
            chapterTitle: task.title,
            chapterSummary: task.summary,
            sourceContext: sourceText.slice(0, 10000),
            difficulty,
          }),
        });

        const chapData = await chapRes.json();
        if (!chapData.htmlContent) throw new Error(chapData.error || 'Gagal membuat isi bab');

        task.contentHtml = chapData.htmlContent;
        task.statusChapter = 'success';
        setChapterTasks([...updatedTasks]);

        const chapterObj: Chapter = {
          id: chapterId,
          noteId,
          order: task.order,
          title: task.title,
          contentHtml: chapData.htmlContent,
          sourceText: task.summary,
          completed: false,
          updatedAt: Date.now(),
        };
        await saveChapter(uid, noteId, chapterObj);

        // 4. Generate Study Pack
        setPipelineStep(4);
        setPipelineMessage(`Membuat kuis & kartu untuk ${task.title}...`);
        task.statusStudyPack = 'running';
        setChapterTasks([...updatedTasks]);

        const packRes = await fetch('/api/ai/study-pack', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            chapterTitle: task.title,
            chapterContent: chapData.htmlContent,
            difficulty,
          }),
        });

        const packData = await packRes.json();
        if (packData.data) {
          if (packData.data.quizzes && packData.data.quizzes.length > 0) {
            const quizObj: Quiz = {
              id: `quiz_${chapterId}`,
              noteId,
              chapterId,
              difficulty,
              questions: packData.data.quizzes,
              createdAt: Date.now(),
            };
            await saveQuiz(uid, noteId, quizObj);
          }

          if (packData.data.flashcards && packData.data.flashcards.length > 0) {
            const flashcardObjs: Flashcard[] = packData.data.flashcards.map((fc: any, fIdx: number) => ({
              id: `fc_${chapterId}_${fIdx}`,
              noteId,
              chapterId,
              front: fc.front,
              back: fc.back,
              ease: 2.5,
              intervalDays: 0,
              repetitions: 0,
              dueDate: getTodayDateString(),
            }));
            await saveFlashcardsBatch(uid, noteId, flashcardObjs);
          }

          if (packData.data.swipeStatements && packData.data.swipeStatements.length > 0) {
            const swipeObjs: SwipeStatement[] = packData.data.swipeStatements.map((sw: any, sIdx: number) => ({
              id: `sw_${chapterId}_${sIdx}`,
              noteId,
              chapterId,
              statement: sw.statement,
              isTrue: sw.isTrue,
              explanation: sw.explanation,
            }));
            await saveSwipeStatementsBatch(uid, noteId, swipeObjs);
          }
        }

        task.statusStudyPack = 'success';
        setChapterTasks([...updatedTasks]);
      } catch (chErr: any) {
        task.statusChapter = task.statusChapter === 'running' ? 'error' : task.statusChapter;
        task.statusStudyPack = 'error';
        task.errorMessage = chErr.message || 'Gagal memproses bab';
        setChapterTasks([...updatedTasks]);
      }
    }

    setPipelineMessage('Semua bab selesai disusun.');
  };

  const retrySingleChapter = async (orderIndex: number) => {
    if (!user || !createdNoteId) return;
    const task = chapterTasks[orderIndex];
    if (!task) return;

    task.statusChapter = 'running';
    task.statusStudyPack = 'waiting';
    delete task.errorMessage;
    setChapterTasks([...chapterTasks]);

    const token = await getIdToken();
    const chapterId = `chap_${createdNoteId}_${task.order}`;

    try {
      const chapRes = await fetch('/api/ai/chapter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          noteTitle: customTitle || 'Materi Belajar',
          chapterTitle: task.title,
          chapterSummary: task.summary,
          sourceContext: rawExtractedText.slice(0, 10000),
          difficulty,
        }),
      });

      const chapData = await chapRes.json();
      if (!chapData.htmlContent) throw new Error(chapData.error || 'Gagal menulis bab');

      task.contentHtml = chapData.htmlContent;
      task.statusChapter = 'success';

      const chapterObj: Chapter = {
        id: chapterId,
        noteId: createdNoteId,
        order: task.order,
        title: task.title,
        contentHtml: chapData.htmlContent,
        sourceText: task.summary,
        completed: false,
        updatedAt: Date.now(),
      };
      await saveChapter(user.uid, createdNoteId, chapterObj);

      task.statusStudyPack = 'running';
      setChapterTasks([...chapterTasks]);

      const packRes = await fetch('/api/ai/study-pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chapterTitle: task.title,
          chapterContent: chapData.htmlContent,
          difficulty,
        }),
      });
      const packData = await packRes.json();
      if (packData.data && packData.data.quizzes) {
        await saveQuiz(user.uid, createdNoteId, {
          id: `quiz_${chapterId}`,
          noteId: createdNoteId,
          chapterId,
          difficulty,
          questions: packData.data.quizzes,
          createdAt: Date.now(),
        });
      }

      task.statusStudyPack = 'success';
      setChapterTasks([...chapterTasks]);
    } catch (e: any) {
      task.statusChapter = 'error';
      task.statusStudyPack = 'error';
      task.errorMessage = e.message;
      setChapterTasks([...chapterTasks]);
    }
  };

  const daysLabel = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
            Buat Catatan Baru
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Ekstraksi materi dan susun jalur belajar mandiri secara otomatis.
          </p>
        </div>

        {!isProcessing ? (
          <div className="quest-card p-6 space-y-6">
            {/* 3-Step Wizard Indicator */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              {[
                { num: 1, label: 'Sumber Materi' },
                { num: 2, label: 'Detail Catatan' },
                { num: 3, label: 'Pengaturan Belajar' },
              ].map((step, sIdx) => {
                const isPassed = formStep > step.num;
                const isCurrent = formStep === step.num;

                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => setFormStep(step.num as any)}
                    className="flex items-center gap-2 text-left group"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition ${
                        isPassed
                          ? 'bg-[var(--primary)] text-[#0B0F14]'
                          : isCurrent
                          ? 'border-2 border-[var(--primary)] text-[var(--primary)]'
                          : 'bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]'
                      }`}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : step.num}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:inline transition ${
                        isCurrent
                          ? 'text-[var(--text)] font-semibold'
                          : isPassed
                          ? 'text-[var(--text)]'
                          : 'text-[var(--muted)]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Step 1: Sumber Materi */}
            {formStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType('upload')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                      sourceType === 'upload'
                        ? 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]'
                        : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" /> Unggah File
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('paste')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                      sourceType === 'paste'
                        ? 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]'
                        : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Tempel Teks
                  </button>
                </div>

                {sourceType === 'upload' ? (
                  <div className="border border-dashed border-[var(--border)] rounded-xl p-8 text-center bg-[var(--surface-2)] hover:border-[var(--primary)] transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setSelectedFile(f);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <UploadCloud className="w-8 h-8 text-[var(--primary)] mx-auto mb-2" />
                    <p className="font-semibold text-xs text-[var(--text)]">
                      {selectedFile ? selectedFile.name : 'Pilih atau seret file ke sini'}
                    </p>
                    <p className="text-[11px] text-[var(--muted)] mt-1 font-medium">
                      Mendukung format PDF, DOCX (Word), dan TXT. Teks diekstrak lokal di peramban.
                    </p>
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={6}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Tempelkan teks modul, artikel, atau catatan materi di sini..."
                      className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-hidden focus:border-[var(--primary)]"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (sourceType === 'upload' && !selectedFile) {
                        alert('Pilih file dokumen terlebih dahulu.');
                        return;
                      }
                      if (sourceType === 'paste' && !pastedText.trim()) {
                        alert('Tempelkan teks materi terlebih dahulu.');
                        return;
                      }
                      setFormStep(2);
                    }}
                    className="btn-primary py-2 px-4 text-xs"
                  >
                    Lanjut ke Detail <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Detail Catatan */}
            {formStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Judul Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Biarkan kosong agar AI memberi judul otomatis"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] focus:outline-hidden focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs font-medium text-[var(--text)] focus:outline-hidden"
                  >
                    <option value="">-- Tanpa Mata Pelajaran (Umum) --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className="btn-secondary py-2 px-3 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStep(3)}
                    className="btn-primary py-2 px-4 text-xs"
                  >
                    Lanjut ke Pengaturan <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Pengaturan Belajar */}
            {formStep === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Target Mastery */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-medium mb-1">
                      <span className="text-[var(--muted)]">Target Penguasaan:</span>
                      <span className="font-mono tabular-nums font-bold text-[var(--primary)]">
                        {targetPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={targetPercent}
                      onChange={(e) => setTargetPercent(Number(e.target.value))}
                      className="w-full accent-[var(--primary)]"
                    />
                  </div>

                  {/* Difficulty */}
                  <div>
                    <span className="block text-xs font-medium text-[var(--muted)] mb-1">
                      Tingkat Kesulitan:
                    </span>
                    <div className="flex gap-1.5">
                      {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDifficulty(d)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                            difficulty === d
                              ? 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)] font-semibold'
                              : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]'
                          }`}
                        >
                          {d === 'easy' ? 'Mudah' : d === 'medium' ? 'Sedang' : 'Sulit'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Study Days */}
                <div>
                  <span className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                    Hari Belajar (Hari libur tidak memutus streak):
                  </span>
                  <div className="flex justify-between gap-1">
                    {daysLabel.map((day, idx) => {
                      const isSelected = studyDays.includes(idx);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleStudyDay(idx)}
                          className={`flex-1 py-1 rounded text-xs font-mono font-medium transition ${
                            isSelected
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-[#F5B82E] font-semibold'
                              : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    className="btn-secondary py-2 px-3 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleStartPipeline}
                    className="btn-primary py-2 px-5 text-xs font-semibold"
                  >
                    Mulai Susun Materi <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Clean Process Stepper */
          <div className="quest-card p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--text)]">
                Menyusun Materi Belajar
              </h3>
              <p className="text-xs font-medium text-[var(--primary)]">
                {pipelineMessage}
              </p>
            </div>

            {/* Steps line */}
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-medium">
              {[
                { n: 1, label: 'Ekstraksi' },
                { n: 2, label: 'Kerangka Bab' },
                { n: 3, label: 'Isi Bab' },
                { n: 4, label: 'Kuis & Kartu' },
              ].map((st) => (
                <div
                  key={st.n}
                  className={`py-1.5 px-2 rounded-lg border text-center transition ${
                    pipelineStep >= st.n
                      ? 'bg-[var(--primary-subtle)] border-[var(--primary)] text-[var(--primary)] font-semibold'
                      : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {st.n}. {st.label}
                </div>
              ))}
            </div>

            {/* Chapters Progress List */}
            {chapterTasks.length > 0 && (
              <div className="space-y-2 pt-2">
                {chapterTasks.map((task, idx) => {
                  const isDone = task.statusChapter === 'success' && task.statusStudyPack === 'success';
                  const isErr = task.statusChapter === 'error' || task.statusStudyPack === 'error';

                  return (
                    <div
                      key={task.order}
                      className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono tabular-nums text-[var(--muted)]">
                            Bab {task.order}:
                          </span>
                          <span className="font-semibold text-[var(--text)] truncate">
                            {task.title}
                          </span>
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />}
                          {isErr && <AlertCircle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />}
                        </div>
                        {task.errorMessage && (
                          <p className="text-[11px] text-[var(--danger)] mt-0.5">{task.errorMessage}</p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isErr ? (
                          <button
                            onClick={() => retrySingleChapter(idx)}
                            className="btn-secondary py-1 px-2.5 text-[11px] font-semibold"
                          >
                            <RotateCcw className="w-3 h-3" /> Coba Lagi
                          </button>
                        ) : isDone ? (
                          <span className="text-[11px] font-semibold text-[var(--success)]">
                            Selesai
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--primary)] animate-pulse">
                            Memproses...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completion Button */}
            {createdNoteId && chapterTasks.length > 0 && chapterTasks.every((t) => t.statusStudyPack === 'success') && (
              <div className="pt-3">
                <button
                  onClick={() => router.push(`/notes/${createdNoteId}`)}
                  className="w-full btn-primary py-2.5 text-xs font-bold"
                >
                  Buka Catatan Belajar <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
