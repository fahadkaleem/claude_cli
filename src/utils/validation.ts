/**
 * Response validation utilities for API responses
 */

import type {
  AnthropicResponse,
  ContentBlock,
  Message,
  TextBlock,
  ToolUseBlock,
  ToolResultBlock
} from '../core/types.js';
import { InvalidResponseError } from './errors.js';

/**
 * Check if a content block is a text block
 */
export function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === 'text';
}

/**
 * Check if a content block is a tool use block
 */
export function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === 'tool_use';
}

/**
 * Check if a content block is a tool result block
 */
export function isToolResultBlock(block: ContentBlock): block is ToolResultBlock {
  return block.type === 'tool_result';
}

/**
 * Validate a single content block
 */
export function isValidContentBlock(block: ContentBlock): boolean {
  if (!block || typeof block !== 'object') {
    return false;
  }

  // Check for empty object
  if (Object.keys(block).length === 0) {
    return false;
  }

  // Validate text blocks
  if (isTextBlock(block)) {
    // Empty text is invalid (unless it's intentionally empty like a thinking block)
    if (block.text === '') {
      return false;
    }
    return true;
  }

  // Validate tool use blocks
  if (isToolUseBlock(block)) {
    if (!block.id || !block.name) {
      return false;
    }
    return true;
  }

  // Validate tool result blocks
  if (isToolResultBlock(block)) {
    if (!block.tool_use_id) {
      return false;
    }
    // Tool results can have empty content in case of errors
    return true;
  }

  // Unknown block type
  return false;
}

/**
 * Validate an array of content blocks
 */
export function isValidContentBlockArray(blocks: ContentBlock[]): boolean {
  if (!Array.isArray(blocks)) {
    return false;
  }

  // Empty array is invalid for responses (but valid for user messages)
  if (blocks.length === 0) {
    return false;
  }

  // All blocks must be valid
  return blocks.every(block => isValidContentBlock(block));
}

/**
 * Validate an Anthropic API response
 */
export function isValidResponse(response: AnthropicResponse): boolean {
  if (!response) {
    return false;
  }

  // Must have content
  if (!response.content) {
    return false;
  }

  // Content must be valid
  if (!isValidContentBlockArray(response.content)) {
    return false;
  }

  // Must have a valid role
  if (response.role !== 'assistant') {
    return false;
  }

  // If there's a stop reason, it should be valid
  const validStopReasons = ['end_turn', 'max_tokens', 'stop_sequence', 'tool_use'];
  if (response.stop_reason && !validStopReasons.includes(response.stop_reason)) {
    return false;
  }

  return true;
}

/**
 * Check if response contains only valid text (no empty text blocks)
 */
export function hasValidTextContent(response: AnthropicResponse): boolean {
  const textBlocks = response.content.filter(isTextBlock);

  if (textBlocks.length === 0) {
    // No text blocks is valid if there are tool use blocks
    return response.content.some(isToolUseBlock);
  }

  // All text blocks must have non-empty text
  return textBlocks.every(block => block.text && block.text.trim().length > 0);
}

/**
 * Validate a message for inclusion in history
 */
export function isValidMessage(message: Message): boolean {
  if (!message) {
    return false;
  }

  // Check role
  if (message.role !== 'user' && message.role !== 'assistant') {
    return false;
  }

  // Check content
  if (typeof message.content === 'string') {
    // String content can be empty for user messages (e.g., continuing after tools)
    return true;
  }

  if (Array.isArray(message.content)) {
    // For assistant messages, content must not be empty
    if (message.role === 'assistant' && message.content.length === 0) {
      return false;
    }

    // All blocks must be valid
    return message.content.every(block => isValidContentBlock(block));
  }

  return false;
}

/**
 * Validate conversation history
 */
