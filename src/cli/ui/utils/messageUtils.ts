/**
 * Utilities for working with messages in both old and new formats
 */

import type { ContentBlock, TextBlock, ToolUseBlock } from '../../../core/types.js';

/**
 * Extract text content from a message
 *
 * Handles both old format (string) and new format (ContentBlock[])
 */
export function extractTextContent(content: string | ContentBlock[]): string {
  if (typeof content === 'string') {
    return content;
  }

  // Extract text from ContentBlock[]
  return content
    .filter((block): block is TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');
}

/**
 * Extract tool use blocks from a message
 */
export function extractToolUseBlocks(content: string | ContentBlock[]): ToolUseBlock[] {
  if (typeof content === 'string') {
    return [];
  }

  return content.filter((block): block is ToolUseBlock => block.type === 'tool_use');
}

/**
 * Check if message has tool calls
 */
export function hasToolCalls(content: string | ContentBlock[]): boolean {
  return extractToolUseBlocks(content).length > 0;
}

/**
 * Get display text for a message (truncated if needed)
 */
export function getDisplayText(content: string | ContentBlock[], maxLength: number = 100): string {
  const text = extractTextContent(content);
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

/**
 * Convert string to ContentBlock[] format
 */
export function stringToContentBlocks(text: string): ContentBlock[] {
  return [{ type: 'text', text }];
}

/**
 * Check if content is empty
 */
export function isEmptyContent(content: string | ContentBlock[]): boolean {
  if (typeof content === 'string') {
    return content.trim() === '';
  }

  const text = extractTextContent(content);
  return text.trim() === '';
}