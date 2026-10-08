import { AiInput, AiProvider } from './types';

export const openrouterProvider: AiProvider = {
  name: 'openrouter',
  isConfigured: () => Boolean(process.env.OPENROUTER_API_KEY),

  call: async (input: AiInput): Promise<string> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      const err: any = new Error('OPENROUTER_API_KEY is not configured');
      err.status = 500;
      throw err;
    }

    const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
    const messages: any[] = [];

    if (input.systemPrompt) {
      messages.push({ role: 'system', content: input.systemPrompt });
    }

    if (input.messages && input.messages.length > 0) {
      input.messages.forEach((m) => messages.push({ role: m.role, content: m.content }));
    } else {
      messages.push({ role: 'user', content: input.prompt });
    }

    const payload: any = {
      model,
      messages,
      temperature: input.temperature ?? 0.7,
    };
    if (input.maxTokens) payload.max_tokens = input.maxTokens;
    if (input.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://belajarquest.ai',
        'X-Title': 'BelajarQuest',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text();
      const err: any = new Error(`OpenRouter error (${response.status}): ${errBody}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) {
      const err: any = new Error('Empty response from OpenRouter');
      err.status = 500;
      throw err;
    }
    return content;
  },

  stream: async (input: AiInput, onChunk: (chunk: string) => void): Promise<string> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      const err: any = new Error('OPENROUTER_API_KEY is not configured');
      err.status = 500;
      throw err;
    }

    const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
    const messages: any[] = [];
    if (input.systemPrompt) {
      messages.push({ role: 'system', content: input.systemPrompt });
    }
    if (input.messages && input.messages.length > 0) {
      input.messages.forEach((m) => messages.push({ role: m.role, content: m.content }));
    } else {
      messages.push({ role: 'user', content: input.prompt });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://belajarquest.ai',
        'X-Title': 'BelajarQuest',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: input.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      const err: any = new Error(`OpenRouter stream error (${response.status}): ${errBody}`);
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
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          const jsonStr = line.replace('data: ', '').trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              const delta = data.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullText += delta;
                onChunk(delta);
              }
            } catch (e) {}
          }
        }
      }
    }

    return fullText;
  },
};
