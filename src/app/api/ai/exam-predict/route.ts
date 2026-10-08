import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateJson } from '@/lib/ai/router';
import { verifyAuthToken } from '@/lib/firebase/admin';

const examSchema = z.object({
  title: z.string().default('Prediksi Soal Ujian'),
  predictions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      options: z.array(z.string()).optional(),
      answer: z.string(),
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
    const { pastExamsText, noteTitle, noteContent, count = 5 } = body;

    if (!pastExamsText && !noteContent) {
      return NextResponse.json({ error: 'Materi atau soal ujian lama diperlukan' }, { status: 400 });
    }

    const systemPrompt = `Kamu adalah pakar penyusun soal ujian akademik dan evaluasi pendidikan tingkat nasional.
Tugasmu adalah menganalisis pola soal ujian sebelumnya dan materi pelajaran untuk memprediksi soal-soal penting yang berpotensi besar keluar dalam ujian sesungguhnya, lengkap dengan kunci jawaban dan pembahasan komprehensif.
Bahasa output: Bahasa Indonesia.`;

    const prompt = `Analisis soal ujian lama / materi berikut ini:

Soal Ujian Lama / Topik:
"""
${(pastExamsText || '').slice(0, 15000)}
"""

${noteContent ? `Materi Rujukan Catatan ("${noteTitle || ''}"):\n"""\n${noteContent.slice(0, 15000)}\n"""` : ''}

Buatkan ${count} butir soal prediksi ujian yang mencakup:
1. Soal bernalar kritis (HOTS/analisis) maupun konsep dasar.
2. Pilihan ganda atau pertanyaan terstruktur.
3. Kunci jawaban pasti dan pembahasan singkat namun padat yang menjelaskan logikanya.

Kembalikan format JSON:
{
  "title": "Prediksi Ujian: [Topik Utama]",
  "predictions": [
    {
      "id": "pred_1",
      "question": "Sebuah sistem mengalami ... Berapakah efisiensi yang dicapai?",
      "options": ["A. 40%", "B. 60%", "C. 75%", "D. 90%"],
      "answer": "B. 60%",
      "explanation": "Rumus efisiensi adalah (W_out / Q_in) * 100%. Dengan memasukkan nilai ..."
    }
  ]
}`;

    const { data, providerUsed } = await generateJson('exam', { systemPrompt, prompt }, examSchema);

    return NextResponse.json({ success: true, data, providerUsed });
  } catch (error: any) {
    console.error('Exam prediction generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal membuat prediksi soal ujian' },
      { status: 500 }
    );
  }
}
