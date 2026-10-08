import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateJson } from '@/lib/ai/router';
import { verifyAuthToken } from '@/lib/firebase/admin';

const studyPackSchema = z.object({
  quizzes: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['true_false', 'multiple_choice', 'multiple_select', 'short_essay']),
      prompt: z.string(),
      options: z.array(z.string()).optional(),
      answer: z.union([z.string(), z.array(z.string()), z.boolean()]),
      explanation: z.string(),
    })
  ).min(2),
  flashcards: z.array(
    z.object({
      id: z.string(),
      front: z.string(),
      back: z.string(),
    })
  ).min(2),
  swipeStatements: z.array(
    z.object({
      id: z.string(),
      statement: z.string(),
      isTrue: z.boolean(),
      explanation: z.string(),
    })
  ).min(2),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuthToken(req.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { chapterTitle, chapterContent, difficulty } = body;

    if (!chapterTitle || !chapterContent) {
      return NextResponse.json({ error: 'Data bab diperlukan' }, { status: 400 });
    }

    // Strip HTML tags for clean AI prompt text
    const cleanText = chapterContent.replace(/<[^>]*>?/gm, ' ').slice(0, 15000);

    const systemPrompt = `Kamu adalah pembuat instrumen evaluasi dan game edukasi interaktif.
Tugasmu adalah membuat kuis, flashcard, dan pernyataan kartu geser berkualitas tinggi berdasarkan materi bab.
Bahasa output: Bahasa Indonesia.`;

    const prompt = `Berdasarkan isi materi bab "${chapterTitle}" berikut:
"""
${cleanText}
"""

Tingkat kesulitan: ${difficulty || 'sedang'}

Buatlah paket belajar interaktif yang mencakup:
1. Kuis (4–6 soal) dengan variasi tipe:
   - true_false (answer: boolean true/false, options: ["Benar", "Salah"])
   - multiple_choice (answer: string opsi yang benar, options: 4 opsi)
   - multiple_select (answer: array string opsi benar, options: 4-5 opsi, minimal 2 opsi benar)
   - short_essay (prompt soal esai singkat & analitis, answer: kunci jawaban ideal & kata kunci penilaian)
2. Flashcards (4–8 kartu) untuk istilah penting, rumus, atau konsep inti (front: pertanyaan/istilah, back: penjelasan ringkas dan padat).
3. Kartu Geser / Swipe Statements (4–8 pernyataan benar/salah yang menarik untuk dites cepat).

Kembalikan format JSON persis sesuai schema:
{
  "quizzes": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "prompt": "Pertanyaan...",
      "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      "answer": "Pilihan A",
      "explanation": "Penjelasan mengapa ini benar..."
    }
  ],
  "flashcards": [
    {
      "id": "fc1",
      "front": "Istilah atau pertanyaan...",
      "back": "Definisi atau jawaban singkat..."
    }
  ],
  "swipeStatements": [
    {
      "id": "sw1",
      "statement": "Pernyataan faktual...",
      "isTrue": true,
      "explanation": "Alasan singkat..."
    }
  ]
}`;

    const { data, providerUsed } = await generateJson('json', { systemPrompt, prompt }, studyPackSchema);

    return NextResponse.json({ success: true, data, providerUsed });
  } catch (error: any) {
    console.error('Study pack generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal membuat paket kuis dan kartu' },
      { status: 500 }
    );
  }
}
