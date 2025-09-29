export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Message format (matches Anthropic API)
 *
 * User messages can be simple strings or ContentBlock arrays.
 * Assistant messages are always ContentBlock arrays.
 */
export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
  timestamp?: Date;
  displayContent?: string;  // For UI display (with placeholders, etc.)
}

/**
 * Stop reasons from Anthropic API
 */
export type StopReason =
  | 'end_turn'      // Model completed its turn naturally
  | 'tool_use'      // Model wants to use tools
  | 'max_tokens'    // Hit token limit
  | 'stop_sequence' // Hit stop sequence
  | null;           // Stream not finished yet

/**
 * Anthropic API Response
 */
export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  stop_reason: StopReason;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
}

/**
 * Tool schema for Anthropic API
 */
export interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Event types for streaming to UI
 *
 * These events are emitted during agent execution to update the UI.
 */
export enum EventType {
  /** Text content from the model */
  Content = 'content',

  /** Tool is being executed */
  ToolExecuting = 'tool-executing',

  /** Tool execution completed */
  ToolComplete = 'tool-complete',

  /** Model is thinking (between tool execution and next response) */
  Thinking = 'thinking',

  /** Turn completed */
  Complete = 'complete',

  /** Error occurred */
  Error = 'error'
}

/**
 * Tool call information for UI
 */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: 'executing' | 'completed' | 'failed';
  result?: {
    llmContent: string;
    returnDisplay?: unknown;
    error?: {
      message: string;
      type?: string;
    };
  };
}

/**
 * Stream events - discriminated union for type safety
 */
export type StreamEvent =
  | ContentEvent
  | ToolExecutingEvent
  | ToolCompleteEvent
  | ThinkingEvent
  | CompleteEvent
  | ErrorEvent;

export interface ContentEvent {
  type: EventType.Content;
  content: string;
}

export interface ToolExecutingEvent {
  type: EventType.ToolExecuting;
  toolCall: ToolCall;
}

export interface ToolCompleteEvent {
  type: EventType.ToolComplete;
  toolCall: ToolCall;
}

export interface ThinkingEvent {
  type: EventType.Thinking;
}

export interface CompleteEvent {
  type: EventType.Complete;
}

export interface ErrorEvent {
  type: EventType.Error;
  error: {
    message: string;
    stack?: string;
  };
}

/**
 * Configuration for AnthropicClient
 */
export interface ClientConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
}

/**
 * Utility type: Extract text from ContentBlock[]
 */
export function extractText(content: ContentBlock[]): string {
  return content
    .filter((block): block is TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');
}

/**
 * Utility type: Extract tool use blocks
 */
export function extractToolUseBlocks(content: ContentBlock[]): ToolUseBlock[] {
  return content.filter((block): block is ToolUseBlock => block.type === 'tool_use');
}

/**
 * Utility: Check if content is string or ContentBlock[]
 */
export function isContentBlockArray(content: string | ContentBlock[]): content is ContentBlock[] {
  return Array.isArray(content);
}

/**
 * Utility: Convert string to ContentBlock[]
 */
export function stringToContentBlocks(text: string): ContentBlock[] {
  // Don't create empty text blocks - Anthropic API rejects them
  if (!text || text.trim().length === 0) {
    return [];
  }
  return [{ type: 'text', text }];
}