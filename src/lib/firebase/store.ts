import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './client';
import {
  Subject,
  Note,
  Chapter,
  Flashcard,
  Quiz,
  QuizAttempt,
  SwipeStatement,
  ChatSession,
  ChatMessage,
  ExamPrediction,
  DailyActivity,
} from '@/types';
import { getTodayDateString } from '../sm2';

function getLocalStore(key: string): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(`bq_db_${key}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function setLocalStore(key: string, data: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`bq_db_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

// ----------------------------------------------------
// SUBJECTS
// ----------------------------------------------------
export async function getSubjects(uid: string): Promise<Subject[]> {
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'users', uid, 'subjects');
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Subject));
    } catch (e) {
      console.warn('Firestore getSubjects failed, using local store:', e);
    }
  }
  return getLocalStore(`subjects_${uid}`);
}

export async function saveSubject(uid: string, subject: Subject): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'users', uid, 'subjects', subject.id);
      await setDoc(docRef, subject);
    } catch (e) {
      console.warn('Firestore saveSubject failed:', e);
    }
  }
  const list = getLocalStore(`subjects_${uid}`);
  const idx = list.findIndex((s) => s.id === subject.id);
  if (idx >= 0) list[idx] = subject;
  else list.push(subject);
  setLocalStore(`subjects_${uid}`, list);
}

export async function deleteSubject(uid: string, subjectId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'users', uid, 'subjects', subjectId));
    } catch (e) {}
  }
  const list = getLocalStore(`subjects_${uid}`).filter((s) => s.id !== subjectId);
  setLocalStore(`subjects_${uid}`, list);
}

// ----------------------------------------------------
// NOTES
// ----------------------------------------------------
export async function getNotes(uid: string): Promise<Note[]> {
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'users', uid, 'notes');
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note));
    } catch (e) {
      console.warn('Firestore getNotes failed:', e);
    }
  }
  return getLocalStore(`notes_${uid}`);
}

export async function getNoteById(uid: string, noteId: string): Promise<Note | null> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'notes', noteId));
      if (snap.exists()) return { id: snap.id, ...snap.data() } as Note;
    } catch (e) {}
  }
  const notes = getLocalStore(`notes_${uid}`);
  return notes.find((n) => n.id === noteId) || null;
}

export async function saveNote(uid: string, note: Note): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'users', uid, 'notes', note.id);
      await setDoc(docRef, note);
    } catch (e) {}
  }
  const list = getLocalStore(`notes_${uid}`);
  const idx = list.findIndex((n) => n.id === note.id);
  if (idx >= 0) list[idx] = note;
  else list.push(note);
  setLocalStore(`notes_${uid}`, list);
}

export async function deleteNote(uid: string, noteId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'users', uid, 'notes', noteId));
    } catch (e) {}
  }
  const list = getLocalStore(`notes_${uid}`).filter((n) => n.id !== noteId);
  setLocalStore(`notes_${uid}`, list);
}

// ----------------------------------------------------
// CHAPTERS
// ----------------------------------------------------
export async function getChapters(uid: string, noteId: string): Promise<Chapter[]> {
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'users', uid, 'notes', noteId, 'chapters');
      const snap = await getDocs(colRef);
      const chapters = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chapter));
      return chapters.sort((a, b) => a.order - b.order);
    } catch (e) {}
  }
  const list: Chapter[] = getLocalStore(`chapters_${uid}_${noteId}`);
  return list.sort((a, b) => a.order - b.order);
}

export async function getChapterById(uid: string, noteId: string, chapterId: string): Promise<Chapter | null> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'notes', noteId, 'chapters', chapterId));
      if (snap.exists()) return { id: snap.id, ...snap.data() } as Chapter;
    } catch (e) {}
  }
  const chapters = await getChapters(uid, noteId);
  return chapters.find((c) => c.id === chapterId) || null;
}

export async function saveChapter(uid: string, noteId: string, chapter: Chapter): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'users', uid, 'notes', noteId, 'chapters', chapter.id);
      await setDoc(docRef, chapter);
    } catch (e) {}
  }
  const list = getLocalStore(`chapters_${uid}_${noteId}`);
  const idx = list.findIndex((c) => c.id === chapter.id);
  if (idx >= 0) list[idx] = chapter;
  else list.push(chapter);
  setLocalStore(`chapters_${uid}_${noteId}`, list);
}

// ----------------------------------------------------
// FLASHCARDS & REVIEW
// ----------------------------------------------------
export async function getFlashcards(uid: string, noteId: string): Promise<Flashcard[]> {
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'users', uid, 'notes', noteId, 'flashcards');
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Flashcard));
    } catch (e) {}
  }
  return getLocalStore(`flashcards_${uid}_${noteId}`);
}

