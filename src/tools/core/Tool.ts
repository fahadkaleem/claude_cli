import { ToolErrorType, ToolKind, type ToolSchema, type ToolResult, type ToolContext } from './types.js';

export abstract class Tool<TParams extends Record<string, unknown> = Record<string, unknown>> {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly kind: ToolKind;
  abstract readonly inputSchema: ToolSchema['input_schema'];

  get schema(): ToolSchema {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.inputSchema,
    };
  }

  // Format parameters for display (e.g., "Dubai" instead of {city: "Dubai"})
  formatParams(params: TParams): string {
    // Default implementation - subclasses can override
    const values = Object.values(params);
    return values.length === 1 ? String(values[0]) : JSON.stringify(params);
  }

  // Summarize result in one line for display
  summarizeResult(result: ToolResult): string {
    if (!result.success) {
      return `Error: ${result.error || 'Failed'}`;
    }
    // Subclasses should override for better summaries
    if (result.display?.type === 'markdown' || result.display?.type === 'text') {
      const lines = result.display.content.split('\n');
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
        success: false,
        output: null,
        error: {
          message: validationError,
          type: ToolErrorType.INVALID_PARAMS
        },
        display: {
          type: 'error',
          content: validationError,
        },
      };
    }

    try {
      // Execute the tool
      const result = await this.run(params, context);
      return result;
    } catch (error) {
      return {
        success: false,
        output: null,
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: ToolErrorType.EXECUTION_FAILED
        },
        display: {
          type: 'error',
          content: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }
  }

  protected abstract run(params: TParams, context?: ToolContext): Promise<ToolResult>;
}