export function validateHistory(history: Message[]): void {
  if (!Array.isArray(history)) {
    throw new InvalidResponseError('History must be an array');
  }

  // Check each message
  for (let i = 0; i < history.length; i++) {
    const message = history[i];

    if (!message) {
      throw new InvalidResponseError(`History contains null/undefined at index ${i}`);
    }

    // Validate role
    if (message.role !== 'user' && message.role !== 'assistant') {
      throw new InvalidResponseError(
        `Invalid role "${message.role}" at index ${i}. Must be 'user' or 'assistant'`
      );
    }

    // Don't validate content strictness here as empty messages might be valid in certain contexts
  }

  // Check for alternating roles
  let lastRole: 'user' | 'assistant' | null = null;

  for (let i = 0; i < history.length; i++) {
    const message = history[i];

    if (lastRole === message.role) {
      // Allow consecutive messages of the same role but log a warning
      console.warn(`Warning: Consecutive ${message.role} messages at index ${i}`);
    }

    lastRole = message.role;
  }
}

/**
 * Extract only valid messages from history (curated history)
 * This filters out invalid or empty assistant responses
 */
export function extractValidHistory(history: Message[]): Message[] {
  const validHistory: Message[] = [];
  let i = 0;

  while (i < history.length) {
    const message = history[i];

    if (message.role === 'user') {
      // User messages are always included
      validHistory.push(message);
      i++;
    } else if (message.role === 'assistant') {
      // For assistant messages, check if they're valid
      if (isValidMessage(message)) {
        // Check if content is not empty or invalid
        if (typeof message.content === 'string') {
          if (message.content.trim().length > 0) {
            validHistory.push(message);
          }
        } else if (Array.isArray(message.content)) {
          // Must have at least some valid content
          const hasValidContent = message.content.some(block => {
            if (isTextBlock(block)) {
              return block.text && block.text.trim().length > 0;
            }
            if (isToolUseBlock(block)) {
              return true; // Tool use blocks are always valid if well-formed
            }
            return false;
          });

          if (hasValidContent) {
            validHistory.push(message);
          }
        }
      }
      i++;
    } else {
      // Skip unknown roles
      i++;
    }
  }

  return validHistory;
}

/**
 * Check if a response indicates the stream ended properly
 */
export function isCompleteResponse(
  response: AnthropicResponse,
  hasToolCalls: boolean = false
): boolean {
  // Tool calls don't always have explicit finish reasons
  if (hasToolCalls) {
    return true;
  }

  // Must have a stop reason
  if (!response.stop_reason) {
    return false;
  }

  // Must have some content (text or tools)
  const hasText = response.content.some(block =>
    isTextBlock(block) && block.text && block.text.trim().length > 0
  );
  const hasTools = response.content.some(isToolUseBlock);

  return hasText || hasTools;
}

/**
 * Consolidate consecutive text blocks into single blocks
 */
export function consolidateTextBlocks(blocks: ContentBlock[]): ContentBlock[] {
  const consolidated: ContentBlock[] = [];

  for (const block of blocks) {
    const lastBlock = consolidated[consolidated.length - 1];

    // If both are text blocks, merge them
    if (
      lastBlock &&
      isTextBlock(lastBlock) &&
      isTextBlock(block)
    ) {
      lastBlock.text += block.text;
    } else {
      // Otherwise, add as new block
      consolidated.push(block);
    }
  }

  return consolidated;
}

/**
 * Validate that a message can be added to the current history
 * Ensures proper message ordering and format
 */
export function canAddToHistory(
  history: Message[],
  newMessage: Message
): { valid: boolean; reason?: string } {
  // Check if message is valid
  if (!isValidMessage(newMessage)) {
    return { valid: false, reason: 'Invalid message format' };
  }

  // If history is empty, any valid message can be added
  if (history.length === 0) {
    return { valid: true };
  }

  const lastMessage = history[history.length - 1];

  // Check if we have a pending tool call that needs a response
  if (lastMessage.role === 'assistant' && Array.isArray(lastMessage.content)) {
    const hasToolCall = lastMessage.content.some(isToolUseBlock);

    if (hasToolCall && newMessage.role === 'assistant') {
      return {
        valid: false,
        reason: 'Tool call must be followed by user message with tool results'
      };
    }
  }

  // Check if we have tool results that need a model response
  if (lastMessage.role === 'user' && Array.isArray(lastMessage.content)) {
    const hasToolResult = lastMessage.content.some(isToolResultBlock);

    if (hasToolResult && newMessage.role === 'user') {
      return {
        valid: false,
        reason: 'Tool results must be followed by assistant message'
      };
    }
  }

  return { valid: true };
}