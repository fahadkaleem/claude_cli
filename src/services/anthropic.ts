import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ContentBlock, TextBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import { Message } from '../cli/ui/types';
import { getConfig } from './config.js';
import { toolRegistry } from '../tools/core/ToolRegistry.js';
import { toolExecutor } from '../tools/core/ToolExecutor.js';
import { ToolCall, ToolStatus, type PermissionRequestData } from '../tools/core/types.js';
import { promptService } from './PromptService.js';
import { permissionManager } from './PermissionManager.js';
import { grantWritePermissionForOriginalDir } from '../tools/utils/permissions.js';

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

export interface ToolPermissionStep {
  type: 'tool-permission';
  toolCall: ToolCall;
  permissionData: import('../tools/core/types.js').PermissionRequestData;
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
  | ToolPermissionStep
  | ThinkingStep
  | CompleteStep;

/**
 * Main chat service that handles message ordering and tool execution.
 * Follows clean architecture principles.
 */
export class ChatService {
  private client: Anthropic | null = null;

  // Promise chain to ensure messages are processed in order
  private sendPromise: Promise<void> = Promise.resolve();

  // Current conversation messages
  private messages: Message[] = [];

  constructor() {
    this.initializeClient();
    this.setupPermissionHandler();
  }

  private abortController: AbortController | null = null;

  private setupPermissionHandler(): void {
    // NEW permission system handler
    toolExecutor.onConfirmationRequired = async (details) => {
      const confirmationId = `confirmation_${Date.now()}`;
      const outcome = await permissionManager.requestConfirmation(confirmationId, details);

      // If rejected, abort the conversation - don't send rejection to Claude
      if (outcome === 'cancel') {
        if (this.abortController) {
          this.abortController.abort();
        }
      }

      return outcome;
    };

    // OLD permission system handler (fallback)
    toolExecutor.onPermissionRequired = async (toolId: string, data: PermissionRequestData) => {
      const response = await permissionManager.requestPermission(toolId, data);

      // If rejected, abort the conversation - don't send rejection to Claude
      // User rejected for a reason, no need to continue the loop
      if (!response.approved) {
        // Abort the current operation so Claude doesn't get a response
        if (this.abortController) {
          this.abortController.abort();
        }
        return false;
      }

      // Only grant persistent permission if user chose "don't ask again"
      if (response.permanent) {
        // Grant permission to the original project directory for the session
        grantWritePermissionForOriginalDir();
      }

      // Return approval - for temporary, we just bypass the check this one time
      return true;
    };
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
      toolCall.status = result.error ? ToolStatus.Failed : ToolStatus.Completed;

      // Yield complete status
      yield { type: 'tool-complete', toolCall };
    }
  }


  /**
   * Add a user message immediately to the conversation
   * @param content Content for API (with expanded file paths)
   * @param displayContent Optional display version (with placeholders)
   */
  addUserMessage(content: string, displayContent?: string): void {
    const userMessage: Message = {
      role: 'user',
      content,
      displayContent,
      timestamp: new Date()
    };
    this.messages.push(userMessage);
  }

  addAssistantMessage(content: string, displayContent?: string): void {
    const assistantMessage: Message = {
      role: 'assistant',
      content,
      displayContent,
      timestamp: new Date()
    };
    this.messages.push(assistantMessage);
  }

  /**
   * Main method to send a message and handle the response.
   * Uses promise chaining to ensure messages are processed in order.
   */
  async* sendMessage(content: string, signal?: AbortSignal): AsyncGenerator<AgentStep> {
    // Chain this send operation to ensure ordering
    const streamGenerator = this.executeMessageFlow(content, signal);

    // Use the promise chain pattern for message ordering
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
        // Check if aborted
        if (signal?.aborted) {
          throw new Error('AbortError');
        }
        yield step;
      }
    } catch (error) {
      // Re-throw abort errors
      if (error instanceof Error && error.message === 'AbortError') {
        throw error;
      }
      throw error;
    } finally {
      // Mark this message as complete
      resolveSend!();
    }
  }

  /**
   * The actual message flow execution
   */
  private async* executeMessageFlow(content: string, signal?: AbortSignal): AsyncGenerator<AgentStep> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    // Create abort controller for this message flow
    this.abortController = new AbortController();
    const combinedSignal = signal || this.abortController.signal;

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
          // Always yield the step first (even if aborted) so UI can show rejection
          yield step;

          if (step.type === 'tool-complete') {
            executedToolCalls.push(step.toolCall);
          }

          // Check if operation was aborted AFTER yielding (e.g., user rejected permission)
          const isAborted = this.abortController?.signal.aborted || combinedSignal?.aborted;

          if (isAborted) {
            yield { type: 'complete' };
            return;
          }
        }

        // Build tool results as user message content
        const toolResultContent = executedToolCalls.map(call => {
          const result = call.result;
          if (!result) {
            return {
              type: 'tool_result' as const,
              tool_use_id: call.id,
              content: 'No result',
            };
          }

          // If there's an error, include it in the result
          if (result.error) {
            return {
              type: 'tool_result' as const,
              tool_use_id: call.id,
              content: `Error: ${result.error.message}`,
            };
          }

          // Use llmContent for the API
          return {
            type: 'tool_result' as const,
            tool_use_id: call.id,
            content: result.llmContent,
          };
        });

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

  /**
   * Remove the last assistant message if it exists
   * Used when aborting a response
   */
  removeLastAssistantMessage(): void {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      this.messages.pop();
    }
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