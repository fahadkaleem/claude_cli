import { toolRegistry } from './ToolRegistry.js';
import { ToolErrorType, type ToolResult, type ToolContext, type ToolCall, type ToolStatus, type PermissionRequestData } from './types.js';
import { revokeWritePermission } from '../utils/permissions.js';

export class ToolExecutor {
  onPermissionRequired?: (toolId: string, data: PermissionRequestData) => Promise<boolean>;

  private formatRejectionMessage(toolName: string, data: PermissionRequestData): string {
    if (data.file_path) {
      const fileName = data.file_path.split('/').pop() || data.file_path;
      return `User rejected ${data.action} to ${fileName}`;
    }
    return `User rejected ${toolName} execution`;
  }

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

    if (tool.needsPermission && tool.needsPermission(params as Record<string, unknown>)) {
      if (!this.onPermissionRequired || !tool.getPermissionRequest) {
        return {
          llmContent: 'Permission required but permission system not available',
          returnDisplay: 'Permission required but permission system not available',
          error: {
            message: 'Permission denied',
            type: ToolErrorType.PERMISSION_DENIED
          },
        };
      }

      const permissionData = tool.getPermissionRequest(params as Record<string, unknown>);
      const executionId = `${toolName}_${Date.now()}`;
      const approved = await this.onPermissionRequired(executionId, permissionData);

      if (!approved) {
        const rejectionMessage = this.formatRejectionMessage(toolName, permissionData);
        const rejectionDisplay = tool.getRejectionDisplay
          ? tool.getRejectionDisplay(params as Record<string, unknown>)
          : rejectionMessage;

        return {
          llmContent: rejectionMessage,
          returnDisplay: rejectionDisplay,
        };
      }
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