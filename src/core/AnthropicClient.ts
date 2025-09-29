/**
 * AnthropicClient - High-level orchestration
 *
 * Handles the full agentic loop:
 * 1. User sends message
 * 2. Turn makes API call
 * 3. IF tools requested: execute them and loop back to step 2
 * 4. ELSE: done
 */

import { AnthropicChat } from './AnthropicChat.js';
import { Turn } from './Turn.js';
import { ChatClient } from './ChatClient.js';
import type { Config } from '../config/Config.js';
import type { ToolExecutor } from '../tools/core/ToolExecutor.js';
import {
  StreamEvent,
  EventType,
  Message,
  ContentBlock,
  ToolResultBlock
} from './types.js';

const MAX_TURNS = 100;

export class AnthropicClient implements ChatClient {
  private chat?: AnthropicChat;
  private toolExecutor: ToolExecutor;
  // Map of tool_use_id -> full ToolResult with returnDisplay
  private toolResultsMap: Map<string, any> = new Map();

  constructor(private readonly config: Config) {
    this.toolExecutor = config.getToolExecutor();
  }

  async initialize(): Promise<void> {
    const tools = this.config.getToolRegistry().getSchemas();
    const systemPrompt = await this.config.getPromptService().getSystemPrompt(tools.length);

    this.chat = new AnthropicChat(
      this.config,
      systemPrompt,
      []
    );
  }

  /**
   * Send message and handle full agentic loop
   *
   * Flow:
   * 1. Create Turn and get response
   * 2. If response has tool_use: execute tools, add results to history, goto 1
   * 3. Else: done
   */
  async *sendMessageStream(
    message: string | ContentBlock[],
    signal: AbortSignal,
    maxTurns: number = MAX_TURNS
  ): AsyncGenerator<StreamEvent> {
    if (!this.chat) {
      throw new Error('Client not initialized');
    }

    if (maxTurns <= 0) {
      return;
    }

    if (signal.aborted) {
      return;
    }

    try {
      const tools = this.config.getToolRegistry().getSchemas();
      const promptId = Date.now().toString();

      // Create turn and run it (ONE API call)
      const turn = new Turn(this.chat, promptId);

      yield* turn.run(
        this.config.getModel(),
        message,
        tools,
        this.config.getMaxTokens(),
        signal
      );

      // Check if we need to execute tools and continue
      if (turn.pendingToolCalls.length > 0 && turn.stopReason === 'tool_use') {
        // Execute all tools
        const toolResults: ToolResultBlock[] = [];

        for (const toolBlock of turn.pendingToolCalls) {
          if (signal.aborted) {
            return;
          }

          // Emit executing event
          yield {
            type: EventType.ToolExecuting,
            toolCall: {
              id: toolBlock.id,
              name: toolBlock.name,
              input: toolBlock.input,
              status: 'executing'
            }
          };

          // Execute tool
          const result = await this.toolExecutor.execute(toolBlock.name, toolBlock.input);
          this.config.getMessageLogger().logToolExecution(toolBlock.name, toolBlock.input, result);

          // Store tool result for UI display
          this.toolResultsMap.set(toolBlock.id, result);

          // Emit complete event
          yield {
            type: EventType.ToolComplete,
            toolCall: {
              id: toolBlock.id,
              name: toolBlock.name,
              input: toolBlock.input,
              status: result.error ? 'failed' : 'completed',
              result
            }
          };

          // Build tool result block
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: result.llmContent,
            is_error: result.error !== undefined
          });
        }

        // Add tool results to history
        if (toolResults.length > 0) {
          const toolResultMessage: Message = {
            role: 'user',
            content: toolResults as any,
            timestamp: new Date()
          };
          this.chat.addMessage(toolResultMessage);
        }

        // Emit thinking
        yield { type: EventType.Thinking };

        // Recursively continue with next turn
        // History now has tool results, so we send empty message
        yield* this.sendMessageStream(
          [],  // Empty ContentBlock[] - history has everything
          signal,
          maxTurns - 1
        );
      } else {
        // No more tools to execute - we're done!
        yield { type: EventType.Complete };
      }

    } catch (error) {
      yield {
        type: EventType.Error,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }

  getHistory(): Message[] {
    return this.chat?.getHistory() || [];
  }

  clearHistory(): void {
    this.chat?.clearHistory();
    this.toolResultsMap.clear();
  }

  getToolResult(toolUseId: string): any {
    return this.toolResultsMap.get(toolUseId);
  }

  setHistory(history: Message[]): void {
    this.chat?.setHistory(history);
  }

  getLastMessage(): Message | undefined {
    return this.chat?.getLastMessage();
  }

  removeLastMessage(): void {
    this.chat?.removeLastMessage();
  }

  getChat(): AnthropicChat | undefined {
    return this.chat;
  }

  isInitialized(): boolean {
    return this.chat !== undefined;
  }
}