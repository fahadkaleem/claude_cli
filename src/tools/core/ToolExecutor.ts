import { toolRegistry } from './ToolRegistry.js';
import { ToolErrorType, type ToolResult, type ToolContext, type ToolCall, type ToolStatus } from './types.js';

export class ToolExecutor {
  async execute(
    toolName: string,
    params: unknown,
    context?: ToolContext
  ): Promise<ToolResult> {
    const tool = toolRegistry.get(toolName);

    if (!tool) {
      return {
        llmContent: `Tool "${toolName}" not found`,
        returnDisplay: `Unknown tool: ${toolName}`,
        error: {
          message: `Tool "${toolName}" not found`,
          type: ToolErrorType.TOOL_NOT_FOUND
        },
      };
    }

    return tool.execute(params as Record<string, unknown>, context);
  }

  async executeBatch(
    calls: Array<{ name: string; input: unknown }>,
    context?: ToolContext
  ): Promise<ToolResult[]> {
    const results = await Promise.all(
      calls.map(call => this.execute(call.name, call.input, context))
    );
    return results;
  }
}

export const toolExecutor = new ToolExecutor();