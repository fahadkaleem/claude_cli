import { toolRegistry } from './ToolRegistry.js';
import type { ToolResult, ToolContext, ToolCall, ToolStatus } from './types.js';

export class ToolExecutor {
  async execute(
    toolName: string,
    params: any,
    context?: ToolContext
  ): Promise<ToolResult> {
    const tool = toolRegistry.get(toolName);

    if (!tool) {
      return {
        success: false,
        output: null,
        error: `Tool "${toolName}" not found`,
        display: {
          type: 'error',
          content: `Unknown tool: ${toolName}`,
        },
      };
    }

    return tool.execute(params, context);
  }

  async executeBatch(
    calls: Array<{ name: string; input: any }>,
    context?: ToolContext
  ): Promise<ToolResult[]> {
    const results = await Promise.all(
      calls.map(call => this.execute(call.name, call.input, context))
    );
    return results;
  }
}

export const toolExecutor = new ToolExecutor();