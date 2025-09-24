import type { ToolCall } from '../tools/core/types.js';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  toolCalls?: ToolCall[];
  queued?: boolean; // Indicates message is queued while AI is processing
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface Config {
  apiKey: string;
  model: string;
  maxTokens?: number;
}

export interface CliArgs {
  model?: string;
  help?: boolean;
  version?: boolean;
}