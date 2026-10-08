import { AiInput, AiProvider } from './types';

export const geminiProvider: AiProvider = {
  name: 'gemini',
  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),

  call: async (input: AiInput): Promise<string> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const err: any = new Error('GEMINI_API_KEY is not configured');
      err.status = 500;
      throw err;
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents: any[] = [];

    // System instruction
    const systemInstruction = input.systemPrompt
      ? { parts: [{ text: input.systemPrompt }] }
      : undefined;

    if (input.messages && input.messages.length > 0) {
      input.messages.forEach((m) => {
        if (m.role === 'system') return;
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: input.prompt }],
      });
    }

    const generationConfig: any = {
      temperature: input.temperature ?? 0.7,
    };
    if (input.maxTokens) {
      generationConfig.maxOutputTokens = input.maxTokens;
    }
    if (input.responseFormat === 'json') {
      generationConfig.responseMimeType = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction,
        contents,
        generationConfig,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      const err: any = new Error(`Gemini error (${response.status}): ${errBody}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';
    if (!text) {
      const err: any = new Error('Empty response from Gemini');
      err.status = 500;
      throw err;
    }
    return text;
  },

  stream: async (input: AiInput, onChunk: (chunk: string) => void): Promise<string> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const err: any = new Error('GEMINI_API_KEY is not configured');
      err.status = 500;
      throw err;
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const contents: any[] = [];
    const systemInstruction = input.systemPrompt
      ? { parts: [{ text: input.systemPrompt }] }
      : undefined;

    if (input.messages && input.messages.length > 0) {
      input.messages.forEach((m) => {
        if (m.role === 'system') return;
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: input.prompt }],
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction,
        contents,
        generationConfig: {
          temperature: input.temperature ?? 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      const err: any = new Error(`Gemini stream error (${response.status}): ${errBody}`);
      err.status = response.status;
      throw err;
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader from stream');

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.replace('data: ', '').trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              const part = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (part) {
                fullText += part;
                onChunk(part);
              }
            } catch (e) {}
          }
        }
      }
    }

    return fullText;
  },
};
