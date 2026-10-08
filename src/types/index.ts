export type ThemeMode = 'light' | 'dark' | 'system';
export type ChatMode = 'strict' | 'flexible' | 'free';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'true_false' | 'multiple_choice' | 'multiple_select' | 'short_essay';

export interface UserProfile {
  displayName: string;
  photoURL: string;
  email: string;
  language: string;       // UI language (e.g. 'id')
  genLanguage: string;    // AI output language (e.g. 'id')
  sttLanguage: string;    // Voice dictate language (e.g. 'id-ID')
  theme: ThemeMode;
  defaultChatMode: ChatMode;
  soundEffects: boolean;
  reducedAnimations: boolean;
  createdAt: number;
}

export interface UserStats {
  xp: number;
  level: number;
  streakCurrent: number;
  streakLongest: number;
  lastActiveDate: string; // 'YYYY-MM-DD'
  cardsReviewed: number;
  perfectQuizzes: number;
  badges: string[];
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: number;
}

export interface NoteSettings {
  targetPercent: number;     // e.g. 85
  studyDays: number[];       // 0-6 (0 = Sun, 1 = Mon, ..., 6 = Sat)
  difficulty: Difficulty;
}

export interface Note {
  id: string;
  title: string;
  description: string;
  subjectId: string | null;
  sourceType: 'pdf' | 'docx' | 'txt' | 'text';
  chapterCount: number;
  settings: NoteSettings;
  mastery: number;           // 0-100%
  status: 'processing' | 'ready' | 'error';
  createdAt: number;
  updatedAt: number;
}

export interface Chapter {
  id: string;
  noteId: string;
  order: number;
  title: string;
  contentHtml: string;
  sourceText: string;
  completed: boolean;
  updatedAt: number;
}

export interface Flashcard {
  id: string;
  noteId: string;
  chapterId: string;
  front: string;
  back: string;
  ease: number;              // default 2.5
  intervalDays: number;      // default 0
  repetitions: number;       // default 0
  dueDate: string;           // 'YYYY-MM-DD'
  lastReviewedAt?: number;
}

export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy'; // Lupa, Sulit, Bagus, Mudah

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  answer: string | string[] | boolean;
  explanation: string;
}

export interface Quiz {
  id: string;
  noteId: string;
  chapterId: string | null;
  difficulty: Difficulty;
  questions: QuizQuestion[];
  createdAt: number;
}

export interface QuizAttempt {
  id: string;
  noteId: string;
  quizId: string;
  scorePercent: number;
  answers: {
    questionId: string;
    userAnswer: any;
    isCorrect: boolean;
    aiFeedback?: string;
  }[];
  createdAt: number;
}

export interface SwipeStatement {
  id: string;
  noteId: string;
  chapterId: string;
  statement: string;
  isTrue: boolean;
  explanation: string;
}

export interface ChatSession {
  id: string;
  noteId: string;
  scope: 'chapter' | 'note';
  chapterId: string | null;
  title: string;
  mode: ChatMode;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface DailyActivity {
  id: string;                // 'YYYY-MM-DD'
  xpEarned: number;
  minutesStudied: number;
  cardsReviewed: number;
  quizzesDone: number;
}

export interface ExamPredictionItem {
  id: string;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface ExamPrediction {
  id: string;
  title: string;
  noteId: string | null;
  sourceText: string;
  predictions: ExamPredictionItem[];
  createdAt: number;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'quiz' | 'cards' | 'xp' | 'milestone';
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  xpReward: number;
  isCompleted: boolean;
  claimed: boolean;
}
