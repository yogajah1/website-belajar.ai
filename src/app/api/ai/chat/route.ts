import { NextRequest } from 'next/server';
import { streamChat } from '@/lib/ai/router';
import { verifyAuthToken } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuthToken(req.headers.get('Authorization'));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { messages, contextMaterial, mode = 'flexible', scope = 'chapter' } = body;

    let modeInstruction = '';
    if (mode === 'strict') {
      modeInstruction = 'Jawab HANYA berdasarkan MATERI di bawah. Jika jawabannya tidak ada di materi, katakan dengan jelas bahwa hal itu tidak tercakup di materi, jangan menebak.';
    } else if (mode === 'flexible') {
      modeInstruction = 'Utamakan MATERI di bawah. Jika perlu menambah dari pengetahuan umum, boleh, tetapi awali bagian tambahan itu dengan label **[Di luar materi]** agar jelas mana yang dari materi dan mana yang bukan.';
    } else {
      // free
      modeInstruction = 'Jawab seperti asisten AI biasa. MATERI di bawah hanya konteks tambahan, tidak wajib dipakai.';
    }

    const basePrompt = `Kamu adalah tutor belajar yang sabar, ramah, dan menyenangkan bernama BelajarQuest AI Tutor.
Jelaskan dengan bahasa Indonesia yang sederhana, gunakan analogi sehari-hari jika membantu, dan jika perlu berikan langkah demi langkah. Jika pengguna bingung, jelaskan ulang dengan cara berbeda.

${modeInstruction}

=== MATERI RUJUKAN (${scope === 'chapter' ? 'Bab ini' : 'Semua bab'}) ===
"""
${(contextMaterial || 'Tidak ada materi spesifik yang dilampirkan.').slice(0, 15000)}
"""`;

    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          await streamChat(
            {
              systemPrompt: basePrompt,
              prompt: '',
              messages: messages || [],
              temperature: 0.7,
            },
            (chunk: string) => {
              const payload = `data: ${JSON.stringify({ text: chunk })}\n\n`;
              controller.enqueue(encoder.encode(payload));
            }
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: any) {
          const errPayload = `data: ${JSON.stringify({ error: err.message || 'Stream error' })}\n\n`;
          controller.enqueue(encoder.encode(errPayload));
          controller.close();
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Chat error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
