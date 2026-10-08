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
    const { noteTitle, chapterTitle, chapterSummary, sourceContext, difficulty } = body;

    if (!chapterTitle) {
      return NextResponse.json({ error: 'Judul bab diperlukan' }, { status: 400 });
    }

    const systemPrompt = `Kamu adalah pengajar dan edukator terbaik yang membuat materi belajar interaktif dan sangat mudah dipahami.
Gunakan Bahasa Indonesia yang ramah, jelas, dan mengasyikkan.
Format output WAJIB dalam HTML bersih (gunakan <h2>, <h3>, <p>, <ul>, <ol>, <li>, <blockquote>, <strong> untuk istilah penting, <code> jika ada kode/rumus).
JANGAN sertakan tag <html>, <head>, atau <body>, cukup konten HTML di dalamnya saja.`;

    const prompt = `Tulis isi bab belajar yang lengkap dan mendalam untuk:
Judul Catatan: "${noteTitle || 'Materi Belajar'}"
Judul Bab: "${chapterTitle}"
Ringkasan Bab: "${chapterSummary || ''}"
Tingkat Kesulitan: ${difficulty || 'sedang'}

Konteks Sumber Materi:
"""
${sourceContext || chapterSummary || chapterTitle}
"""

Ikuti pola penulisan berikut secara urut:
1. <h2>Pengantar Singkat</h2>: Paragraf pembuka yang ramah dan mengajak pembelajar penasaran.
2. <h2>Mengapa ini penting?</h2>: Jelaskan kegunaan konsep ini menggunakan ANALOGI KEHIDUPAN SEHARI-HARI yang mudah dibayangkan.
3. <h2>Penjelasan Bertahap</h2>: Bahas konsep secara detail, runtut, dan terstruktur. Cetak tebal (<strong>) setiap istilah atau konsep penting. Gunakan daftar bullet atau nomor jika menjelaskan tahapan.
4. <h2>Ringkasan Poin Kunci</h2>: Buat kotak ringkasan berupa daftar poin-poin terpenting yang wajib diingat.
5. <h2>Cek Pemahaman</h2>: Berikan 2–3 pertanyaan refleksi cepat untuk menguji pemahaman pembelajar setelah membaca.`;

    const { text, providerUsed } = await generateText('longform', {
      systemPrompt,
      prompt,
      temperature: 0.7,
    });

    // Clean up any markdown code fence if AI enclosed HTML in ```html
    let htmlContent = text.trim();
    if (htmlContent.startsWith('```html')) {
      htmlContent = htmlContent.replace(/^```html\s*/i, '').replace(/\s*```$/, '');
    } else if (htmlContent.startsWith('```')) {
      htmlContent = htmlContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return NextResponse.json({ success: true, htmlContent, providerUsed });
  } catch (error: any) {
    console.error('Chapter generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menulis penjelasan bab' },
      { status: 500 }
    );
  }
}