export async function getAllDueFlashcards(uid: string): Promise<{ noteTitle: string; card: Flashcard }[]> {
  const today = getTodayDateString();
  const notes = await getNotes(uid);
  const dueList: { noteTitle: string; card: Flashcard }[] = [];

  for (const note of notes) {
    const cards = await getFlashcards(uid, note.id);
    for (const card of cards) {
      if (!card.dueDate || card.dueDate <= today) {
        dueList.push({ noteTitle: note.title, card });
      }
    }
  }
  return dueList;
}

export async function saveFlashcard(uid: string, noteId: string, card: Flashcard): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'users', uid, 'notes', noteId, 'flashcards', card.id), card);
    } catch (e) {}
  }
  const list = getLocalStore(`flashcards_${uid}_${noteId}`);
  const idx = list.findIndex((c) => c.id === card.id);
  if (idx >= 0) list[idx] = card;
  else list.push(card);
  setLocalStore(`flashcards_${uid}_${noteId}`, list);
}

export async function saveFlashcardsBatch(uid: string, noteId: string, cards: Flashcard[]): Promise<void> {
  for (const card of cards) {
    await saveFlashcard(uid, noteId, card);
  }
}

// ----------------------------------------------------
// QUIZZES & ATTEMPTS
// ----------------------------------------------------
export async function getQuizzes(uid: string, noteId: string): Promise<Quiz[]> {
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'users', uid, 'notes', noteId, 'quizzes');
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quiz));
    } catch (e) {}
  }
  return getLocalStore(`quizzes_${uid}_${noteId}`);
}

export async function saveQuiz(uid: string, noteId: string, quiz: Quiz): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'users', uid, 'notes', noteId, 'quizzes', quiz.id), quiz);
    } catch (e) {}
  }
  const list = getLocalStore(`quizzes_${uid}_${noteId}`);
  const idx = list.findIndex((q) => q.id === quiz.id);
  if (idx >= 0) list[idx] = quiz;
  else list.push(quiz);
  setLocalStore(`quizzes_${uid}_${noteId}`, list);
}

export async function saveQuizAttempt(uid: string, noteId: string, attempt: QuizAttempt): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'users', uid, 'notes', noteId, 'attempts', attempt.id), attempt);
    } catch (e) {}
  }
  const list = getLocalStore(`attempts_${uid}_${noteId}`);
  list.push(attempt);
  setLocalStore(`attempts_${uid}_${noteId}`, list);

  // Recalculate mastery for note
  const allAttempts = list;
  if (allAttempts.length > 0) {
    const totalScore = allAttempts.reduce((sum, a) => sum + a.scorePercent, 0);
    const avgScore = Math.round(totalScore / allAttempts.length);
    const note = await getNoteById(uid, noteId);
    if (note) {
      note.mastery = avgScore;
      await saveNote(uid, note);
    }
  }
}

export async function getQuizAttempts(uid: string, noteId: string): Promise<QuizAttempt[]> {
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'users', uid, 'notes', noteId, 'attempts');
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttempt));
    } catch (e) {}
  }
  return getLocalStore(`attempts_${uid}_${noteId}`);
}

// ----------------------------------------------------
// SWIPE STATEMENTS
// ----------------------------------------------------
export async function getSwipeStatements(uid: string, noteId: string): Promise<SwipeStatement[]> {
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'users', uid, 'notes', noteId, 'swipeStatements');
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SwipeStatement));
    } catch (e) {}
  }
  return getLocalStore(`swipe_${uid}_${noteId}`);
}

export async function saveSwipeStatementsBatch(uid: string, noteId: string, statements: SwipeStatement[]): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      for (const s of statements) {
        await setDoc(doc(db, 'users', uid, 'notes', noteId, 'swipeStatements', s.id), s);
      }
    } catch (e) {}
  }
  const list = getLocalStore(`swipe_${uid}_${noteId}`);
  const combined = [...list, ...statements.filter((s) => !list.some((existing) => existing.id === s.id))];
  setLocalStore(`swipe_${uid}_${noteId}`, combined);
}

// ----------------------------------------------------
// CHATS & MESSAGES
// ----------------------------------------------------
export async function getChatSessions(uid: string, noteId: string): Promise<ChatSession[]> {
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'users', uid, 'chats');
      const snap = await getDocs(colRef);
      const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatSession));
      return chats.filter((c) => c.noteId === noteId);
    } catch (e) {}
  }
  const list: ChatSession[] = getLocalStore(`chats_${uid}`);
  return list.filter((c) => c.noteId === noteId);
}

export async function saveChatSession(uid: string, session: ChatSession): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'users', uid, 'chats', session.id), session);
    } catch (e) {}
  }
  const list = getLocalStore(`chats_${uid}`);
  const idx = list.findIndex((c) => c.id === session.id);
  if (idx >= 0) list[idx] = session;
  else list.push(session);
  setLocalStore(`chats_${uid}`, list);
}

