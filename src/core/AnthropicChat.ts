import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import {
  Message,
  ContentBlock,
  AnthropicResponse,
  ToolSchema,
  isContentBlockArray,
  stringToContentBlocks
} from './types.js';
import { consolidateTextBlocks, extractValidHistory } from '../utils/validation.js';
import { MessageLogger } from '../services/logging/MessageLogger.js';
import { Config } from '../config/Config.js';

export class AnthropicChat {
  private client: Anthropic;
  private history: Message[] = [];
  private messageLogger: MessageLogger;


  constructor(
    private config: Config,
    private systemPrompt: string,
    initialHistory: Message[] = []
  ) {
    this.client = new Anthropic({ apiKey: config.getApiKey() });
    this.history = [...initialHistory];
    this.messageLogger = config.getMessageLogger();

  }

  /**
   * Send a message to the API and get response
   */
  async sendMessage(
    model: string,
    message: string | ContentBlock[],
    tools: ToolSchema[],
    maxTokens: number = 4096
  ): Promise<AnthropicResponse> {
    // Add user message to history
    if (message) {
      const userMessage: Message = {
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      this.history.push(userMessage);
    }

    // Format messages for API
    const apiMessages = this.formatMessagesForAPI(this.history);

    // Log request
    this.messageLogger.logRequest(apiMessages, tools);

    // Make API call
    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      system: this.systemPrompt,
      messages: apiMessages,
      tools: tools.length > 0 ? tools : undefined
    });

    // Log response
    this.messageLogger.logResponse(response as AnthropicResponse);

    // Convert to our AnthropicResponse type
    const typedResponse: AnthropicResponse = {
      id: response.id,
      type: 'message',
      role: 'assistant',
      content: response.content as ContentBlock[],
      stop_reason: response.stop_reason as any,
      stop_sequence: response.stop_sequence,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      },
      model: response.model
    };

    // Consolidate text blocks
    const consolidatedContent = consolidateTextBlocks(typedResponse.content);
    typedResponse.content = consolidatedContent;

    // Store response in history
    const assistantMessage: Message = {
      role: 'assistant',
      content: typedResponse.content,
      timestamp: new Date()
    };
    this.history.push(assistantMessage);

    return typedResponse;
  }

  /**
   * Format messages for Anthropic API
   *
   * Converts our Message[] to MessageParam[] format expected by API.
   * Removes timestamps and other internal fields.
   * Filters out invalid/empty messages to prevent API errors.
   */
  private formatMessagesForAPI(messages: Message[]): MessageParam[] {
    // First, extract only valid messages
    const validMessages = extractValidHistory(messages);

    return validMessages.map(msg => {
      // Convert string content to ContentBlock[] if needed
      let content = msg.content;
      if (typeof content === 'string') {
        content = stringToContentBlocks(content);
      }

      return {
        role: msg.role,
        content: content
      };
    });
  }

  /**
   * Add a message to history directly
   *
   * Useful for adding tool results without making an API call.
   */
  addMessage(message: Message): void {
    this.history.push(message);
  }

  /**
   * Get current conversation history
   *
   * Returns a copy to prevent external mutation.
   */
  getHistory(): Message[] {
    return structuredClone(this.history);
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Set history to a specific state
   *
   * Useful for restoring from saved state.
   */
  setHistory(history: Message[]): void {
    this.history = [...history];
  }

  /**
   * Get the last message in history
   */
  getLastMessage(): Message | undefined {
    return this.history[this.history.length - 1];
  }

  /**
   * Remove last message from history
   *
   * Useful when aborting a response.
   */
  removeLastMessage(): void {
    if (this.history.length > 0) {
      this.history.pop();
    }
  }

  /**
   * Get history formatted for debugging
   */
  getHistoryDebug(): string {
    return this.history
      .map((msg, i) => {
        const contentStr = typeof msg.content === 'string'
          ? msg.content.slice(0, 100)
          : JSON.stringify(msg.content).slice(0, 100);

        return `${i + 1}. [${msg.role}] ${contentStr}...`;
      })
      .join('\n');
  }
}