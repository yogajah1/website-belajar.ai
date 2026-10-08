import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai/router';
import { verifyAuthToken } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuthToken(req.headers.get('Authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { selectedText, chapterContext, mode } = body;

    if (!selectedText) {
      return NextResponse.json({ error: 'Teks yang dipilih diperlukan' }, { status: 400 });
    }

    const systemPrompt = `Kamu adalah teman belajar yang ahli menyederhanakan konsep rumit menjadi perumpamaan yang sangat mudah dipahami anak SMP/SMA.
Gunakan Bahasa Indonesia santai, ramah, dan analogi kreatif sehari-hari. Hindari jargon rumit tanpa penjelasan.`;

    const prompt = `Tolong jelaskan potongan materi berikut ini dengan cara yang JAUH LEBIH MUDAH dan seru:

Bagian yang ditanyakan:
"${selectedText}"

Konteks bab:
"${chapterContext || ''}"

Tujuan: Buat penjelasan 1–3 paragraf singkat dengan 1 analogi kehidupan nyata yang mengena, lalu akhiri dengan 1 kalimat kesimpulan takeaway.`;

    const { text, providerUsed } = await generateText('grade', {
      systemPrompt,
      prompt,
      temperature: 0.7,
    });

    return NextResponse.json({ success: true, explanation: text, providerUsed });
  } catch (error: any) {
    console.error('Explain simpler error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menjelaskan materi' },
      { status: 500 }
    );
  }
}
