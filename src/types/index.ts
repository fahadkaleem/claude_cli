export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
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