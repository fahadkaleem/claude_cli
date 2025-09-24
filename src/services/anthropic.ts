import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ContentBlock, TextBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import { Message } from '../types';
import { getConfig } from './config.js';
import { toolRegistry } from '../tools/core/ToolRegistry.js';
import { toolExecutor } from '../tools/core/ToolExecutor.js';
import { ToolCall, ToolStatus } from '../tools/core/types.js';
import { promptService } from './PromptService.js';

// Clean type definitions with proper discriminated unions
export interface AssistantStep {
  type: 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolExecutingStep {
  type: 'tool-executing';
  toolCall: ToolCall;
}

export interface ToolCompleteStep {
  type: 'tool-complete';
  toolCall: ToolCall;
}

export interface ThinkingStep {
  type: 'thinking';
}

export interface CompleteStep {
  type: 'complete';
}

export type AgentStep =
  | AssistantStep
  | ToolExecutingStep
  | ToolCompleteStep
  | ThinkingStep
  | CompleteStep;

/**
 * Main chat service that handles message ordering and tool execution.
 * Inspired by Gemini's clean architecture.
 */
export class ChatService {
  private client: Anthropic | null = null;

  // Promise chain to ensure messages are processed in order (like Gemini)
  private sendPromise: Promise<void> = Promise.resolve();

  // Current conversation messages
  private messages: Message[] = [];

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    if (!this.client) {
      const config = getConfig();
      this.client = new Anthropic({ apiKey: config.apiKey });
    }
  }


  /**
   * Formats messages for the Anthropic API
   */
  private formatMessagesForAPI(messages: Message[]): MessageParam[] {
    return messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
  }

  /**
   * Processes tool use blocks and executes tools
   */
  private async* processToolCalls(
    toolUseBlocks: ToolUseBlock[]
  ): AsyncGenerator<ToolExecutingStep | ToolCompleteStep> {
    for (const block of toolUseBlocks) {
      const toolCall: ToolCall = {
        id: block.id,
        name: block.name,
        input: block.input,
        status: ToolStatus.Executing
      };

      // Yield executing status
      yield { type: 'tool-executing', toolCall };

      // Execute the tool
      const result = await toolExecutor.execute(toolCall.name, toolCall.input);

      // Update tool call with result
      toolCall.result = result;
      toolCall.status = result.success ? ToolStatus.Completed : ToolStatus.Failed;

      // Yield complete status
      yield { type: 'tool-complete', toolCall };
    }
  }


  /**
   * Add a user message immediately to the conversation
   */
  addUserMessage(content: string): void {
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    this.messages.push(userMessage);
  }

  /**
   * Main method to send a message and handle the response.
   * Uses promise chaining to ensure messages are processed in order.
   */
  async* sendMessage(content: string): AsyncGenerator<AgentStep> {
    // Chain this send operation to ensure ordering
    const streamGenerator = this.executeMessageFlow(content);

    // Use the promise chain pattern from Gemini
    const previousPromise = this.sendPromise;

    // Create a promise that will resolve when this message is done
    let resolveSend: () => void;
    const sendComplete = new Promise<void>(resolve => {
      resolveSend = resolve;
    });

    this.sendPromise = sendComplete;

    try {
      // Wait for previous message to complete
      await previousPromise;

      // Now process this message
      for await (const step of streamGenerator) {
        yield step;
      }
    } finally {
      // Mark this message as complete
      resolveSend!();
    }
  }

  /**
   * The actual message flow execution
   */
  private async* executeMessageFlow(content: string): AsyncGenerator<AgentStep> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const config = getConfig();

    // Check if user message was already added
    const lastMessage = this.messages[this.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== content) {
      // Add user message to conversation if not already added
      const userMessage: Message = {
        role: 'user',
        content,
        timestamp: new Date()
      };
      this.messages.push(userMessage);
    }

