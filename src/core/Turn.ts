import { AnthropicChat } from './AnthropicChat.js';
import {
  StreamEvent,
  EventType,
  ContentBlock,
  ToolSchema,
  extractText,
  extractToolUseBlocks,
  StopReason,
  ToolUseBlock
} from './types.js';

export class Turn {
  /** Tool calls from the last response */
  public pendingToolCalls: ToolUseBlock[] = [];

  /** Stop reason from the last response */
  public stopReason: StopReason = null;

  constructor(
    private chat: AnthropicChat,
    public readonly promptId: string
  ) {}

  /**
   * Run one turn: send message → get response → emit events
   *
   * Does NOT execute tools - that happens elsewhere!
   * This just processes ONE API response.
   */
  async *run(
    model: string,
    message: string | ContentBlock[],
    tools: ToolSchema[],
    maxTokens: number,
    signal: AbortSignal
  ): AsyncGenerator<StreamEvent> {
    try {
      // Check if aborted before starting
      if (signal.aborted) {
        return;
      }

      // Make API call
      const response = await this.chat.sendMessage(model, message, tools, maxTokens);

      // Store stop reason and pending tool calls
      this.stopReason = response.stop_reason;
      this.pendingToolCalls = extractToolUseBlocks(response.content);

      // Extract and yield text content
      const text = extractText(response.content);
      if (text) {
        yield {
          type: EventType.Content,
          content: text
        };
      }

      // Don't yield anything for tool calls - AnthropicClient handles that

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
}