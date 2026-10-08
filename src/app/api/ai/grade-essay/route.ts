import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateJson } from '@/lib/ai/router';
import { verifyAuthToken } from '@/lib/firebase/admin';

const gradeSchema = z.object({
  score: z.number().min(0).max(100),
  isCorrect: z.boolean(),
  feedback: z.string(),
  keyPointsCovered: z.array(z.string()).optional(),
  improvementTips: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuthToken(req.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { question, idealAnswer, userAnswer } = body;

    if (!question || !userAnswer) {
      return NextResponse.json({ error: 'Soal dan jawaban pengguna diperlukan' }, { status: 400 });
    }

    const systemPrompt = `Kamu adalah penilai ujian yang adil, suportif, dan edukatif.
Tugasmu adalah menilai jawaban esai singkat siswa secara objektif dan memberikan umpan balik konstruktif dalam Bahasa Indonesia.`;

    const prompt = `Soal:
"${question}"

Kunci Jawaban / Kriteria Ideal:
"${idealAnswer || 'Menjelaskan konsep utama dengan tepat dan masuk akal'}"

Jawaban Siswa:
"${userAnswer}"

Berikan penilaian:
- Skor antara 0 sampai 100
- isCorrect: true jika skor >= 70, false jika di bawah 70
- feedback: penjelasan penilaian yang ramah, memuji poin yang benar dan menunjukkan apa yang kurang.

Kembalikan format JSON:
{
  "score": 85,
  "isCorrect": true,
  "feedback": "Jawabanmu sudah sangat bagus karena berhasil menyebutkan...",
  "keyPointsCovered": ["Poin A", "Poin B"],
  "improvementTips": "Akan lebih sempurna jika menambahkan contoh..."
}`;

    const { data, providerUsed } = await generateJson('grade', { systemPrompt, prompt }, gradeSchema);

    return NextResponse.json({ success: true, data, providerUsed });
  } catch (error: any) {
    console.error('Essay grading error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menilai esai' },
      { status: 500 }
    );
  }
}
