import { z } from 'zod';
import { AiInput, AiProvider, AiTaskType, ProviderStatus } from './types';
import { geminiProvider } from './gemini';
import { groqProvider } from './groq';
import { cerebrasProvider } from './cerebras';
import { openrouterProvider } from './openrouter';

const providers: Record<string, AiProvider> = {
  gemini: geminiProvider,
  groq: groqProvider,
  cerebras: cerebrasProvider,
  openrouter: openrouterProvider,
};

const taskRoutes: Record<AiTaskType, string[]> = {
  longform: ['gemini', 'openrouter', 'groq'],
  json: ['gemini', 'groq', 'cerebras', 'openrouter'],
  grade: ['groq', 'cerebras', 'gemini', 'openrouter'],
  chat: ['groq', 'cerebras', 'gemini', 'openrouter'],
  exam: ['gemini', 'openrouter', 'groq'],
};

// Global in-memory cooldown tracker
const cooldownUntil: Record<string, number> = {};
const lastErrors: Record<string, string> = {};
const lastSuccessTimestamps: Record<string, number> = {};

export function getProviderStatuses(): ProviderStatus[] {
  const now = Date.now();
  return Object.keys(providers).map((name) => {
    const provider = providers[name];
    const until = cooldownUntil[name] || 0;
    const inCooldown = until > now;
    const cooldownRemainingSeconds = inCooldown ? Math.ceil((until - now) / 1000) : 0;

    let modelName = 'default';
    if (name === 'gemini') modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    if (name === 'groq') modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    if (name === 'cerebras') modelName = process.env.CEREBRAS_MODEL || 'llama3.1-8b';
    if (name === 'openrouter') modelName = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';

    return {
      name,
      configured: provider.isConfigured(),
      model: modelName,
      inCooldown,
      cooldownRemainingSeconds,
      lastError: lastErrors[name],
      lastSuccess: lastSuccessTimestamps[name],
    };
  });
}

export async function generateText(task: AiTaskType, input: AiInput): Promise<{ text: string; providerUsed: string }> {
  const errors: string[] = [];
  const route = taskRoutes[task] || ['gemini', 'groq', 'cerebras', 'openrouter'];
  const now = Date.now();

  for (const name of route) {
    const provider = providers[name];
    if (!provider || !provider.isConfigured()) {
      continue;
    }

    if ((cooldownUntil[name] ?? 0) > now) {
      const waitSec = Math.ceil(((cooldownUntil[name] ?? 0) - now) / 1000);
      errors.push(`${name}: cooldown (${waitSec}s remaining)`);
      continue;
    }

    try {
      const result = await provider.call(input);
      lastSuccessTimestamps[name] = Date.now();
      delete lastErrors[name];
      return { text: result, providerUsed: name };
    } catch (e: any) {
      const is429 = e.status === 429 || String(e.message || '').includes('429');
      const wait = is429 ? 60_000 : 20_000;
      cooldownUntil[name] = Date.now() + wait;
      const errMsg = e.message || 'Unknown error';
      lastErrors[name] = errMsg;
      errors.push(`${name}: ${errMsg}`);
    }
  }

  // Fallback demo mock response if all API keys are unset or in cooldown
  const isAllUnconfigured = route.every((name) => !providers[name]?.isConfigured());
  if (isAllUnconfigured) {
    return {
      text: getFallbackMockResponse(task, input),
      providerUsed: 'demo_fallback',
    };
  }

  throw new Error('Semua provider AI sedang penuh atau tidak aktif: ' + errors.join(' | '));
}

