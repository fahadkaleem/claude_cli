import type { ToolCall } from '../../tools/core/types.js';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string; // Content sent to API (with expanded @filepaths)
  displayContent?: string; // Optional display version (with placeholders like [Image #1])
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

export interface Colors {
	white: string;
	black: string;
	primary: string;
	tool: string;
	secondary: string;
	success: string;
	error: string;
	info: string;
	warning: string;
	shell: string;
	diffAdded: string;
	diffRemoved: string;
	diffAddedText: string;
	diffRemovedText: string;
}

export interface Theme {
	name: string;
	displayName: string;
	colors: Colors;
}

export type ThemePreset =
	| 'alfred'
	| 'tokyo-night'
	| 'synthwave-84'
	| 'forest-night'
	| 'material-ocean'
	| 'sunset-glow'
	| 'nord-frost'
	| 'rose-pine-dawn'
	| 'neon-jungle'
	| 'midnight-amethyst'
	| 'desert-mirage'
	| 'cherry-blossom'
	| 'electric-storm'
	| 'deep-sea'
	| 'volcanic-ash'
	| 'cyberpunk-mint';

