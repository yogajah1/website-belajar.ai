import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateJson } from '@/lib/ai/router';
import { verifyAuthToken } from '@/lib/firebase/admin';

const outlineSchema = z.object({
  title: z.string().default('Catatan Belajar'),
  description: z.string().default('Catatan materi pembelajaran terstruktur.'),
  chapters: z.array(
    z.object({
      order: z.number(),
      title: z.string(),
      summary: z.string(),
      sourceExcerpt: z.string().optional(),
    })
  ).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuthToken(req.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { text, targetChapterCount, difficulty, titleHint } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Teks materi diperlukan' }, { status: 400 });
    }

    // Limit text length to prevent token overflow
    const maxChars = 40000;
    const sanitizedText = text.slice(0, maxChars);

    const systemPrompt = `Kamu adalah perancang kurikulum dan tutor belajar yang hebat.
Tugasmu adalah menganalisis materi belajar yang diberikan dan membaginya menjadi bab-bab terstruktur yang teratur, logis, dan ramah pembelajar.
Bahasa output: Bahasa Indonesia.`;

    const prompt = `Analisis materi berikut ini dan buatkan kerangka bab belajar yang terstruktur:

Materi:
"""
${sanitizedText}
"""

Tingkat kesulitan yang diinginkan: ${difficulty || 'sedang'}
Perkiraan jumlah bab: ${targetChapterCount || '3-5 bab'}
${titleHint ? `Judul yang disarankan: ${titleHint}` : ''}

Kembalikan format JSON dengan struktur:
{
  "title": "Judul Catatan yang menarik dan jelas",
  "description": "Deskripsi singkat mengenai apa yang akan dipelajari (1-2 kalimat)",
  "chapters": [
    {
      "order": 1,
      "title": "Bab 1: Judul Bab",
      "summary": "Ringkasan konsep pokok bab ini",
      "sourceExcerpt": "Bagian atau kata kunci materi yang mendasari bab ini"
    }
  ]
}`;

    const { data, providerUsed } = await generateJson('json', { systemPrompt, prompt }, outlineSchema);

    return NextResponse.json({ success: true, data, providerUsed });
  } catch (error: any) {
    console.error('Outline generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menyusun kerangka bab' },
      { status: 500 }
    );
  }
}
