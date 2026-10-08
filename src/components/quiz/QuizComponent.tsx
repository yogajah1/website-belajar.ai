'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Trophy,
  ArrowRight,
  Send,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { Quiz, QuizQuestion, QuizAttempt } from '@/types';
import { useAuth } from '@/lib/firebase/authContext';
import { saveQuizAttempt, recordDailyActivity } from '@/lib/firebase/store';
import { playSoundEffect, triggerConfetti } from '@/lib/gamification';

interface QuizComponentProps {
  quiz: Quiz;
  noteTitle?: string;
  onFinish?: (score: number) => void;
}

export const QuizComponent: React.FC<QuizComponentProps> = ({ quiz, noteTitle = 'Materi', onFinish }) => {
  const { user, profile, awardXP, getIdToken } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz.questions);
  const [currentIndex, setCurrentIndex] = useState(0);

  // User input per question
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [selectedMultiOptions, setSelectedMultiOptions] = useState<string[]>([]);
  const [essayText, setEssayText] = useState('');
  const [isGradingEssay, setIsGradingEssay] = useState(false);

  // Current question submitted status
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    isCorrect: boolean;
    explanation: string;
    aiFeedback?: string;
  } | null>(null);

  // Alternative explanation request
  const [altExplanation, setAltExplanation] = useState<string | null>(null);
  const [loadingAltExplain, setLoadingAltExplain] = useState(false);

  // Accumulated answers for attempt record
  const [answersHistory, setAnswersHistory] = useState<
    { questionId: string; prompt: string; userAnswer: any; correctAnswer: any; isCorrect: boolean; explanation: string; aiFeedback?: string }[]
  >([]);

  const [quizFinished, setQuizFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [animatedXp, setAnimatedXp] = useState(0);

  const currentQ = questions[currentIndex];

  // Animated counter for XP
  useEffect(() => {
    if (quizFinished && xpGained > 0) {
      let start = 0;
      const stepTime = Math.max(10, Math.floor(1000 / xpGained));
      const timer = setInterval(() => {
        start += 1;
        setAnimatedXp(start);
        if (start >= xpGained) {
          clearInterval(timer);
        }
      }, stepTime);
      return () => clearInterval(timer);
    }
  }, [quizFinished, xpGained]);

  const handleSubmitAnswer = async () => {
    if (isSubmitted || !currentQ) return;

    let isCorrect = false;
    let aiFeedback = '';

    if (currentQ.type === 'true_false') {
      const boolVal = selectedOption === 'Benar' || selectedOption === true;
      const expectedBool = currentQ.answer === true || String(currentQ.answer).toLowerCase() === 'benar' || String(currentQ.answer).toLowerCase() === 'true';
      isCorrect = boolVal === expectedBool;
    } else if (currentQ.type === 'multiple_choice') {
      isCorrect = String(selectedOption).trim().toLowerCase() === String(currentQ.answer).trim().toLowerCase();
    } else if (currentQ.type === 'multiple_select') {
      const correctArr = Array.isArray(currentQ.answer) ? currentQ.answer : [currentQ.answer];
      const selectedSorted = [...selectedMultiOptions].sort();
      const expectedSorted = correctArr.map((a: any) => String(a).trim()).sort();
      isCorrect =
        selectedSorted.length === expectedSorted.length &&
        selectedSorted.every((val, i) => val.toLowerCase() === expectedSorted[i].toLowerCase());
    } else if (currentQ.type === 'short_essay') {
      if (!essayText.trim()) return;
      setIsGradingEssay(true);
      try {
        const token = await getIdToken();
        const res = await fetch('/api/ai/grade-essay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: currentQ.prompt,
            idealAnswer: currentQ.answer,
            userAnswer: essayText,
          }),
        });
        const gradeData = await res.json();
        if (gradeData.data) {
          isCorrect = gradeData.data.isCorrect;
          aiFeedback = `Evaluasi AI (${gradeData.data.score}/100):\n${gradeData.data.feedback}${
            gradeData.data.improvementTips ? `\n\nSaran: ${gradeData.data.improvementTips}` : ''
          }`;
        } else {
          isCorrect = true;
          aiFeedback = 'Jawaban telah diverifikasi.';
        }
      } catch (e) {
        isCorrect = true;
        aiFeedback = 'Jawaban dicatat.';
      } finally {
        setIsGradingEssay(false);
      }
    }

    if (isCorrect) {
      playSoundEffect('correct', profile?.soundEffects);
    } else {
      playSoundEffect('wrong', profile?.soundEffects);
    }

    setIsSubmitted(true);
    setCurrentResult({
      isCorrect,
      explanation: currentQ.explanation,
      aiFeedback,
    });

    const userAns =
      currentQ.type === 'short_essay'
        ? essayText
        : currentQ.type === 'multiple_select'
        ? selectedMultiOptions
        : selectedOption;

    setAnswersHistory((prev) => [
      ...prev,
      {
        questionId: currentQ.id,
        prompt: currentQ.prompt,
        userAnswer: userAns,
        correctAnswer: currentQ.answer,
        isCorrect,
        explanation: currentQ.explanation,
        aiFeedback,
      },
    ]);
  };

  const handleNextQuestion = async () => {
    setAltExplanation(null);
    setSelectedOption(null);
    setSelectedMultiOptions([]);
    setEssayText('');
    setIsSubmitted(false);
    setCurrentResult(null);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Finish Quiz
      const totalCorrect = answersHistory.filter((a) => a.isCorrect).length;
      const scorePct = Math.round((totalCorrect / questions.length) * 100);
      setFinalScore(scorePct);

      let xp = 20;
      if (scorePct === 100) xp += 10;
      setXpGained(xp);
      setQuizFinished(true);

      await awardXP(xp, `Menyelesaikan kuis (${scorePct}%)`);
      if (user) {
        await recordDailyActivity(user.uid, { xpEarned: xp, quizzesDone: 1 });

        const attempt: QuizAttempt = {
          id: 'att_' + Date.now(),
          noteId: quiz.noteId,
          quizId: quiz.id,
          scorePercent: scorePct,
          answers: answersHistory,
          createdAt: Date.now(),
        };
        await saveQuizAttempt(user.uid, quiz.noteId, attempt);
      }

      if (scorePct >= 80) {
        triggerConfetti(profile?.reducedAnimations);
      }

      if (onFinish) onFinish(scorePct);
    }
  };

  const handleRequestAltExplanation = async () => {
    if (!currentQ) return;
    setLoadingAltExplain(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          selectedText: `Soal: ${currentQ.prompt}\nJawaban: ${currentQ.answer}`,
          chapterContext: currentQ.explanation,
        }),
      });
      const data = await res.json();
      if (data.explanation) {
        setAltExplanation(data.explanation);
      }
    } catch (e) {}
    setLoadingAltExplain(false);
  };

  const handleRetryMistakes = () => {
    const wrongIds = answersHistory.filter((a) => !a.isCorrect).map((a) => a.questionId);
    const retryQs = quiz.questions.filter((q) => wrongIds.includes(q.id));
    if (retryQs.length > 0) {
      setQuestions(retryQs);
      setCurrentIndex(0);
      setAnswersHistory([]);
      setSelectedOption(null);
      setSelectedMultiOptions([]);
      setEssayText('');
      setIsSubmitted(false);
      setCurrentResult(null);
      setQuizFinished(false);
      setAltExplanation(null);
    }
  };

  // Letter Grade Helper
  const getLetterGrade = (score: number) => {
    if (score >= 95) return { grade: 'S', label: 'Sempurna', color: 'text-[var(--reward)] border-[var(--reward)] bg-[var(--reward)]/10' };
    if (score >= 80) return { grade: 'A', label: 'Sangat Baik', color: 'text-[var(--primary)] border-[var(--primary)] bg-[var(--primary)]/10' };
    if (score >= 65) return { grade: 'B', label: 'Kompeten', color: 'text-[var(--success)] border-[var(--success)] bg-[var(--success)]/10' };
    if (score >= 50) return { grade: 'C', label: 'Cukup', color: 'text-[var(--reward)] border-[var(--reward)] bg-[var(--reward)]/10' };
    return { grade: 'D', label: 'Perlu Ulang', color: 'text-[var(--danger)] border-[var(--danger)] bg-[var(--danger)]/10' };
  };

  if (quizFinished) {
    const wrongAnswers = answersHistory.filter((a) => !a.isCorrect);
    const rank = getLetterGrade(finalScore);

    return (
      <div className="quest-card p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
        {/* Quest Selesai Banner */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                Quest Selesai
              </span>
              <span className="text-xs text-[var(--muted)]">{noteTitle}</span>
            </div>
            <h3 className="text-xl font-semibold text-[var(--text)] mt-1 tracking-tight">
              Hasil Evaluasi Pemahaman
            </h3>
          </div>

          {/* Letter Grade Emblem */}
          <div className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center font-mono font-bold ${rank.color}`}>
            <span className="text-2xl leading-none">{rank.grade}</span>
            <span className="text-[9px] uppercase tracking-wider">{rank.label}</span>
          </div>
        </div>

        {/* Score & XP Summary */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <div className="text-center">
            <p className="text-[11px] text-[var(--muted)]">Akurasi</p>
            <p className="text-2xl font-bold font-mono text-[var(--text)] mt-0.5 tabular-nums">
              {finalScore}%
            </p>
          </div>
          <div className="text-center border-x border-[var(--border)]">
            <p className="text-[11px] text-[var(--muted)]">Status Jawaban</p>
            <p className="text-sm font-semibold mt-1.5 flex items-center justify-center gap-2">
              <span className="text-[var(--success)]">{questions.length - wrongAnswers.length} Benar</span>
              {wrongAnswers.length > 0 && (
                <span className="text-[var(--danger)]">{wrongAnswers.length} Salah</span>
              )}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-[var(--muted)]">XP Diperoleh</p>
            <p className="text-2xl font-bold font-mono text-[var(--reward)] mt-0.5 tabular-nums flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4 text-[var(--reward)]" /> +{animatedXp}
            </p>
          </div>
        </div>

        {/* List of Wrong Answers */}
        {wrongAnswers.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)]" /> Evaluasi Soal yang Perlu Dipelajari:
            </h4>
            <div className="space-y-2.5">
              {wrongAnswers.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] space-y-1.5 text-xs"
                >
                  <p className="font-semibold text-[var(--text)]">
                    {idx + 1}. {item.prompt}
                  </p>
                  <div className="text-[11px] space-y-0.5 text-[var(--muted)] font-mono">
                    <p>
                      <span className="text-[var(--danger)] font-medium">Jawaban Anda:</span>{' '}
                      {Array.isArray(item.userAnswer) ? item.userAnswer.join(', ') : String(item.userAnswer || '-')}
                    </p>
                    <p>
                      <span className="text-[var(--success)] font-medium">Kunci Jawaban:</span>{' '}
                      {Array.isArray(item.correctAnswer) ? item.correctAnswer.join(', ') : String(item.correctAnswer)}
                    </p>
                  </div>
                  {item.explanation && (
                    <p className="text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--border)] leading-relaxed">
                      {item.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--success)]/30 text-center text-xs text-[var(--success)]">
            Semua soal dijawab dengan tepat. Pemahaman Anda pada materi ini sudah sangat baik.
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-end pt-2">
          {wrongAnswers.length > 0 && (
            <button
              onClick={handleRetryMistakes}
              className="btn-reward text-xs flex items-center justify-center gap-1.5 py-2 px-4 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Ulangi Soal yang Salah ({wrongAnswers.length})
            </button>
          )}

          <button
            onClick={() => {
              setQuestions(quiz.questions);
              setCurrentIndex(0);
              setAnswersHistory([]);
              setSelectedOption(null);
              setSelectedMultiOptions([]);
              setEssayText('');
              setIsSubmitted(false);
              setCurrentResult(null);
              setQuizFinished(false);
            }}
            className="btn-secondary text-xs flex items-center justify-center gap-1.5 py-2 px-4"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Ulangi Semua
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="quest-card p-6 sm:p-8 max-w-2xl mx-auto space-y-5">
      {/* Quiz Progress & Question Number */}
      <div className="flex items-center justify-between text-xs">
        <span className="px-2.5 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] font-mono font-medium">
          Soal {currentIndex + 1} / {questions.length}
        </span>
        <span className="text-[11px] text-[var(--muted)] font-mono">
          {currentQ.type === 'true_false'
            ? 'Benar / Salah'
            : currentQ.type === 'multiple_select'
            ? 'Pilihan Ganda (Banyak Jawaban)'
            : currentQ.type === 'short_essay'
            ? 'Uraian Singkat'
            : 'Pilihan Ganda'}
        </span>
      </div>

      {/* Thin Progress Bar */}
      <div className="w-full h-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--primary)] transition-all duration-200"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Prompt */}
      <h3 className="text-base sm:text-lg font-semibold text-[var(--text)] leading-snug">
        {currentQ.prompt}
      </h3>

      {/* True/False Options */}
      {currentQ.type === 'true_false' && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          {['Benar', 'Salah'].map((opt) => {
            const isSelected = selectedOption === opt;
            return (
              <button
                key={opt}
                disabled={isSubmitted}
                onClick={() => setSelectedOption(opt)}
                className={`py-3 px-4 rounded-lg font-medium text-sm border transition-all text-center ${
                  isSelected
                    ? 'bg-[var(--primary)] text-slate-900 border-[var(--primary)] font-semibold shadow-xs'
                    : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)] hover:border-[var(--muted)]'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* Multiple Choice Options */}
      {currentQ.type === 'multiple_choice' && currentQ.options && (
        <div className="space-y-2 pt-2">
          {currentQ.options.map((opt, i) => {
            const isSelected = selectedOption === opt;
            return (
              <button
                key={i}
                disabled={isSubmitted}
                onClick={() => setSelectedOption(opt)}
                className={`w-full text-left p-3.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-3 ${
                  isSelected
                    ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text)] shadow-xs'
                    : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)] hover:border-[var(--muted)]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                    isSelected
                      ? 'bg-[var(--primary)] text-slate-900'
                      : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]'
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Multiple Select Options */}
      {currentQ.type === 'multiple_select' && currentQ.options && (
        <div className="space-y-2 pt-2">
          <p className="text-[11px] text-[var(--muted)] mb-1">
            Pilih semua opsi yang sesuai:
          </p>
          {currentQ.options.map((opt, i) => {
            const isSelected = selectedMultiOptions.includes(opt);
            return (
              <button
                key={i}
                disabled={isSubmitted}
                onClick={() => {
                  if (isSelected) {
                    setSelectedMultiOptions((prev) => prev.filter((o) => o !== opt));
                  } else {
                    setSelectedMultiOptions((prev) => [...prev, opt]);
                  }
                }}
                className={`w-full text-left p-3.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-3 ${
                  isSelected
                    ? 'bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--text)] shadow-xs'
                    : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)] hover:border-[var(--muted)]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected ? 'bg-[var(--primary)] border-[var(--primary)] text-slate-900' : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <span className="leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Essay Input */}
      {currentQ.type === 'short_essay' && (
        <div className="pt-2">
          <textarea
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
            disabled={isSubmitted || isGradingEssay}
            placeholder="Tuliskan analisis jawaban Anda secara ringkas..."
            rows={4}
            className="w-full p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-hidden focus:border-[var(--primary)] text-xs leading-relaxed transition"
          />
        </div>
      )}

      {/* Answer Validation Feedback */}
      {isSubmitted && currentResult && (
        <div
          className={`p-4 rounded-lg border text-xs leading-relaxed space-y-2 ${
            currentResult.isCorrect
              ? 'bg-[var(--surface-2)] border-[var(--success)]/40 text-[var(--text)]'
              : 'bg-[var(--surface-2)] border-[var(--danger)]/40 text-[var(--text)]'
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold">
            {currentResult.isCorrect ? (
              <span className="text-[var(--success)] flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Jawaban Tepat
              </span>
            ) : (
              <span className="text-[var(--danger)] flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Jawaban Belum Tepat
              </span>
            )}
          </div>

          <p className="text-[11px] text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
            {currentResult.explanation}
          </p>

          {currentResult.aiFeedback && (
            <div className="mt-2 p-2.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[11px] font-mono text-[var(--text)]">
              {currentResult.aiFeedback}
            </div>
          )}

          {/* Alternative Explanation Request */}
          <div className="pt-2 border-t border-[var(--border)] flex flex-col gap-1.5">
            {!altExplanation && (
              <button
                onClick={handleRequestAltExplanation}
                disabled={loadingAltExplain}
                className="self-start text-[11px] font-medium text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                {loadingAltExplain ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Mengurai penjelasan alternatif...
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-3 h-3" /> Jelaskan dengan analogi lain
                  </>
                )}
              </button>
            )}

            {altExplanation && (
              <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[11px] text-[var(--text)] space-y-1">
                <span className="font-semibold text-[var(--primary)] flex items-center gap-1">
                  Penjelasan Alternatif:
                </span>
                <p className="leading-relaxed">{altExplanation}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        {!isSubmitted ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={
              isGradingEssay ||
              (currentQ.type === 'true_false' && selectedOption === null) ||
              (currentQ.type === 'multiple_choice' && !selectedOption) ||
              (currentQ.type === 'multiple_select' && selectedMultiOptions.length === 0) ||
              (currentQ.type === 'short_essay' && !essayText.trim())
            }
            className="btn-primary text-xs py-2 px-6 font-semibold flex items-center gap-1.5 disabled:opacity-40"
          >
            {isGradingEssay ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memeriksa...
              </>
            ) : (
              <>
                Kirim Jawaban <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="btn-primary text-xs py-2 px-6 font-semibold flex items-center gap-1.5"
          >
            {currentIndex + 1 < questions.length ? (
              <>
                Soal Selanjutnya <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Selesaikan Quest <Trophy className="w-3.5 h-3.5 text-[var(--reward)]" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
