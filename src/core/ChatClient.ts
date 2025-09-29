/**
 * Chat client interface for decoupling UI from core implementation
 */

import type { Message, StreamEvent, ContentBlock } from './types.js';

/**
 * Abstract interface for chat clients
 * This allows UI to work with any chat implementation, not just Anthropic
 */
export interface ChatClient {
  /**
   * Initialize the chat client
   */
  initialize(): Promise<void>;

  /**
   * Send a message and stream responses
   */
  sendMessageStream(
    message: string | ContentBlock[],
    signal: AbortSignal
  ): AsyncGenerator<StreamEvent>;

  /**
   * Get conversation history
   */
  getHistory(): Message[];

  /**
   * Clear conversation history
   */
  clearHistory(): void;

  /**
   * Set conversation history
   */
  setHistory(history: Message[]): void;

  /**
   * Get a specific tool result by ID
   */
  getToolResult?(toolUseId: string): any;

  /**
   * Get the last message in history
   */
  getLastMessage(): Message | undefined;

  /**
   * Remove the last message from history
   */
  removeLastMessage(): void;

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean;
}

/**
 * Factory for creating chat clients
 */
export interface ChatClientFactory {
  create(): Promise<ChatClient>;
}