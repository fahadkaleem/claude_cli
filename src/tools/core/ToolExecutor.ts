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
        success: false,
        output: null,
        error: {
          message: `Tool "${toolName}" not found`,
          type: ToolErrorType.TOOL_NOT_FOUND
        },
        display: {
          type: 'error',
          content: `Unknown tool: ${toolName}`,
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