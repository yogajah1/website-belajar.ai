export type AiTaskType = 'longform' | 'json' | 'grade' | 'chat' | 'exam';

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiInput {
  systemPrompt?: string;
  prompt: string;
  messages?: AiChatMessage[];
  responseFormat?: 'text' | 'json';
  maxTokens?: number;
  temperature?: number;
}

export interface AiProvider {
  name: string;
  isConfigured: () => boolean;
  call: (input: AiInput) => Promise<string>;
  stream?: (input: AiInput, onChunk: (chunk: string) => void) => Promise<string>;
}

export interface ProviderStatus {
  name: string;
  configured: boolean;
  model: string;
  inCooldown: boolean;
  cooldownRemainingSeconds: number;
  lastError?: string;
  lastSuccess?: number;
}