export async function getChatMessages(uid: string, chatId: string): Promise<ChatMessage[]> {
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'users', uid, 'chats', chatId, 'messages');
      const snap = await getDocs(colRef);
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      return msgs.sort((a, b) => a.createdAt - b.createdAt);
    } catch (e) {}
  }
  const list: ChatMessage[] = getLocalStore(`chat_messages_${uid}_${chatId}`);
  return list.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveChatMessage(uid: string, chatId: string, msg: ChatMessage): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'users', uid, 'chats', chatId, 'messages', msg.id), msg);
    } catch (e) {}
  }
  const list = getLocalStore(`chat_messages_${uid}_${chatId}`);
  list.push(msg);
  setLocalStore(`chat_messages_${uid}_${chatId}`, list);
}

// ----------------------------------------------------
// EXAM PREDICTIONS
// ----------------------------------------------------
export async function getExamPredictions(uid: string): Promise<ExamPrediction[]> {
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'users', uid, 'exams');
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExamPrediction));
    } catch (e) {}
  }
  return getLocalStore(`exams_${uid}`);
}

export async function getExamPredictionById(uid: string, examId: string): Promise<ExamPrediction | null> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'exams', examId));
      if (snap.exists()) return { id: snap.id, ...snap.data() } as ExamPrediction;
    } catch (e) {}
  }
  const exams = await getExamPredictions(uid);
  return exams.find((e) => e.id === examId) || null;
}

export async function saveExamPrediction(uid: string, exam: ExamPrediction): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'users', uid, 'exams', exam.id), exam);
    } catch (e) {}
  }
  const list = getLocalStore(`exams_${uid}`);
  const idx = list.findIndex((e) => e.id === exam.id);
  if (idx >= 0) list[idx] = exam;
  else list.push(exam);
  setLocalStore(`exams_${uid}`, list);
}

export async function deleteExamPrediction(uid: string, examId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'users', uid, 'exams', examId));
    } catch (e) {}
  }
  const list = getLocalStore(`exams_${uid}`).filter((e) => e.id !== examId);
  setLocalStore(`exams_${uid}`, list);
}

// ----------------------------------------------------
// ACTIVITY & HEATMAP
// ----------------------------------------------------
export async function recordDailyActivity(
  uid: string,
  activity: Partial<DailyActivity>
): Promise<void> {
  const dateStr = getTodayDateString();
  const current = await getDailyActivity(uid, dateStr);

  const updated: DailyActivity = {
    id: dateStr,
    xpEarned: (current?.xpEarned || 0) + (activity.xpEarned || 0),
    minutesStudied: (current?.minutesStudied || 0) + (activity.minutesStudied || 0),
    cardsReviewed: (current?.cardsReviewed || 0) + (activity.cardsReviewed || 0),
    quizzesDone: (current?.quizzesDone || 0) + (activity.quizzesDone || 0),
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'users', uid, 'activity', dateStr), updated);
    } catch (e) {}
  }
  const list = getLocalStore(`activity_${uid}`);
  const idx = list.findIndex((a: DailyActivity) => a.id === dateStr);
  if (idx >= 0) list[idx] = updated;
  else list.push(updated);
  setLocalStore(`activity_${uid}`, list);
}

export async function getDailyActivity(uid: string, dateStr: string): Promise<DailyActivity | null> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'activity', dateStr));
      if (snap.exists()) return snap.data() as DailyActivity;
    } catch (e) {}
  }
  const list = getLocalStore(`activity_${uid}`);
  return list.find((a: DailyActivity) => a.id === dateStr) || null;
}

export async function getAllActivities(uid: string): Promise<DailyActivity[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'activity'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyActivity));
    } catch (e) {}
  }
  return getLocalStore(`activity_${uid}`);
}

// ----------------------------------------------------
// EXPORT ALL DATA / DELETE ALL DATA
// ----------------------------------------------------
export async function exportAllUserData(uid: string): Promise<any> {
  const subjects = await getSubjects(uid);
  const notes = await getNotes(uid);
  const activities = await getAllActivities(uid);
  const exams = await getExamPredictions(uid);

  const notesWithData = await Promise.all(
    notes.map(async (n) => {
      const chapters = await getChapters(uid, n.id);
      const flashcards = await getFlashcards(uid, n.id);
      const quizzes = await getQuizzes(uid, n.id);
      const attempts = await getQuizAttempts(uid, n.id);
      const swipe = await getSwipeStatements(uid, n.id);
      return {
        ...n,
        chapters,
        flashcards,
        quizzes,
        attempts,
        swipeStatements: swipe,
      };
    })
  );

  return {
    exportedAt: new Date().toISOString(),
    uid,
    subjects,
    notes: notesWithData,
    exams,
    activities,
  };
}

export async function deleteAllUserData(uid: string): Promise<void> {
  // Clear local keys
  if (typeof window !== 'undefined') {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`bq_`) || key.includes(uid)) {
        localStorage.removeItem(key);
      }
    });
  }
}