    try {
      // Get tool schemas
      const tools = toolRegistry.getSchemas();

      // Get system prompt with context
      const systemPrompt = promptService.getSystemPrompt(tools.length);

      // Make initial API call
      const response = await this.client.messages.create({
        model: config.model,
        max_tokens: config.maxTokens || 4096,
        system: systemPrompt,
        messages: this.formatMessagesForAPI(this.messages),
        tools: tools.length > 0 ? tools : undefined,
      });

      // Process response with proper types
      const textBlocks = response.content.filter(
        block => block.type === 'text'
      ) as TextBlock[];
      const toolUseBlocks = response.content.filter(
        block => block.type === 'tool_use'
      ) as ToolUseBlock[];

      // Get text content
      const textContent = textBlocks.map(block => block.text).join('');

      // Prepare tool calls if any
      let pendingToolCalls: ToolCall[] | undefined;
      if (toolUseBlocks.length > 0) {
        pendingToolCalls = toolUseBlocks.map(block => ({
          id: block.id,
          name: block.name,
          input: block.input,
          status: ToolStatus.Pending,
          result: undefined
        }));
      }

      // Yield assistant response with pending tools
      yield {
        type: 'assistant',
        content: textContent,
        toolCalls: pendingToolCalls
      };

      // Add assistant message to history
      const assistantMessage: Message = {
        role: 'assistant',
        content: textContent,
        timestamp: new Date(),
        toolCalls: pendingToolCalls
      };
      this.messages.push(assistantMessage);

      // Continue processing tool calls until done
      let currentResponse = response;
      let continueLoop = toolUseBlocks.length > 0;

      while (continueLoop) {
        // Get current tool use blocks
        const currentToolBlocks = currentResponse.content.filter(
          block => block.type === 'tool_use'
        ) as ToolUseBlock[];

        if (currentToolBlocks.length === 0) {
          break;
        }

        const executedToolCalls: ToolCall[] = [];

        // Process each tool
        for await (const step of this.processToolCalls(currentToolBlocks)) {
          yield step;

          if (step.type === 'tool-complete') {
            executedToolCalls.push(step.toolCall);
          }
        }

        // Build tool results as user message content
        const toolResultContent = executedToolCalls.map(call => ({
          type: 'tool_result' as const,
          tool_use_id: call.id,
          content: call.result?.output ? JSON.stringify(call.result.output) : 'No output'
        }));

        // Send tool results back to the model
        yield { type: 'thinking' };

        const followUpResponse = await this.client.messages.create({
          model: config.model,
          max_tokens: config.maxTokens || 4096,
          system: systemPrompt,
          messages: [
            ...this.formatMessagesForAPI(this.messages),
            {
              role: 'assistant' as const,
              content: currentResponse.content
            },
            {
              role: 'user' as const,
              content: toolResultContent
            }
          ],
          tools: tools.length > 0 ? tools : undefined,
        });

        // Check stop reason
        const stopReason = (followUpResponse as any).stop_reason;

        // Process follow-up response
        const followUpTextBlocks = followUpResponse.content
          .filter(block => block.type === 'text') as TextBlock[];
        const followUpToolBlocks = followUpResponse.content
          .filter(block => block.type === 'tool_use') as ToolUseBlock[];

        const followUpText = followUpTextBlocks
          .map(block => block.text)
          .join('');

        // Prepare tool calls for display
        let newToolCalls: ToolCall[] | undefined;
        if (followUpToolBlocks.length > 0) {
          newToolCalls = followUpToolBlocks.map(block => ({
            id: block.id,
            name: block.name,
            input: block.input,
            status: ToolStatus.Pending,
            result: undefined
          }));
        }

        if (followUpText || newToolCalls) {
          yield {
            type: 'assistant',
            content: followUpText,
            toolCalls: newToolCalls
          };

          // Add follow-up to history
          this.messages.push({
            role: 'assistant',
            content: followUpText,
            timestamp: new Date(),
            toolCalls: newToolCalls
          });
        }

        // Continue if there are more tools to execute
        currentResponse = followUpResponse;
        continueLoop = followUpToolBlocks.length > 0 || stopReason === 'tool_use';
      }

      yield { type: 'complete' };

    } catch (error) {
      // Remove the user message if there was an error
      if (this.messages[this.messages.length - 1]?.role === 'user') {
        this.messages.pop();
      }
      throw error;
    }
  }

  /**
   * Gets the current conversation messages
   */
  getMessages(): Message[] {
    return [...this.messages]; // Return a copy
  }

  /**
   * Clears the conversation
   */
  clearMessages(): void {
    this.messages = [];
  }
}

// Singleton instance
export const chatService = new ChatService();

// Legacy function for backward compatibility
export async function* executeAgentLoop(messages: Message[]): AsyncGenerator<AgentStep> {
  // For now, just use the last message as the new input
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();

  if (lastUserMessage) {
    for await (const step of chatService.sendMessage(lastUserMessage.content)) {
      yield step;
    }
  }
}