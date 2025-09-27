import { ToolErrorType, ToolKind, type ToolSchema, type ToolResult, type ToolContext, type PermissionRequestData, type ToolResultDisplay } from './types.js';
import type { ToolCallConfirmationDetails } from '../../core/permissions/types.js';
import type { MessageBus } from '../../core/permissions/MessageBus.js';

export abstract class Tool<TParams extends Record<string, unknown> = Record<string, unknown>> {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly kind: ToolKind;
  abstract readonly inputSchema: ToolSchema['input_schema'];

  protected messageBus?: MessageBus;

  constructor() {
    // Empty constructor for subclasses
  }

  get schema(): ToolSchema {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.inputSchema,
    };
  }

  // Check if this tool execution needs permission
  needsPermission?(params: TParams): boolean;

  // Get permission request data for UI
  getPermissionRequest?(params: TParams): PermissionRequestData;

  // Get rejection display for UI (diff view, etc.)
  getRejectionDisplay?(params: TParams): ToolResultDisplay;

  // Check if tool should prompt for confirmation before execution
  async shouldConfirmExecute(
    params: TParams,
    abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    // Default: no confirmation needed
    // Subclasses override this to implement permission checks
    return false;
  }

  // Format parameters for display (e.g., "Dubai" instead of {city: "Dubai"})
  formatParams(params: TParams): string {
    // Default implementation - subclasses can override
    const values = Object.values(params);
    return values.length === 1 ? String(values[0]) : JSON.stringify(params);
  }

  summarizeResult(result: ToolResult): string {
    if (result.error) {
      return `Error: ${result.error.message || 'Failed'}`;
    }
    if (typeof result.returnDisplay === 'string') {
      const lines = result.returnDisplay.split('\n');
      return lines[0] || 'Completed';
    }
    return 'Completed';
  }

  validate(params: TParams): string | null {
    // Basic validation - can be overridden by subclasses
    if (!params || typeof params !== 'object') {
      return 'Invalid parameters: expected an object';
    }

    // Check required fields
    if (this.inputSchema.required) {
      for (const field of this.inputSchema.required) {
        if (!(field in params)) {
          return `Missing required field: ${field}`;
        }
      }
    }

    return null;
  }

  async execute(params: TParams, context?: ToolContext): Promise<ToolResult> {
    // Validate parameters
    const validationError = this.validate(params);
    if (validationError) {
      return {
        llmContent: validationError,
        returnDisplay: validationError,
        error: {
          message: validationError,
          type: ToolErrorType.INVALID_PARAMS
        },
      };
    }

    try {
      // Execute the tool
      const result = await this.run(params, context);
      return result;
    } catch (error) {
      return {
        llmContent: error instanceof Error ? error.message : String(error),
        returnDisplay: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: ToolErrorType.EXECUTION_FAILED
        },
      };
    }
  }

  protected abstract run(params: TParams, context?: ToolContext): Promise<ToolResult>;
}