export function extractJsonFromText(raw: string): string {
  let text = raw.trim();
  // Remove markdown code blocks if wrapped
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Find the first { or [ and last } or ]
  const firstBrace = text.search(/[\{\[]/);
  const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text;
}

export async function generateJson<T>(
  task: AiTaskType,
  input: AiInput,
  schema: z.ZodSchema<T>
): Promise<{ data: T; providerUsed: string }> {
  const jsonInput: AiInput = {
    ...input,
    responseFormat: 'json',
    systemPrompt: (input.systemPrompt || '') + '\n\nIMPORTANT: Output ONLY valid JSON matching the schema, with no conversational filler or markdown formatting outside the JSON.',
  };

  const route = taskRoutes[task] || ['gemini', 'groq', 'cerebras', 'openrouter'];
  const errors: string[] = [];
  const now = Date.now();

  for (const name of route) {
    const provider = providers[name];
    if (!provider || !provider.isConfigured()) continue;

    if ((cooldownUntil[name] ?? 0) > now) continue;

    try {
      const rawText = await provider.call(jsonInput);
      const cleaned = extractJsonFromText(rawText);
      const parsed = JSON.parse(cleaned);
      const validated = schema.parse(parsed);

      lastSuccessTimestamps[name] = Date.now();
      delete lastErrors[name];
      return { data: validated, providerUsed: name };
    } catch (err: any) {
      // If error is JSON parse or zod schema, try one quick repair
      const isValidationErr = err instanceof z.ZodError || err instanceof SyntaxError;
      if (isValidationErr) {
        try {
          const repairInput: AiInput = {
            ...jsonInput,
            prompt: `Berikut output yang tidak valid:\n${err.message}\n\nPerbaiki dan kembalikan hanya JSON yang valid sesuai instruksi:\n${input.prompt}`,
          };
          const rawText2 = await provider.call(repairInput);
          const cleaned2 = extractJsonFromText(rawText2);
          const validated2 = schema.parse(JSON.parse(cleaned2));
          lastSuccessTimestamps[name] = Date.now();
          return { data: validated2, providerUsed: name };
        } catch (repairErr: any) {
          errors.push(`${name} (JSON parse failed): ${repairErr.message}`);
        }
      } else {
        const is429 = err.status === 429 || String(err.message || '').includes('429');
        const wait = is429 ? 60_000 : 20_000;
        cooldownUntil[name] = Date.now() + wait;
        lastErrors[name] = err.message || 'Error';
        errors.push(`${name}: ${err.message}`);
      }
    }
  }

  // Fallback demo mock JSON if unconfigured
  const isAllUnconfigured = route.every((name) => !providers[name]?.isConfigured());
  if (isAllUnconfigured) {
    const mockJson = getFallbackMockJson(task);
    try {
      const validated = schema.parse(mockJson);
      return { data: validated, providerUsed: 'demo_fallback' };
    } catch (e) {
      // return as any if mock matches closely
      return { data: mockJson as any, providerUsed: 'demo_fallback' };
    }
  }

  throw new Error('Gagal menghasilkan JSON dari AI: ' + errors.join(' | '));
}

export async function streamChat(
  input: AiInput,
  onChunk: (chunk: string) => void
): Promise<{ fullText: string; providerUsed: string }> {
  const route = taskRoutes.chat;
  const errors: string[] = [];
  const now = Date.now();

  for (const name of route) {
    const provider = providers[name];
    if (!provider || !provider.isConfigured()) continue;
    if ((cooldownUntil[name] ?? 0) > now) continue;

    try {
      if (provider.stream) {
        const fullText = await provider.stream(input, onChunk);
        lastSuccessTimestamps[name] = Date.now();
        delete lastErrors[name];
        return { fullText, providerUsed: name };
      } else {
        const fullText = await provider.call(input);
        onChunk(fullText);
        lastSuccessTimestamps[name] = Date.now();
        delete lastErrors[name];
        return { fullText, providerUsed: name };
      }
    } catch (e: any) {
      const is429 = e.status === 429 || String(e.message || '').includes('429');
      cooldownUntil[name] = Date.now() + (is429 ? 60_000 : 20_000);
      lastErrors[name] = e.message;
      errors.push(`${name}: ${e.message}`);
    }
  }

  // Fallback streaming mock
  const fallbackWords = 'Halo! Saya tutor AI BelajarQuest. Karena API Key belum diisi di .env.local, saya bekerja dalam mode demo. Materi kamu sangat menarik! Mari kita diskusikan lebih lanjut.';
  for (const word of fallbackWords.split(' ')) {
    onChunk(word + ' ');
    await new Promise((r) => setTimeout(r, 40));
  }
  return { fullText: fallbackWords, providerUsed: 'demo_fallback' };
}

function getFallbackMockResponse(task: AiTaskType, input: AiInput): string {
  if (task === 'longform') {
    return `<h2>Pengenalan Konsep Utama</h2><p>Selamat datang di bab belajar ini! Materi ini disusun secara interaktif untuk mempermudah pemahaman kamu.</p><h3>Mengapa ini penting?</h3><p>Bayangkan ini seperti fondasi saat membangun rumah. Dengan menguasai konsep dasar ini, materi lanjutan akan terasa jauh lebih mudah dan menyenangkan.</p><h3>Penjelasan Bertahap</h3><p>Berikut adalah poin-poin kunci yang perlu kamu perhatikan:</p><ul><li><strong>Konsep Utama:</strong> Dasar pengertian yang melandasi topik ini.</li><li><strong>Penerapan:</strong> Bagaimana konsep ini bekerja dalam kasus nyata.</li></ul><h3>Cek Pemahaman</h3><p>1. Apa fungsi utama konsep ini?<br/>2. Bagaimana jika diterapkan pada kasus sehari-hari?</p>`;
  }
  return 'Jawaban AI untuk ' + input.prompt;
}

function getFallbackMockJson(task: AiTaskType): any {
  if (task === 'json') {
    return {
      chapters: [
        {
          order: 1,
          title: 'Bab 1: Pengenalan dan Fondasi',
          summary: 'Ringkasan pengantar dan konsep kunci',
          keyConcepts: ['Definisi', 'Prinsip Dasar'],
        },
        {
          order: 2,
          title: 'Bab 2: Pembahasan Mendalam',
          summary: 'Analisis dan penerapan materi',
          keyConcepts: ['Metode', 'Contoh Nyata'],
        },
        {
          order: 3,
          title: 'Bab 3: Kesimpulan dan Rangkuman',
          summary: 'Rangkuman akhir dan latihan',
          keyConcepts: ['Ringkasan', 'Tips Belajar'],
        },
      ],
      quizzes: [
        {
          id: 'q1',
          type: 'multiple_choice',
          prompt: 'Apa fokus utama dari materi pada bab ini?',
          options: ['Memahami prinsip dasar', 'Hanya menghafal istilah', 'Mencari jawaban cepat', 'Tidak ada yang benar'],
          answer: 'Memahami prinsip dasar',
          explanation: 'Materi ini menitikberatkan pada pemahaman konsep secara mendalam dan analogi terapan.',
        },
        {
          id: 'q2',
          type: 'true_false',
          prompt: 'Penerapan konsep secara bertahap mempermudah penguasaan materi.',
          options: ['Benar', 'Salah'],
          answer: true,
          explanation: 'Belajar secara terstruktur dan bertahap memperkuat memori jangka panjang.',
        },
        {
          id: 'q3',
          type: 'short_essay',
          prompt: 'Jelaskan dengan kata-katamu sendiri mengapa konsep ini bermanfaat dalam kehidupan sehari-hari!',
          answer: 'Konsep ini memberikan cara berpikir sistematis dan efisien dalam menyelesaikan masalah.',
          explanation: 'Jawaban yang baik mencakup manfaat praktis dan contoh relevan.',
        },
      ],
      flashcards: [
        {
          id: 'fc1',
          front: 'Apa definisi utama dari topik ini?',
          back: 'Suatu kerangka kerja untuk memahami dan memecahkan permasalahan secara terstruktur.',
        },
        {
          id: 'fc2',
          front: 'Sebutkan dua manfaat utama yang diperoleh!',
          back: '1. Pemahaman mendalam\n2. Kemampuan memecahkan masalah dengan cepat dan tepat.',
        },
      ],
      swipeStatements: [
        {
          id: 'sw1',
          statement: 'Metode pengulangan terjadwal (SM-2) membantu mengingat informasi lebih tahan lama.',
          isTrue: true,
          explanation: 'SM-2 mengoptimalkan interval pengulangan tepat sebelum informasi terlupakan.',
        },
        {
          id: 'sw2',
          statement: 'Membaca materi sekali saja sudah cukup untuk menguasai topik yang rumit.',
          isTrue: false,
          explanation: 'Pengulangan berkala dan latihan kuis diperlukan untuk pemahaman permanen.',
        },
      ],
    };
  }
  return {};
}
