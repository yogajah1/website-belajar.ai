'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  BookOpen,
  Flame,
  Layers,
  Target,
  Search,
  LayoutGrid,
  List as ListIcon,
  Clock,
  ArrowRight,
  Shield,
  FileText,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { getNotes, getSubjects, getAllDueFlashcards } from '@/lib/firebase/store';
import { Note, Subject } from '@/types';
import { calculateLevelFromXP } from '@/lib/gamification';
import { DailyMissions } from '@/components/gamification/DailyMissions';

export default function DashboardPage() {
  const { user, profile, stats, loading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dueCardsCount, setDueCardsCount] = useState(0);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [greeting, setGreeting] = useState('Selamat Datang');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) setGreeting('Selamat Pagi');
    else if (hour < 15) setGreeting('Selamat Siang');
    else if (hour < 18) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      const fetchData = async () => {
        const [userNotes, userSubjects, dueCards] = await Promise.all([
          getNotes(user.uid),
          getSubjects(user.uid),
          getAllDueFlashcards(user.uid),
        ]);
        setNotes(userNotes);
        setSubjects(userSubjects);
        setDueCardsCount(dueCards.length);
      };
      fetchData();
    }
  }, [user, loading, router]);

  // Filtered and Sorted Notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => {
        const matchesSearch =
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject =
          selectedSubject === 'all' ||
          (selectedSubject === 'none' && !note.subjectId) ||
          note.subjectId === selectedSubject;
        return matchesSearch && matchesSubject;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return b.createdAt - a.createdAt;
        if (sortBy === 'oldest') return a.createdAt - b.createdAt;
        return a.title.localeCompare(b.title);
      });
  }, [notes, searchQuery, selectedSubject, sortBy]);

  const overallMastery = useMemo(() => {
    if (notes.length === 0) return 0;
    const totalMastery = notes.reduce((sum, n) => sum + (n.mastery || 0), 0);
    return Math.round(totalMastery / notes.length);
  }, [notes]);

  const xpStats = calculateLevelFromXP(stats?.xp || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-xs font-mono text-[var(--muted)]">
        Memuat data...
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header HUD */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
              {greeting}, {profile?.displayName || 'Petualang'}
            </h2>
            <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
              Kelola materi belajar, tuntaskan quest harian, dan uji penguasaan konsep.
            </p>
          </div>

          <Link
            href="/notes/new"
            className="btn-primary py-2.5 px-4 text-xs"
          >
            <Plus className="w-4 h-4" /> Catatan Baru
          </Link>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Notes */}
          <div className="quest-card p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)] shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[var(--muted)]">Total Catatan</p>
              <p className="text-xl font-bold font-mono tabular-nums text-[var(--text)]">
                {notes.length}
              </p>
            </div>
          </div>

          {/* Streak */}
          <div className="quest-card p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[var(--muted)]">Streak Belajar</p>
              <p className="text-xl font-bold font-mono tabular-nums text-[var(--text)]">
                {stats?.streakCurrent || 1} Hari
              </p>
            </div>
          </div>

          {/* Due Cards */}
          <Link
            href="/review"
            className="quest-card quest-card-hover p-4 flex items-center gap-3 group"
          >
            <div className="p-2.5 rounded-lg bg-[var(--reward-subtle)] text-amber-500 dark:text-[#F5B82E] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[var(--muted)]">Kartu Jatuh Tempo</p>
              <p className="text-xl font-bold font-mono tabular-nums text-[var(--text)] flex items-center gap-1.5">
                {dueCardsCount}
                {dueCardsCount > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500">
                    Review
                  </span>
                )}
              </p>
            </div>
          </Link>

          {/* Mastery Progress */}
          <div className="quest-card p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[var(--success-subtle)] text-[var(--success)] shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[var(--muted)]">Rata-rata Penguasaan</p>
              <p className="text-xl font-bold font-mono tabular-nums text-[var(--text)]">
                {overallMastery}%
              </p>
            </div>
          </div>
        </div>

        {/* Level Overview Card & Daily Quests Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Level HUD Card */}
          <div className="quest-card p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-amber-500 dark:text-[#F5B82E] flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 fill-current" /> Status Level
                </span>
                <span className="text-xs font-mono tabular-nums text-[var(--muted)]">
                  Total: {stats?.xp || 0} XP
                </span>
              </div>

              <h3 className="text-xl font-bold text-[var(--text)] mt-2">
                Level {xpStats.level}: {xpStats.title}
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Butuh <span className="font-mono tabular-nums text-[var(--text)] font-semibold">{xpStats.xpNeededForNext - xpStats.currentLevelXp} XP</span> lagi untuk mencapai Level {xpStats.level + 1}
              </p>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-medium text-[var(--muted)] mb-1">
                <span>Progres Level</span>
                <span className="font-mono tabular-nums font-semibold text-amber-500 dark:text-[#F5B82E]">
                  {xpStats.progressPercent}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full bg-amber-500 dark:bg-[#F5B82E] rounded-full transition-all duration-300 glow-reward"
                  style={{ width: `${xpStats.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Daily Quests Component */}
          <div className="lg:col-span-2">
            <DailyMissions />
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--primary)]" /> Daftar Catatan
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Materi yang siap kamu pelajari, kuis, dan diskusikan
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex bg-[var(--surface-2)] p-0.5 rounded-lg border border-[var(--border)]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition ${
                    viewMode === 'grid'
                      ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition ${
                    viewMode === 'list'
                      ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                  title="List View"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Cari judul atau isi catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-hidden focus:border-[var(--primary)]"
              />
            </div>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--text)] focus:outline-hidden"
            >
              <option value="all">Semua Mata Pelajaran</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
              <option value="none">Tanpa Subjek</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--text)] focus:outline-hidden"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="alpha">Abjad (A-Z)</option>
            </select>
          </div>

          {/* Notes Cards Container */}
          {filteredNotes.length === 0 ? (
            <div className="quest-card p-10 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)]">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-[var(--text)]">
                {searchQuery ? 'Catatan tidak ditemukan' : 'Belum ada catatan belajar'}
              </h4>
              <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
                Unggah dokumen PDF, DOCX, atau teks langsung untuk menyusun materi belajar.
              </p>
              <Link
                href="/notes/new"
                className="btn-primary py-2 px-3 text-xs inline-flex"
              >
                <Plus className="w-3.5 h-3.5" /> Buat Catatan Pertama
              </Link>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredNotes.map((note) => {
                const sub = subjects.find((s) => s.id === note.subjectId);
                const dateFormatted = new Date(note.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                });

                return (
                  <Link
                    key={note.id}
                    href={`/notes/${note.id}`}
                    className="quest-card quest-card-hover p-4 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)] uppercase tracking-wider">
                          {sub?.name || 'Umum'}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-[var(--muted)] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {dateFormatted}
                        </span>
                      </div>

                      <h4 className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition line-clamp-2">
                        {note.title}
                      </h4>
                      <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2 leading-relaxed">
                        {note.description || 'Klik untuk membuka rincian bab materi.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[var(--muted)]">
                        {note.chapterCount || 1} Bab
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums font-semibold text-[11px] text-[var(--text)]">
                          {note.mastery || 0}%
                        </span>
                        <div className="w-12 h-1 bg-[var(--border)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--primary)] rounded-full"
                            style={{ width: `${note.mastery || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotes.map((note) => {
                const sub = subjects.find((s) => s.id === note.subjectId);
                return (
                  <Link
                    key={note.id}
                    href={`/notes/${note.id}`}
                    className="quest-card quest-card-hover p-3.5 flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0 border border-[var(--border)]">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-xs text-[var(--text)] group-hover:text-[var(--primary)] truncate">
                          {note.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mt-0.5">
                          <span>{sub?.name || 'Umum'}</span>
                          <span>•</span>
                          <span>{note.chapterCount || 1} Bab</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[var(--text)]">
                        {note.mastery || 0}%
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
